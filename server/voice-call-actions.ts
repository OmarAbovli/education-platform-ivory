"use server"

import { sql } from "@/server/db"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

function genId() {
  try {
    // @ts-ignore
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch { }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

async function requireUser() {
  const sessionId = (await cookies()).get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  return me
}

/**
 * Start a new voice call for a specific grade
 */
export async function startVoiceCall(grade: number, provider: 'jitsi' | 'livekit' = 'jitsi') {
  const me = await requireUser()
  if (!me) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Check if there's already an active call for this grade
    const existingCalls = await sql`
      SELECT id, room_url, provider FROM voice_calls
      WHERE grade = ${grade} AND status = 'active'
      LIMIT 1
    `

    if (existingCalls.length > 0) {
      const callProvider = existingCalls[0].provider || 'jitsi'

      if (callProvider === 'livekit') {
        // LiveKit logic for existing call
        // Extract room name from URL /livekit?room=...
        const roomName = existingCalls[0].room_url.split('room=')[1]?.split('&')[0] || `grade-${grade}`
        return {
          success: true,
          call: { ...existingCalls[0], room_url: `/livekit?room=${roomName}&role=host` },
          isExisting: true
        }
      }

      // Jitsi Logic (Existing)
      const userName = encodeURIComponent(me.name || 'مستخدم')
      const baseUrl = existingCalls[0].room_url.split('#')[0]
      const roomUrlWithName = `${baseUrl}#userInfo.displayName="${userName}"`
      return {
        success: true,
        call: { ...existingCalls[0], room_url: roomUrlWithName },
        isExisting: true
      }
    }

    // Create a new room
    const roomName = `grade-${grade}-${Date.now()}`
    let roomUrl = ''

    if (provider === 'jitsi') {
      // Jitsi config for Teacher (Moderator)
      // - Enable ALL features: Recording, Screen Share, Muting, Kicking, etc.
      // - Disable P2P for stability with large groups
      const jitsiConfig = [
        'config.prejoinPageEnabled=false',
        'config.enableClosePage=false',
        'config.enableLobbyChat=false',
        'config.p2p.enabled=false', // Use server bridge
        'config.fileRecordingsEnabled=true', // Enable recording
        'config.dropbox.enabled=true', // Enable Dropbox for recording storage
        // Ensure all buttons are visible
        'config.toolbarButtons=["microphone","camera","closedcaptions","desktop","embedmeeting","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]',
      ].join('&')

      roomUrl = `https://meet.jit.si/${roomName}#${jitsiConfig}`
    } else {
      // For LiveKit, we just store the room name. The URL will be the dashboard page + parameters
      roomUrl = `/livekit?room=${roomName}`
    }

    const result = await sql`
      INSERT INTO voice_calls (grade, started_by, room_name, room_url, status, provider)
      VALUES (${grade}, ${me.id}, ${roomName}, ${roomUrl}, 'active', ${provider})
      RETURNING id, room_url, room_name, provider
    `

    const call = result[0]

    // Auto-join the creator
    await sql`
      INSERT INTO voice_call_participants (call_id, user_id)
      VALUES (${call.id}, ${me.id})
    `

    if (provider === 'livekit') {
      return { success: true, call: { ...call, room_url: `/livekit?room=${call.room_name}&role=host` }, isExisting: false }
    } else {
      // Add user's name to the URL as MODERATOR (creator has full control)
      const userName = encodeURIComponent(me.name || 'مستخدم')
      const baseUrl = call.room_url.split('#')[0]
      const configHash = call.room_url.split('#')[1] || ''
      const roomUrlWithName = `${baseUrl}#${configHash}&userInfo.displayName="${userName}"&userInfo.role=moderator`

      revalidatePath('/community-chat')
      revalidatePath('/student/live')

      return { success: true, call: { ...call, room_url: roomUrlWithName }, isExisting: false }
    }
  } catch (error: any) {
    console.error('Error starting voice call:', error)
    return { success: false, error: error.message || 'Failed to start call' }
  }
}

/**
 * Join an existing voice call
 */
export async function joinVoiceCall(callId: string) {
  const me = await requireUser()
  if (!me) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Check if call exists and is active
    const calls = await sql`
      SELECT id, room_url, room_name, provider FROM voice_calls
      WHERE id = ${callId} AND status = 'active'
    `

    if (calls.length === 0) {
      return { success: false, error: 'Call not found or ended' }
    }

    const call = calls[0]
    const callProvider = call.provider || 'jitsi'

    // Add participant (ignore if already joined)
    try {
      await sql`
        INSERT INTO voice_call_participants (call_id, user_id)
        VALUES (${callId}, ${me.id})
        ON CONFLICT (call_id, user_id) DO NOTHING
      `
    } catch (e) {
      // Ignore duplicate entry
    }

    if (callProvider === 'livekit') {
      // Return internal URL for LiveKit
      return { success: true, call: { ...call, room_url: `/livekit?room=${call.room_name}` } }
    }

    // Jitsi Logic
    // Add user's name to the URL as PARTICIPANT (no moderator powers)
    // Customize toolbar for students: Audio, Chat, Hand, Hangup, View options only. No Camera, No Screen Share.
    // Disable P2P for better performance with > 50 users.
    const userName = encodeURIComponent(me.name || 'مستخدم')
    const baseUrl = call.room_url.split('#')[0]
    const studentConfig = [
      'config.prejoinPageEnabled=false',
      'config.enableClosePage=false',
      'config.disableRemoteMute=true',
      'config.remoteVideoMenu.disabled=true',
      'config.disableInviteFunctions=true',
      'config.disableProfile=true',
      'config.p2p.enabled=false', // Use server bridge for large groups
      'config.startWithVideoMuted=true', // Start without video to save bandwidth
      // Restrict toolbar to only allowed actions
      'config.toolbarButtons=["microphone","chat","raisehand","tileview","fullscreen","hangup"]',
      'config.settingsSections=["audio"]', // Only allow audio settings
    ].join('&')

    const roomUrlWithName = `${baseUrl}#${studentConfig}&userInfo.displayName="${userName}"`

    return { success: true, call: { ...call, room_url: roomUrlWithName } }
  } catch (error: any) {
    console.error('Error joining voice call:', error)
    return { success: false, error: error.message || 'Failed to join call' }
  }
}

