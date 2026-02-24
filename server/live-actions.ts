"use server"

import { randomUUID } from "crypto"
import { sql } from "@/server/db"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

async function requireTeacherId() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  if (!me || me.role !== "teacher") {
    throw new Error("Not authorized: teacher access required")
  }
  return me.id
}

export async function getMyLiveStatus() {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      SELECT title, url, is_active, grades, package_ids
      FROM teacher_live_status
      WHERE teacher_id = ${teacherId}
      LIMIT 1;
    `) as any[]
    const s = rows[0]
    return {
      title: s?.title ?? "",
      url: s?.url ?? "",
      isActive: Boolean(s?.is_active ?? false),
      grades: (s?.grades as number[] | null) ?? [],
      packageIds: (s?.package_ids as string[] | null) ?? [],
    }
  } catch (e) {
    return { title: "", url: "", isActive: false, grades: [], packageIds: [] }
  }
}

export async function setLiveStatus(input: {
  title?: string
  url?: string
  active: boolean
  grades?: number[]
  packageIds?: string[]
}) {
  try {
    const teacherId = await requireTeacherId()
    await sql`
      INSERT INTO teacher_live_status (teacher_id, title, url, is_active, updated_at, grades, package_ids)
      VALUES (
        ${teacherId},
        ${input.title ?? null},
        ${input.url ?? null},
        ${input.active},
        NOW(),
        ${input.grades ?? null},
        ${input.packageIds ?? null}
      )
      ON CONFLICT (teacher_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        is_active = EXCLUDED.is_active,
        grades = EXCLUDED.grades,
        package_ids = EXCLUDED.package_ids,
        updated_at = NOW();
    `

    // If going live, notify subscribed students
    if (input.active) {
      try {
        const studentRows = (await sql`
          SELECT student_id FROM teacher_subscriptions
          WHERE teacher_id = ${teacherId} AND status = 'active';
        `) as { student_id: string }[]

        if (studentRows.length > 0) {
          const teacher = (await sql`SELECT name FROM users WHERE id = ${teacherId}`)[0]
          const teacherName = teacher?.name || "Your teacher"
          const message = `${teacherName} is now live! ${input.title ? `(${input.title})` : ""}`
          const url = input.url // The live stream URL

          for (const row of studentRows) {
            await sql`
              INSERT INTO notifications (id, user_id, message, url)
              VALUES (${'notif_' + randomUUID()}, ${row.student_id}, ${message}, ${url});
            `
          }
        }
      } catch (e) {
        console.error("Failed to create notifications for live status:", e)
      }
    }

    revalidatePath("/teacher")

    // --- SYNC WITH SESSION HISTORY (voice_calls) ---
    // If it's a LiveKit/Jitsi session, we want to record it in voice_calls for history/attendance
    if (input.active && input.url) {
      const isLiveKit = input.url.includes("/livekit?room=");
      const isJitsi = input.url.includes("meet.jit.si/");

      if (isLiveKit || isJitsi) {
        const provider = isLiveKit ? "livekit" : "jitsi";
        let roomName = "";

        if (isLiveKit) {
          roomName = input.url.split("room=")[1]?.split("&")[0] || "";
        } else {
          roomName = input.url.split("meet.jit.si/")[1]?.split("#")[0] || "";
        }

        if (roomName) {
          // Create the session in voice_calls
          const callId = randomUUID();
          // We pick the first grade from the list as the primary grade for the call record
          const primaryGrade = input.grades && input.grades.length > 0 ? input.grades[0] : 0;

          await sql`
            INSERT INTO voice_calls (id, grade, started_by, room_name, room_url, status, provider)
            VALUES (${callId}, ${primaryGrade}, ${teacherId}, ${roomName}, ${input.url}, 'active', ${provider})
            ON CONFLICT (room_name) DO NOTHING;
          `;

          // Record the teacher as a participant
          await sql`
            INSERT INTO voice_call_participants (call_id, user_id)
            SELECT id, ${teacherId} FROM voice_calls WHERE room_name = ${roomName} AND status = 'active'
            ON CONFLICT (call_id, user_id) DO NOTHING;
          `;
        }
      }
    } else if (!input.active) {
      // If stopping live, mark any active sessions for this teacher as ended
      await sql`
        UPDATE voice_calls
        SET status = 'ended', ended_at = NOW()
        WHERE started_by = ${teacherId} AND status = 'active';
      `;
      // Also mark participants as left
      await sql`
        UPDATE voice_call_participants
        SET left_at = NOW()
        WHERE left_at IS NULL AND call_id IN (
          SELECT id FROM voice_calls WHERE started_by = ${teacherId} AND status = 'ended' AND ended_at > NOW() - INTERVAL '1 minute'
        );
      `;
    }

    return { ok: true as const }
  } catch (e: any) {
    console.error("setLiveStatus error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

// Scheduled Live Sessions

export async function getScheduledLiveSessions() {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      SELECT id, title, start_at, embed_url, grades, month, is_free, package_ids
      FROM live_sessions
      WHERE teacher_id = ${teacherId} AND start_at > NOW()
      ORDER BY start_at ASC;
    `) as any[]
    return rows as {
      id: string
      title: string
      start_at: Date
      embed_url: string
      grades: number[] | null
      month: number | null
      is_free: boolean | null
      package_ids: string[] | null
    }[]
  } catch (e) {
    console.error("getScheduledLiveSessions error", e)
    return []
  }
}

export async function scheduleLiveSession(input: {
  title: string
  start_at: Date
  embed_url: string
  grades: number[]
  is_free: boolean
  packageIds?: string[]
}) {
  try {
    const teacherId = await requireTeacherId()
    const id = "ls_" + randomUUID()

    await sql`
      INSERT INTO live_sessions (id, teacher_id, title, start_at, embed_url, grades, month, is_free, package_ids)
      VALUES (
        ${id},
        ${teacherId},
        ${input.title},
        ${input.start_at},
        ${input.embed_url},
        ${input.grades},
        NULL,
        ${input.is_free},
        ${input.packageIds ?? null}
      );
    `

    // Notify students only if the session is not free
    if (!input.is_free) {
      try {
        const studentRows = (await sql`
          SELECT student_id FROM teacher_subscriptions
          WHERE teacher_id = ${teacherId} AND status = 'active';
        `) as { student_id: string }[]

        if (studentRows.length > 0) {
          const teacher = (await sql`SELECT name FROM users WHERE id = ${teacherId}`)[0]
          const teacherName = teacher?.name || "Your teacher"
          const message = `New live session scheduled by ${teacherName}: ${input.title}`
          const url = "/student" // Or a dedicated page for live sessions

          for (const row of studentRows) {
            await sql`
              INSERT INTO notifications (id, user_id, message, url)
              VALUES (${'notif_' + randomUUID()}, ${row.student_id}, ${message}, ${url});
            `
          }
        }
      } catch (e) {
        console.error("Failed to create notifications for scheduled session:", e)
      }
    }

    revalidatePath("/teacher")
    return { ok: true as const }
  } catch (e: any) {
    console.error("scheduleLiveSession error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function deleteLiveSession(sessionId: string) {
  try {
    const teacherId = await requireTeacherId()
    await sql`
      DELETE FROM live_sessions
      WHERE id = ${sessionId} AND teacher_id = ${teacherId};
    `
    revalidatePath("/teacher")
    return { ok: true as const }
  } catch (e: any) {
    console.error("deleteLiveSession error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}