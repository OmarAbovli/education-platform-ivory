"use client"

import {
    ControlBar,
    GridLayout,
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    useTracks,
    useParticipants,
    useRoomContext,
    Chat,
    FocusLayout,
    CarouselLayout,
    ConnectionQualityIndicator,
} from "@livekit/components-react"
import "@livekit/components-styles"
import { Track, RoomEvent, DataPacket_Kind } from "livekit-client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { muteParticipant, removeParticipant, endRoom, getCallReport, saveCallStats, muteAllParticipants } from "@/server/livekit-actions"
import fixWebmDuration from "fix-webm-duration"

export function VideoRoom({ userId, userName }: { userId?: string, userName?: string }) {
    const router = useRouter()
    const params = useSearchParams()
    const roomName = params.get("room")
    const role = params.get("role") // 'host' or undefined (guest)

    // State for token
    const [token, setToken] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        (async () => {
            try {
                // Use provided name or fallback
                const pName = userName || (role ? "Teacher" : "Student-" + Math.floor(Math.random() * 1000));

                const resp = await fetch(
                    `/api/livekit/token?room=${roomName || 'default-room'}&participantName=${pName}&role=${role || 'guest'}`
                );
                const data = await resp.json();
                if (!resp.ok || data.error) {
                    throw new Error(data.error || "Failed to fetch token");
                }
                setToken(data.token);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Unknown error occurred");
            }
        })();
    }, [roomName, role, userName]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white gap-4">
                <h2 className="text-xl font-bold text-red-500">Connection Failed</h2>
                <p className="text-slate-400">{error}</p>
            </div>
        )
    }

    if (token === "") {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
                <div className="animate-pulse">Loading LiveKit Room...</div>
            </div>
        )
    }

    return (
        <LiveKitRoom
            video={role === 'host'}
            audio={role === 'host'} // Students join muted by default
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: "100vh", backgroundColor: "#0a0a0a" }}
            onDisconnected={() => window.close()}
        >
            <VideoConferenceWithTools
                role={role}
                roomName={roomName || ""}
                userId={userId || ""}
            />
            <RoomAudioRenderer />
        </LiveKitRoom>
    )
}