/**
 * Leave a voice call
 */
export async function leaveVoiceCall(callId: string) {
  const me = await requireUser()
  if (!me) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    await sql`
      UPDATE voice_call_participants
      SET left_at = NOW()
      WHERE call_id = ${callId} AND user_id = ${me.id} AND left_at IS NULL
    `

    return { success: true }
  } catch (error: any) {
    console.error('Error leaving voice call:', error)
    return { success: false, error: error.message || 'Failed to leave call' }
  }
}

/**
 * End a voice call (creator only)
 */
export async function endVoiceCall(callId: string) {
  const me = await requireUser()
  if (!me) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Only the creator can end the call
    const result = await sql`
      UPDATE voice_calls
      SET status = 'ended', ended_at = NOW()
      WHERE id = ${callId} AND started_by = ${me.id} AND status = 'active'
      RETURNING id
    `

    if (result.length === 0) {
      return { success: false, error: 'Call not found or you are not the creator' }
    }

    // Mark all participants as left
    await sql`
      UPDATE voice_call_participants
      SET left_at = NOW()
      WHERE call_id = ${callId} AND left_at IS NULL
    `

    revalidatePath('/community-chat')
    revalidatePath('/student')

    return { success: true }
  } catch (error: any) {
    console.error('Error ending voice call:', error)
    return { success: false, error: error.message || 'Failed to end call' }
  }
}

/**
 * Get active call for a grade
 */
