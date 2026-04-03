"use server"

import { sql } from "@/server/db"
import { cookies } from "next/headers"

/**
 * 💓 Heartbeat action to track currently active students.
 * Updates the session's last_active_at and current_activity.
 */
export async function updateStudentActivity(path: string, activityLabel?: string) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value

    if (!sessionId) return { success: false, error: "No session" }

    const label = activityLabel || "Browsing Dashboard"
    
    // Perform heartbeat update
    await sql`
      UPDATE sessions
      SET 
        last_active_at = NOW(),
        current_activity = ${label}
      WHERE id = ${sessionId}
    `

    return { success: true }
  } catch (error: any) {
    console.error("Activity heartbeat error:", error)
    return { success: false, error: error.message }
  }
}
