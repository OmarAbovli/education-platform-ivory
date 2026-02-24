"use server"

import { AccessToken } from "livekit-server-sdk"
import { z } from "zod"
import { sql } from "@/server/db"
import { awardXP } from "./xp-actions"

export async function createLiveKitToken(roomName: string, identity: string, role: "host" | "guest", name?: string) {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) {
        throw new Error("LiveKit keys are missing in .env")
    }

    // Create token
    const at = new AccessToken(apiKey, apiSecret, {
        identity: identity,
        name: name,
        // Token validity (e.g. 2 hours)
        ttl: 2 * 60 * 60,
    })

    // Permission logic
    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true, // Allow everyone to publish (Mic/Camera)
        canSubscribe: true,
        canPublishData: true,
    })

    const token = await at.toJwt()

    return { token, url: wsUrl }
}

// --- Moderation Actions ---

// Mute a participant
export async function muteParticipant(roomName: string, identity: string, trackSid: string, muted: boolean) {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) throw new Error("Missing keys")

    // Use RoomServiceClient to manage room
    const { RoomServiceClient } = await import("livekit-server-sdk")
    const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret)

    await svc.mutePublishedTrack(roomName, identity, trackSid, muted)
    return { success: true }
}

// Remove a participant
export async function removeParticipant(roomName: string, identity: string) {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) throw new Error("Missing keys")

    const { RoomServiceClient } = await import("livekit-server-sdk")
    const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret)

    await svc.removeParticipant(roomName, identity)
    return { success: true }
}

// Mute all participants except the host
export async function muteAllParticipants(roomName: string, excludeIdentity?: string) {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) throw new Error("Missing keys")

    const { RoomServiceClient, TrackSource } = await import("livekit-server-sdk")
    const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret)

    // 1. Get all participants
    const participants = await svc.listParticipants(roomName)

    for (const p of participants) {
        // Skip the excluded identity (e.g., the Teacher who triggered this)
        if (excludeIdentity && p.identity === excludeIdentity) continue;

        // Find audio tracks
        const audioTracks = p.tracks.filter(t => t.source === TrackSource.MICROPHONE)

        for (const track of audioTracks) {
            await svc.mutePublishedTrack(roomName, p.identity, track.sid, true)
        }
    }

    return { success: true }
}

// End the room (kick everyone)
export async function endRoom(roomName: string) {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) throw new Error("Missing keys")

    const { RoomServiceClient } = await import("livekit-server-sdk")
    const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret)

    await svc.deleteRoom(roomName)

    // Update database status
    try {
        await sql`
            UPDATE voice_calls
            SET status = 'ended', ended_at = NOW()
            WHERE room_name = ${roomName} AND status = 'active';
        `
        // Also mark all participants as left
        await sql`
            UPDATE voice_call_participants
            SET left_at = NOW()
            WHERE left_at IS NULL AND call_id IN (SELECT id FROM voice_calls WHERE room_name = ${roomName});
        `
    } catch (e) {
        console.error("Failed to end session in DB", e)
    }

    return { success: true }
}

// --- Analytics & Reporting ---

export async function saveCallStats(roomName: string, userId: string, stats: { speakingSeconds: number, micOpenSeconds: number, handRaiseCount?: number }) {
    // In a real app, look up the call_id by room_name first
    // This assumes we can link room_name to the voice_calls table
    try {
        await sql`
            UPDATE voice_call_participants
            SET 
                speaking_duration_seconds = speaking_duration_seconds + ${stats.speakingSeconds},
                mic_open_duration_seconds = mic_open_duration_seconds + ${stats.micOpenSeconds},
                hand_raise_count = hand_raise_count + ${stats.handRaiseCount || 0}
            WHERE 
                user_id = ${userId} 
                AND call_id IN (SELECT id FROM voice_calls WHERE room_name = ${roomName} LIMIT 1)
        `

        // 🏆 Award XP for Live Participation
        // 5 XP per minute of speaking, 1 XP per minute of active presence (mic open)
        const speakingXP = Math.floor((stats.speakingSeconds / 60) * 5)
        const presenceXP = Math.floor((stats.micOpenSeconds / 60) * 1)
        const bonusXP = (stats.handRaiseCount || 0) * 2 // 2 XP per hand raise

        const totalLiveXP = speakingXP + presenceXP + bonusXP

        if (totalLiveXP > 0) {
            await awardXP({
                userId,
                amount: totalLiveXP,
                source: 'live',
                description: `Live Participation: ${roomName} (+${totalLiveXP} XP)`
            })
        }

        return { success: true }
    } catch (e) {
        console.error("Failed to save stats", e)
        return { success: false }
    }
}

export async function getCallReport(roomName: string) {
    try {
        // 1. Get Call Details & Participants
        const call = (await sql`
            SELECT id, grade, started_at, ended_at 
            FROM voice_calls 
            WHERE room_name = ${roomName} 
            LIMIT 1
        `)[0];

        if (!call) throw new Error("Call not found");

        const participants = await sql`
            SELECT 
                u.id, u.name, u.role,
                vcp.joined_at, vcp.left_at,
                vcp.speaking_duration_seconds,
                vcp.mic_open_duration_seconds,
                vcp.hand_raise_count
            FROM voice_call_participants vcp
            JOIN users u ON u.id = vcp.user_id
            WHERE vcp.call_id = ${call.id}
        `

        // 2. Get All Students in Grade (for Absent list)
        // Assuming students have a 'grade' column and role='student'
        const allStudents = await sql`
            SELECT id, name 
            FROM users 
            WHERE role = 'student' AND grade = ${call.grade}
        `

        // 3. Calculate Absent
        const presentIds = new Set(participants.map((p: any) => p.id));
        const absentStudents = allStudents.filter((s: any) => !presentIds.has(s.id));

        return {
            success: true,
            data: {
                call,
                participants,
                absentStudents
            }
        }

    } catch (e: any) {
        console.error("Get Report Error", e);
        return { success: false, error: e.message }
    }
}

export async function getTeacherCallHistory() {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) return { success: false, error: "Missing keys" }

    // Use RoomServiceClient to get active rooms if needed, but for history we rely on DB
    try {
        const { getCurrentUser } = await import("@/lib/auth")
        const { cookies } = await import("next/headers")

        const cookieStore = await cookies()
        const sessionId = cookieStore.get("session_id")?.value
        const user = await getCurrentUser(sessionId)

        if (!user || user.role !== 'teacher') return { success: false, error: "Unauthorized" }

        const calls = await sql`
            SELECT 
                vc.id, 
                vc.room_name, 
                vc.grade, 
                vc.started_at, 
                vc.ended_at,
                COUNT(vcp.id) as participant_count
            FROM voice_calls vc
            LEFT JOIN voice_call_participants vcp ON vcp.call_id = vc.id
            WHERE vc.started_by = ${user.id} 
              AND vc.status = 'ended'
            GROUP BY vc.id
            ORDER BY vc.started_at DESC
         `

        return { success: true, calls }
    } catch (e: any) {
        console.error("Failed to get history", e)
        return { success: false, error: e.message }
    }
}