export async function getActiveCall(grade: number) {
  try {
    const calls = await sql`
      SELECT 
        vc.id,
        vc.grade,
        vc.room_name,
        vc.room_url,
        vc.started_by,
        vc.started_at,
        u.name as creator_name,
        COUNT(vcp.id) FILTER (WHERE vcp.left_at IS NULL) as participant_count
      FROM voice_calls vc
      JOIN users u ON u.id = vc.started_by
      LEFT JOIN voice_call_participants vcp ON vcp.call_id = vc.id
      WHERE vc.grade = ${grade} AND vc.status = 'active'
      GROUP BY vc.id, u.name
      LIMIT 1
    `

    if (calls.length === 0) {
      return { success: true, call: null }
    }

    return { success: true, call: calls[0] }
  } catch (error: any) {
    console.error('Error getting active call:', error)
    return { success: false, error: error.message || 'Failed to get call' }
  }
}

/**
 * Get participants in a call
 */
export async function getCallParticipants(callId: string) {
  try {
    const participants = await sql`
      SELECT 
        u.id,
        u.name,
        u.avatar_url,
        vcp.joined_at,
        vcp.left_at
      FROM voice_call_participants vcp
      JOIN users u ON u.id = vcp.user_id
      WHERE vcp.call_id = ${callId}
      ORDER BY vcp.joined_at DESC
    `

    return { success: true, participants }
  } catch (error: any) {
    console.error('Error getting participants:', error)
    return { success: false, error: error.message || 'Failed to get participants' }
  }
}

/**
 * Get active teacher call for student's grade
 */
export async function getActiveTeacherCallForStudent() {
  const me = await requireUser()
  if (!me || me.role !== 'student') {
    return { success: false, error: 'Only students can view this' }
  }

  try {
    // Get student's grade
    const grade = me.grade

    if (!grade) {
      return { success: true, call: null }
    }

    // Get active call started by a teacher for this grade
    const calls = await sql`
      SELECT 
        vc.id,
        vc.grade,
        vc.room_name,
        vc.room_url,
        vc.provider,
        vc.started_by,
        vc.started_at,
        u.name as creator_name,
        u.role as creator_role,
        COUNT(vcp.id) FILTER (WHERE vcp.left_at IS NULL) as participant_count
      FROM voice_calls vc
      JOIN users u ON u.id = vc.started_by
      LEFT JOIN voice_call_participants vcp ON vcp.call_id = vc.id
      WHERE vc.grade = ${grade} AND vc.status = 'active' AND u.role = 'teacher'
      GROUP BY vc.id, u.name, u.role
      LIMIT 1
    `

    if (calls.length === 0) {
      return { success: true, call: null }
    }

    const call = calls[0]
    const callProvider = call.provider || 'jitsi'

    if (callProvider === 'livekit') {
      return { success: true, call: { ...call, room_url: `/livekit?room=${call.room_name}` } }
    }

    // Jitsi Logic
    // Add student's name to the URL as PARTICIPANT (no moderator powers)
    const userName = encodeURIComponent(me.name || 'طالب')
    const baseUrl = call.room_url.split('#')[0]
    // Student Config: Audio/Chat only, No Share, Optimized for 50+
    const studentConfig = [
      'config.prejoinPageEnabled=false',
      'config.enableClosePage=false',
      'config.disableRemoteMute=true',
      'config.remoteVideoMenu.disabled=true',
      'config.disableInviteFunctions=true',
      'config.disableProfile=true',
      'config.p2p.enabled=false',
      'config.startWithVideoMuted=true',
      // ONLY Audio, Chat, Hand, View
      'config.toolbarButtons=["microphone","chat","raisehand","tileview","fullscreen","hangup"]',
      'config.settingsSections=["audio"]',
    ].join('&')

    const roomUrlWithName = `${baseUrl}#${studentConfig}&userInfo.displayName="${userName}"`

    return { success: true, call: { ...call, room_url: roomUrlWithName } }
  } catch (error: any) {
    console.error('Error getting teacher call:', error)
    return { success: false, error: error.message || 'Failed to get call' }
  }
}