function VideoConferenceWithTools({ role, roomName, userId }: { role: string | null, roomName: string, userId: string }) {
    const [showWhiteboard, setShowWhiteboard] = useState(false)
    const [reportData, setReportData] = useState<any>(null)
    const [isEnding, setIsEnding] = useState(false)

    // UI State
    const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'participants' | 'controls'>('chat')
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMutingAll, setIsMutingAll] = useState(false)


    // Tracks
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    )

    // Identify if there is a screen share to toggle Focus Mode
    const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);

    const room = useRoomContext()

    async function handleEndMeeting() {
        if (isRecording) {
            if (!confirm("Recording is still active! Ending the meeting will stop and save the recording. Continue?")) return;
            handleStopRecording();
            // Wait a moment for recording to save
            await new Promise(r => setTimeout(r, 1500));
        } else {
            if (!confirm("End meeting for everyone?")) return;
        }

        setIsEnding(true);
        await endRoom(roomName);
        const res = await getCallReport(roomName);
        if (res.success) setReportData(res.data);
        setIsEnding(false);
    }

    // -- Recording Logic --
    const [isRecording, setIsRecording] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Warn on tab close if recording
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isRecording) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRecording]);

    const { toast } = useToast()

    // Browser Notifications Permission
    useEffect(() => {
        if (role === 'host' && "Notification" in window) {
            Notification.requestPermission();
        }
    }, [role]);

    // -- Hand Raising Logic --
    const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set())
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    // -- Pop-up Quiz Logic --
    const [activeQuiz, setActiveQuiz] = useState<{ id: string, question: string, options: string[] } | null>(null)
    const [quizResults, setQuizResults] = useState<Record<number, number>>({})
    const [hasVoted, setHasVoted] = useState(false)

    // -- Stats Tracking Logic --
    const statsRef = useRef({ speakingSeconds: 0, micOpenSeconds: 0, handRaiseCount: 0 })
    const lastHandState = useRef(false)

    useEffect(() => {
        const isRaised = raisedHands.has(room.localParticipant.identity)
        if (isRaised && !lastHandState.current) {
            statsRef.current.handRaiseCount++
        }
        lastHandState.current = isRaised
    }, [raisedHands, room.localParticipant.identity])

    useEffect(() => {
        const interval = setInterval(() => {
            if (room.localParticipant.isSpeaking) {
                statsRef.current.speakingSeconds++
            }
            if (room.localParticipant.isMicrophoneEnabled) {
                statsRef.current.micOpenSeconds++
            }
        }, 1000)

        const syncInterval = setInterval(async () => {
            if (statsRef.current.speakingSeconds > 0 || statsRef.current.micOpenSeconds > 0 || statsRef.current.handRaiseCount > 0) {
                const toSend = { ...statsRef.current }
                statsRef.current = { speakingSeconds: 0, micOpenSeconds: 0, handRaiseCount: 0 }
                await saveCallStats(roomName, toSend)
            }
        }, 30000)

        return () => {
            clearInterval(interval)
            clearInterval(syncInterval)
        }
    }, [room.localParticipant, roomName])

    useEffect(() => {
        const onDataReceived = (payload: Uint8Array, participant: any) => {
            const str = decoder.decode(payload)
            try {
                const data = JSON.parse(str)
                if (data.type === 'RAISE_HAND') {
                    setRaisedHands(prev => {
                        const next = new Set(prev)
                        if (data.raised) next.add(participant.identity)
                        else next.delete(participant.identity)
                        return next
                    })
                }
                
                // Pop-up Quiz Events
                if (data.type === 'POLL') {
                    setActiveQuiz(data)
                    setHasVoted(false)
                    setQuizResults({})
                }
                if (data.type === 'POLL_ANSWER') {
                    setQuizResults(prev => ({
                        ...prev,
                        [data.optionIndex]: (prev[data.optionIndex] || 0) + 1
                    }))
                }
                if (data.type === 'END_POLL') {
                    setActiveQuiz(null)
                }
            } catch (e) {
                console.error("Failed to parse data message", e)
            }
        }
        room.on(RoomEvent.DataReceived, onDataReceived)
        return () => {
            room.off(RoomEvent.DataReceived, onDataReceived)
        }
    }, [room])

    function toggleHand() {
        const isRaised = !raisedHands.has(room.localParticipant.identity)
        const data = JSON.stringify({ type: 'RAISE_HAND', raised: isRaised })
        room.localParticipant.publishData(encoder.encode(data), { reliable: true })

        setRaisedHands(prev => {
            const next = new Set(prev)
            if (isRaised) next.add(room.localParticipant.identity)
            else next.delete(room.localParticipant.identity)
            return next
        })
    }

    // -- Global Notifications for Host --
    useEffect(() => {
        if (role !== 'host') return;

        const onDataReceived = (payload: Uint8Array, participant: any) => {
            const str = decoder.decode(payload)
            try {
                const data = JSON.parse(str)
                if (data.type === 'RAISE_HAND' && data.raised) {
                    // 1. Show Toast
                    toast({
                        title: "✋ رافع يد جديد",
                        description: `${participant.identity || 'طالب'} يطلب التحدث`,
                    })

                    // 2. Native Notification if tab is hidden
                    if (document.hidden && Notification.permission === "granted") {
                        new Notification("LiveKit: رفع يد", {
                            body: `${participant.identity} رفع يده الآن`,
                            icon: "/favicon.ico"
                        })
                    }

                    // 3. Flash Title
                    const originalTitle = document.title;
                    document.title = `✋ ${participant.identity} رفع يده!`;
                    setTimeout(() => { document.title = originalTitle; }, 5000);
                }
            } catch (e) { }
        }

        room.on(RoomEvent.DataReceived, onDataReceived)
        return () => { room.off(RoomEvent.DataReceived, onDataReceived) }
    }, [room, role, toast]);

    async function handleStartRecording() {
        try {
            // To capture both system audio and microphone:
            // 1. Get screen stream with system audio
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                } as any
            });

            // 2. Get microphone stream
            let finalStream = screenStream;
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                const audioContext = new AudioContext();
                const destination = audioContext.createMediaStreamDestination();

                // Add screen audio if present
                if (screenStream.getAudioTracks().length > 0) {
                    const screenSource = audioContext.createMediaStreamSource(screenStream);
                    screenSource.connect(destination);
                }

                // Add mic audio
                const micSource = audioContext.createMediaStreamSource(micStream);
                micSource.connect(destination);

                // Create a new stream with unified audio + screen video
                finalStream = new MediaStream([
                    ...screenStream.getVideoTracks(),
                    ...destination.stream.getAudioTracks()
                ]);
            } catch (micErr) {
                console.warn("Microphone access denied for recording, capturing system audio only", micErr);
            }

            const recorder = new MediaRecorder(finalStream, { mimeType: 'video/webm; codecs=vp9' });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                // We use recordingDuration (seconds) to inject metadata
                const durationMs = recordingDuration * 1000;
                
                fixWebmDuration(blob, durationMs, (fixedBlob) => {
                    const url = URL.createObjectURL(fixedBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `recording-${roomName}-${new Date().toISOString()}.webm`;
                    a.click();
                    URL.revokeObjectURL(url);
                });

                chunksRef.current = [];
                setIsRecording(false);
                if (timerRef.current) clearInterval(timerRef.current);

                // Stop all tracks to stop the "Sharing" indicator
                finalStream.getTracks().forEach(track => track.stop());
            };

            recorder.start(1000); // Collect 1s chunks
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Could not start recording. Please allow screen access.");
        }
    }

    function handleStopRecording() {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }

    // -- CSV Export --
    function downloadCSV() {
        if (!reportData) return;
        const headers = ["Name", "Status", "Joined At", "Speaking Time (s)"];
        const rows = [];
        for (const p of reportData.participants) {
            rows.push([
                `"${(p.name || '').replace(/"/g, '""')}"`,
                "Present",
                `"${new Date(p.joined_at).toLocaleString()}"`,
                p.speaking_duration_seconds || 0
            ].join(","));
        }
        for (const s of reportData.absentStudents) {
            rows.push([`"${(s.name || '').replace(/"/g, '""')}"`, "Absent", "-", "0"].join(","));
        }
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_report_${roomName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // -- Render Report --
    if (reportData) {
        return (
            <div className="flex flex-col h-full bg-slate-950 text-white p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-emerald-500">📊 Session Report</h1>
                        <div className="flex items-center gap-3">
                            <button onClick={downloadCSV} className="text-white hover:bg-emerald-600 bg-emerald-700 px-4 py-2 rounded font-medium flex items-center gap-2">📥 Download CSV</button>
                            <button onClick={() => window.close()} className="text-slate-400 hover:text-white bg-slate-800 px-4 py-2 rounded">✕ Close</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Attendance</h3>
                            <p className="text-5xl font-bold text-white">{reportData.participants.length}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Absent Students</h3>
                            <p className="text-5xl font-bold text-red-500">{reportData.absentStudents.length}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 font-bold">✅ Present Students</div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50">
                                <tr><th className="p-4 text-slate-400">Name</th><th className="p-4 text-slate-400">Joined</th><th className="p-4 text-slate-400">Speaking Time</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {reportData.participants.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-medium flex items-center gap-3">
                                            {p.avatar_url ? <img src={p.avatar_url} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">{p.name?.[0]}</div>}
                                            {p.name}
                                        </td>
                                        <td className="p-4 text-slate-400">{new Date(p.joined_at).toLocaleTimeString()}</td>
                                        <td className="p-4 font-mono text-emerald-400">{p.speaking_duration_seconds || 0}s</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full bg-black flex flex-col overflow-hidden text-neutral-200 font-sans">
            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* 1. Stage (Video/Whiteboard) */}
                <div className="flex-1 relative flex flex-col min-w-0 bg-neutral-950">
                    {showWhiteboard ? (
                        <div className="flex-1 bg-white relative">
                            {/* Use room-specific URL to avoid 'Room not found' */}
                            <iframe
                                src={`https://www.tldraw.com/r/el-helal-${roomName}`}
                                className="w-full h-full border-0"
                                title="Whiteboard"
                            />
                            <button
                                onClick={() => setShowWhiteboard(false)}
                                className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-700 z-50 pointer-events-auto text-sm font-bold"
                            >
                                Close Whiteboard
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 p-4 h-full overflow-hidden">
                            <div className="h-full w-full rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                                {screenShareTrack ? (
                                    <FocusLayout trackRef={screenShareTrack} />
                                ) : (
                                    <GridLayout tracks={tracks}>
                                        <ParticipantTile />
                                    </GridLayout>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quiz Overlay */}
                {activeQuiz && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 glass-panel p-6 rounded-2xl w-96 max-w-[90vw] shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-4 backdrop-blur-2xl bg-slate-900/80">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-emerald-400">{role === 'host' ? 'Live Poll (Admin)' : 'Pop-up Quiz!'}</h3>
                            {role === 'host' && (
                                <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-white text-xs bg-white/5 px-2 py-1 rounded">Hide</button>
                            )}
                        </div>
                        <h4 className="font-medium text-white mb-4 leading-relaxed">{activeQuiz.question}</h4>
                        {role === 'host' ? (
                            <div className="space-y-2">
                                {activeQuiz.options.map((opt, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 overflow-hidden relative">
                                        <div className="absolute bg-indigo-600/20 left-0 top-0 bottom-0 z-0 transition-all" style={{ width: `${quizResults[i] ? (quizResults[i] / Math.max(1, Object.values(quizResults).reduce((a:any,b:any) => a+b, 0) as number)) * 100 : 0}%` }}></div>
                                        <span className="relative z-10 text-sm font-medium">{opt}</span>
                                        <span className="relative z-10 font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">{quizResults[i] || 0}</span>
                                    </div>
                                ))}
                                <div className="text-xs text-center text-slate-400 mt-4">Live Results syncing...</div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {activeQuiz.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        disabled={hasVoted}
                                        onClick={() => {
                                            setHasVoted(true)
                                            const msg = { type: 'POLL_ANSWER', optionIndex: i, pollId: activeQuiz.id }
                                            room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
                                        }}
                                        className={`w-full p-3 rounded-xl text-left transition-all font-medium text-sm border shadow-sm ${hasVoted ? 'bg-white/5 opacity-50 border-white/5 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 hover:scale-102'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                                {hasVoted && <div className="text-xs text-center text-slate-400 mt-4">Answer submitted. Waiting for results...</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Floating Right Sidebar - Glass Morphism */}
                {isSidebarOpen && (
                    <div className="absolute top-4 right-4 bottom-20 w-80 glass-panel rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Tabs */}
                        <div className="flex p-1 bg-white/5 mx-2 mt-2 rounded-xl border border-white/5">
                            <button
                                onClick={() => setActiveSidebarTab('chat')}
                                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeSidebarTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            >Chat</button>
                            <button
                                onClick={() => setActiveSidebarTab('participants')}
                                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeSidebarTab === 'participants' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            >Participants</button>
                            {role === 'host' && (
                                <button
                                    onClick={() => setActiveSidebarTab('controls')}
                                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeSidebarTab === 'controls' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                >Controls</button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto bg-transparent custom-scrollbar">
                            {activeSidebarTab === 'chat' && (
                                <div className="h-full flex flex-col">
                                    {/* LiveKit Chat Component */}
                                    {/* We wrap it to style it or just use it directly if supported */}
                                    <Chat style={{ flex: 1, width: '100%' }} />
                                </div>
                            )}

                            {activeSidebarTab === 'participants' && (
                                <div className="p-2 space-y-2">
                                    <div className="text-xs font-bold text-zinc-500 uppercase px-2 py-2">In This Call</div>
                                    <ParticipantList role={role} roomName={roomName} raisedHands={raisedHands} />
                                </div>
                            )}

                            {activeSidebarTab === 'controls' && role === 'host' && (
                                <div className="p-4 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase">Interactive</h3>
                                        <button
                                            onClick={() => setShowWhiteboard(true)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium"
                                        >
                                            ✏️ Open Whiteboard
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (confirm("Mute all students' microphones?")) {
                                                    setIsMutingAll(true)
                                                    await muteAllParticipants(roomName, room.localParticipant.identity)
                                                    setIsMutingAll(false)
                                                }
                                            }}
                                            disabled={isMutingAll}
                                            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium"
                                        >
                                            {isMutingAll ? '⏳ Muting...' : '🔇 Mute All Students'}
                                        </button>
                                    </div>
                                    <hr className="border-neutral-700" />
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase">Engagement (Polls)</h3>
                                        <button
                                            onClick={() => {
                                                const q = prompt("Enter Poll Question:")
                                                if(!q) return;
                                                const optsRaw = prompt("Enter Comma-separated options (e.g. Yes,No,Maybe)")
                                                if(!optsRaw) return;
                                                const opts = optsRaw.split(',').map(s => s.trim())
                                                
                                                const msg = { type: 'POLL', id: Date.now().toString(), question: q, options: opts }
                                                room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
                                                setActiveQuiz(msg)
                                                setHasVoted(false)
                                                setQuizResults({})
                                            }}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium border border-blue-500"
                                        >
                                            📊 Quick Poll
                                        </button>
                                        {activeQuiz && (
                                            <button
                                                onClick={() => {
                                                    const msg = { type: 'END_POLL' }
                                                    room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
                                                    setActiveQuiz(null)
                                                }}
                                                className="w-full bg-zinc-800 hover:bg-red-500/20 text-white border border-zinc-700 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-xs"
                                            >
                                                Close Poll For Students
                                            </button>
                                        )}
                                    </div>
                                    <hr className="border-neutral-700" />
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase">Recording</h3>
                                        {!isRecording ? (
                                            <button
                                                onClick={handleStartRecording}
                                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium"
                                            >
                                                🔴 Start Recording
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleStopRecording}
                                                className="w-full bg-red-600 hover:bg-red-700 text-white border border-red-500 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium animate-pulse"
                                            >
                                                ⏹ Stop Recording ({recordingDuration}s)
                                            </button>
                                        )}
                                        <p className="text-[10px] text-zinc-500 text-center">
                                            Recording saves to your device automatically.
                                        </p>
                                        <p className="text-[10px] text-yellow-500/80 text-center font-medium px-2">
                                            ⚠️ تحذير الذاكرة: التسجيل يتم على متصفحك. لا تسجل حصة تتجاوز 90 دقيقة متصلة حتى لا يعالجك المتصفح.
                                        </p>
                                    </div>
                                    <hr className="border-neutral-700" />
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase">Session Management</h3>
                                        <button
                                            onClick={handleEndMeeting}
                                            className="w-full bg-red-600/10 text-red-500 border border-red-600/50 py-3 rounded-lg hover:bg-red-600 hover:text-white flex items-center justify-center gap-2 transition-all font-medium"
                                        >
                                            ⛔ End Meeting For All
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Floating Bottom Control Bar - Glass Morphism */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 glass-panel rounded-2xl shadow-2xl z-40 transition-all hover:scale-102 backdrop-blur-2xl">
                <ControlBar
                    variation="minimal"
                    controls={{ screenShare: true, chat: false, leave: true, camera: true, microphone: true }}
                />

                <button
                    onClick={toggleHand}
                    className={`px-3 py-2 rounded text-sm font-medium transition-all flex items-center gap-2 ${raisedHands.has(room.localParticipant.identity) ? 'bg-yellow-500 text-black' : 'bg-neutral-800 text-zinc-400 hover:bg-neutral-700'}`}
                >
                    {raisedHands.has(room.localParticipant.identity) ? '✋ Lower Hand' : '✋ Raise Hand'}
                </button>

                <button
                    onClick={async () => {
                        try {
                            const video = document.querySelector('video');
                            if (!video) { toast({title: "No video found"}); return; }
                            
                            // Check if picture-in-picture is supported
                            if (!document.pictureInPictureEnabled) {
                                toast({title: "PiP Not Supported", description: "Your browser does not support Picture-in-Picture."});
                                return;
                            }
                            
                            if (document.pictureInPictureElement) {
                                await document.exitPictureInPicture();
                            } else {
                                await video.requestPictureInPicture();
                            }
                        } catch(e) { console.error("PiP error", e) }
                    }}
                    className={`ml-2 px-3 py-2 rounded text-sm font-medium transition-all bg-neutral-800 text-cyan-400 hover:bg-neutral-700`}
                >
                    🔲 PiP
                </button>

                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`ml-4 px-3 py-2 rounded text-sm font-medium ${isSidebarOpen ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-zinc-400 hover:bg-neutral-700'}`}
                >
                    {isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                </button>
            </div>
        </div>
    )
}

function ParticipantList({ role, roomName, raisedHands }: { role: string | null, roomName: string, raisedHands: Set<string> }) {
    const participants = useParticipants()

    // Sort: Local first, then Speaking, then Raised Hand, then Alphabetical
    const sortedParticipants = [...participants].sort((a, b) => {
        // 1. Local (You) always first
        if (a.isLocal) return -1;
        if (b.isLocal) return 1;

        // 2. Speaking moving up
        if (a.isSpeaking && !b.isSpeaking) return -1;
        if (!a.isSpeaking && b.isSpeaking) return 1;

        // 3. Raised hands moving up (but below speakers)
        const aHand = raisedHands.has(a.identity);
        const bHand = raisedHands.has(b.identity);
        if (aHand && !bHand) return -1;
        if (!aHand && bHand) return 1;

        // 4. Alphabetical fallback
        return (a.identity || '').localeCompare(b.identity || '');
    })

    return (
        <div className="space-y-1">
            {sortedParticipants.map(p => (
                <div key={p.identity} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${p.isSpeaking ? 'bg-indigo-600 text-white speaker-pulse' : 'bg-neutral-700 text-neutral-300'}`}>
                                {p.name?.[0]?.toUpperCase() || p.identity?.[0]?.toUpperCase()}
                            </div>
                            {raisedHands.has(p.identity) && (
                                <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center border border-black animate-bounce">
                                    ✋
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-200 truncate max-w-[120px] font-medium">
                                    {p.identity}
                                </span>
                                <ConnectionQualityIndicator participant={p} className="w-4 h-4 opacity-70" />
                            </div>
                            {p.isLocal && <span className="text-[10px] text-zinc-500">You</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {p.isSpeaking && <span className="text-xs">🔊</span>}
                        {raisedHands.has(p.identity) && <span className="text-sm">✋</span>}

                        {!p.isLocal && role === 'host' && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        p.audioTrackPublications.forEach(async (t) => {
                                            if (t.trackSid) await muteParticipant(roomName, p.identity, t.trackSid, true)
                                        })
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 transition-colors"
                                    title="Mute"
                                >
                                    🔇
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm(`Kick ${p.identity}?`)) await removeParticipant(roomName, p.identity)
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-400 transition-colors"
                                    title="Kick"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
