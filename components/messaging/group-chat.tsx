"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Users, MessageCircle, Image as ImageIcon, X, Phone, PhoneOff, PhoneCall } from "lucide-react"
import { startVoiceCall, joinVoiceCall, endVoiceCall, getActiveCall } from "@/server/voice-call-actions"

type Message = {
  id: string
  grade: number
  sender_id: string
  body: string
  created_at: string
  sender: { id: string; name: string | null; avatar_url: string | null }
}

export default function GroupChat({ grade: initialGrade, isTeacher = false, initialGrades = [] }: { grade?: number; isTeacher?: boolean; initialGrades?: number[] }) {
  const [grade, setGrade] = useState<number | null>(initialGrade ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [grades, setGrades] = useState<number[]>(initialGrades || [])
  const [showGradeSelect, setShowGradeSelect] = useState(false)
  const selectRef = useRef<HTMLSelectElement | null>(null)
  const [showDebugUI, setShowDebugUI] = useState(false)
  const [lastFetch, setLastFetch] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [loadingCall, setLoadingCall] = useState(false)

  useEffect(() => {
    // If the page provided initial grades (server-side), use them. Otherwise fall back to calling the server action.
    if (isTeacher && (!initialGrades || initialGrades.length === 0)) {
      getMyGradesForTeacher().then((g) => {
        const gs = g || []
        setGrades(gs)
        if (!grade && gs.length > 0) setGrade(gs[0])
      }).catch((err) => {
        console.error('Failed to load teacher grades', err)
      })
    } else if (isTeacher && initialGrades && initialGrades.length > 0) {
      // set initial grade if none selected
      if (!grade && initialGrades.length > 0) setGrade(initialGrades[0])
    }
  }, [isTeacher])

  useEffect(() => {
    if (showGradeSelect) selectRef.current?.focus()
  }, [showGradeSelect])

  useEffect(() => {
    // enable debug UI when ?dbg=1 present in URL (client-only)
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('dbg') === '1') setShowDebugUI(true)
    } catch (e) {
      // ignore server-side
    }
  }, [])

  useEffect(() => {
    let mounted = true
    if (!grade) return
    const load = async () => {
      try {
        const res = await fetch(`/api/group-chat/messages?grade=${grade}`, { cache: 'no-store' })
        const data = await res.json()
        setLastFetch({ url: `/api/group-chat/messages?grade=${grade}`, status: res.status, body: data })
        if (data?.ok && mounted) setMessages(data.messages || [])
        // scroll to bottom
        setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)
      } catch (e) {
        console.error(e)
      }
    }
    load()
    const iv = setInterval(load, 4000)
    return () => {
      mounted = false
      clearInterval(iv)
    }
  }, [grade])

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'يرجى اختيار صورة فقط', variant: 'destructive' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت', variant: 'destructive' })
      return
    }
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // Load active call for current grade
  useEffect(() => {
    if (!grade) return

    const loadActiveCall = async () => {
      const result = await getActiveCall(grade)
      if (result.success && result.call) {
        setActiveCall(result.call)
      } else {
        setActiveCall(null)
      }
    }

    loadActiveCall()
    // Poll every 10 seconds
    const interval = setInterval(loadActiveCall, 10000)
    return () => clearInterval(interval)
  }, [grade])

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const [callProvider, setCallProvider] = useState<'jitsi' | 'livekit'>('jitsi')

  const handleStartCall = async () => {
    if (!grade) return
    setLoadingCall(true)

    // Choose provider via simple prompt or default to state (adding UI for choice below)
    const result = await startVoiceCall(grade, callProvider)
    if (result.success && result.call) {
      setActiveCall(result.call)
      // Open call in new window
      window.open(result.call.room_url, '_blank', 'width=1200,height=800')
      toast({ title: 'تم بدء المكالمة!' })
    } else {
      toast({ title: result.error || 'فشل بدء المكالمة', variant: 'destructive' })
    }
    setLoadingCall(false)
  }

  const handleJoinCall = async () => {
    if (!activeCall) return
    setLoadingCall(true)

    const result = await joinVoiceCall(activeCall.id)
    if (result.success && result.call) {
      // Open call in new window
      window.open(result.call.room_url, '_blank', 'width=1200,height=800')
      toast({ title: 'تم الانضمام للمكالمة!' })
    } else {
      toast({ title: result.error || 'فشل الانضمام', variant: 'destructive' })
    }
    setLoadingCall(false)
  }

  const handleEndCall = async () => {
    if (!activeCall || !confirm('هل تريد إنهاء المكالمة للجميع؟')) return
    setLoadingCall(true)

    const result = await endVoiceCall(activeCall.id)
    if (result.success) {
      setActiveCall(null)
      toast({ title: 'تم إنهاء المكالمة' })
    } else {
      toast({ title: result.error || 'فشل إنهاء المكالمة', variant: 'destructive' })
    }
    setLoadingCall(false)
  }

  const handleSend = async () => {
    if (!grade || (!body.trim() && !selectedImage)) return
    setIsSending(true)
    try {
      let messageBody = body

      // If there's an image, upload it first
      if (selectedImage) {
        const formData = new FormData()
        formData.append('file', selectedImage)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        const uploadData = await uploadRes.json()

        if (!uploadData.ok) {
          throw new Error('فشل رفع الصورة')
        }

        // Add image to message body
        messageBody = `${body}\n[صورة: ${uploadData.url}]`.trim()
        clearImage()
      }

      const r = await fetch('/api/group-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, body: messageBody }),
      })
      const data = await r.json()
      setLastFetch({ url: '/api/group-chat/messages (POST)', status: r.status, body: data })
      if (data?.ok) {
        setBody("")
        // reload messages
        const res2 = await fetch(`/api/group-chat/messages?grade=${grade}`, { cache: 'no-store' })
        const d2 = await res2.json()
        setLastFetch({ url: `/api/group-chat/messages?grade=${grade}`, status: res2.status, body: d2 })
        if (d2?.ok) setMessages(d2.messages || [])
        setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)
      } else {
        toast({ title: 'Failed to send message', variant: 'destructive' })
      }
    } catch (e) {
      console.error(e)
      toast({ title: 'Error sending message', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 p-4 bg-slate-900/50 rounded-xl border border-emerald-400/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Community Chat</h2>
              {grade && (
                <p className="text-sm text-slate-400">الصف {grade === 1 ? 'الأول' : grade === 2 ? 'الثاني' : 'الثالث'} الثانوي</p>
              )}
            </div>
          </div>
          {isTeacher && (
            <div>
              {grades.length === 0 ? (
                <div className="text-sm text-slate-400">لا توجد صفوف</div>
              ) : (
                <select
                  value={grade ?? ''}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">اختر الصف...</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>الصف {g}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Voice Call Banner */}
        {grade && (
          <div className="mb-6">
            {activeCall ? (
              <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-full animate-pulse">
                      <PhoneCall className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">مكالمة جماعية نشطة</div>
                      <div className="text-sm text-slate-300">
                        بدأها {activeCall.creator_name} • {activeCall.participant_count || 0} مشارك
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleJoinCall}
                      disabled={loadingCall}
                      className="bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      انضم
                    </Button>
                    <Button
                      onClick={handleEndCall}
                      disabled={loadingCall}
                      variant="destructive"
                      size="sm"
                    >
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex bg-slate-800 p-1 rounded-lg self-center mb-2">
                  <button
                    onClick={() => setCallProvider('jitsi')}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${callProvider === 'jitsi' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Jitsi (Free)
                  </button>
                  <button
                    onClick={() => setCallProvider('livekit')}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${callProvider === 'livekit' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    LiveKit (HQ)
                  </button>
                </div>
                <Button
                  onClick={handleStartCall}
                  disabled={loadingCall}
                  variant="outline"
                  className="w-full border-emerald-400/30 hover:bg-emerald-500/10"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  بدء مكالمة جماعية
                </Button>
              </div>
            )}
          </div>
        )}

        {!grade ? (
          isTeacher ? (
            <div className="rounded-xl border border-slate-700 p-8 bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-400" />
                  <span className="text-white text-lg">اختر الصف للمحادثة</span>
                </div>
                <div className="flex items-center gap-3">
                  {[1, 2, 3].map((n) => {
                    const enabled = grades.includes(n)
                    return (
                      <button
                        key={n}
                        onClick={() => { if (enabled) setGrade(n) }}
                        disabled={!enabled}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${enabled
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-400/30'
                          : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700'
                          }`}
                        title={enabled ? `افتح محادثة الصف ${n}` : `لا يوجد طلاب في الصف ${n}`}
                      >
                        الصف {n}
                      </button>
                    )
                  })}

                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700 p-8 bg-slate-900/50 backdrop-blur-sm text-center">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">اختر الصف للمحادثة</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="h-[500px] overflow-y-auto rounded-xl bg-slate-900/30 backdrop-blur-sm border border-slate-700 p-4 space-y-4 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageCircle className="h-16 w-16 mb-3 opacity-20" />
                  <p className="text-lg">لا توجد رسائل بعد</p>
                  <p className="text-sm">كن أول من يبدأ المحادثة!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isCurrentUser = false // TODO: implement current user check
                  return (
                    <div key={m.id} className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {m.sender?.avatar_url ? (
                          <img
                            src={m.sender.avatar_url}
                            alt={m.sender.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400/30"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                            {(m.sender?.name || 'U')[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col max-w-[70%]`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">
                            {m.sender?.name ?? m.sender?.id}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(m.created_at).toLocaleTimeString('ar-EG', {
                              timeZone: 'Africa/Cairo',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className={`rounded-2xl px-4 py-3 ${isCurrentUser
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
                          : 'bg-slate-800/80 text-white border border-slate-700'
                          }`}>
                          {/* Check if message contains image */}
                          {m.body.includes('[صورة:') ? (
                            <div className="space-y-2">
                              {m.body.split('\n').map((line: string, idx: number) => {
                                const imageMatch = line.match(/\[صورة:\s*(.+?)\]/)
                                if (imageMatch) {
                                  return (
                                    <img
                                      key={idx}
                                      src={imageMatch[1]}
                                      alt="صورة"
                                      className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(imageMatch[1], '_blank')}
                                    />
                                  )
                                }
                                return line ? <p key={idx} className="text-sm leading-relaxed">{line}</p> : null
                              })}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input Area */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-32 rounded-lg border-2 border-emerald-400/30"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}

              <div className="flex gap-3 items-end">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageSelect(file)
                  }}
                  className="hidden"
                />

                {/* Image Button */}
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="icon"
                  className="border-slate-700 hover:bg-slate-800 h-auto py-3"
                  disabled={isSending}
                >
                  <ImageIcon className="h-5 w-5 text-slate-400" />
                </Button>

                <Textarea
                  value={body}
                  onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (!isSending && (body.trim() || selectedImage)) handleSend()
                    }
                  }}
                  placeholder="اكتب رسالتك هنا..."
                  rows={3}
                  className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
                <Button
                  onClick={handleSend}
                  disabled={isSending || (!body.trim() && !selectedImage)}
                  className="bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 h-auto py-3"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                اضغط Enter للإرسال، Shift+Enter لسطر جديد
                {!isTeacher && ' • يمكنك إرفاق صورة'}
              </p>
            </div>
          </div>
        )}

        {showDebugUI && (
          <div className="mt-4 p-3 border rounded bg-gray-50 text-xs dark:bg-neutral-900">
            <div className="font-medium mb-1">Debug</div>
            <div>Grades: {JSON.stringify(grades)}</div>
            <div>Selected grade: {String(grade)}</div>
            <div>Messages count: {messages.length}</div>
            <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(lastFetch, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
