"use server"

import { sql } from "@/server/db"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

/**
 * Get high-level analytics for the teacher's student base.
 */
export async function getTeacherAnalyticsOverview() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new Error("Unauthorized")
    }

    const teacherId = user.id

    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM teacher_subscriptions WHERE teacher_id = ${teacherId} AND status = 'active') as "totalStudents",
        (SELECT COUNT(DISTINCT s.user_id) 
         FROM sessions s 
         JOIN teacher_subscriptions ts ON ts.student_id = s.user_id 
         WHERE ts.teacher_id = ${teacherId} 
           AND s.last_active_at > NOW() - INTERVAL '5 minutes') as "onlineNow",
        (SELECT COUNT(DISTINCT s.user_id) 
         FROM sessions s 
         JOIN teacher_subscriptions ts ON ts.student_id = s.user_id 
         WHERE ts.teacher_id = ${teacherId} 
           AND s.last_active_at > NOW() - INTERVAL '24 hours') as "activeToday",
        (SELECT COUNT(DISTINCT s.user_id) 
         FROM sessions s 
         JOIN teacher_subscriptions ts ON ts.student_id = s.user_id 
         WHERE ts.teacher_id = ${teacherId} 
           AND s.last_active_at > NOW() - INTERVAL '7 days') as "activeThisWeek"
    ` as any[]

    return {
      totalStudents: parseInt(stats.totalStudents) || 0,
      onlineNow: parseInt(stats.onlineNow) || 0,
      activeToday: parseInt(stats.activeToday) || 0,
      activeThisWeek: parseInt(stats.activeThisWeek) || 0,
    }
  } catch (error) {
    console.error("Analytics Overview Error:", error)
    return { totalStudents: 0, onlineNow: 0, activeToday: 0, activeThisWeek: 0 }
  }
}

/**
 * Get a list of students currently online (last 5 mins) and what they are doing.
 */
export async function getLiveActiveStudents() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || (user.role !== "teacher" && user.role !== "admin")) return []

    const teacherId = user.id

    const students = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.phone,
        s.last_active_at as "lastActiveAt",
        s.current_activity as "currentActivity"
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      JOIN teacher_subscriptions ts ON ts.student_id = u.id
      WHERE ts.teacher_id = ${teacherId}
        AND s.last_active_at > NOW() - INTERVAL '10 minutes'
      ORDER BY s.last_active_at DESC
    ` as any[]

    return students
  } catch (error) {
    console.error("Live Students Error:", error)
    return []
  }
}

/**
 * Get detailed logs for a specific student for the teacher.
 */
export async function getStudentDetailedInsight(studentId: string) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || (user.role !== "teacher" && user.role !== "admin")) throw new Error("Unauthorized")

    const teacherId = user.id

    // Verify student is subscribed
    const [sub] = await sql`
      SELECT 1 FROM teacher_subscriptions 
      WHERE student_id = ${studentId} AND teacher_id = ${teacherId} AND status = 'active'
    ` as any[]

    if (!sub && user.role !== 'admin') throw new Error("Not your student")

    // Get watch history (most recent 50)
    const watchHistory = await sql`
      SELECT 
        v.title as "videoTitle",
        vwt.last_watch_progress as "progress",
        vwt.last_watched_at as "timestamp",
        vwt.total_time_watched as "timeSpentInSeconds"
      FROM video_watch_tracking vwt
      JOIN videos v ON v.id = vwt.video_id
      WHERE vwt.student_id = ${studentId} AND v.teacher_id = ${teacherId}
      ORDER BY vwt.last_watched_at DESC
      LIMIT 50
    ` as any[]

    // Get aggregate time spent on teacher's videos
    const [totalTime] = await sql`
        SELECT SUM(total_time_watched) as total
        FROM video_watch_tracking vwt
        JOIN videos v ON v.id = vwt.video_id
        WHERE vwt.student_id = ${studentId} AND v.teacher_id = ${teacherId}
    ` as any[]

    return {
      watchHistory,
      totalTimeSpentMinutes: Math.round((parseInt(totalTime.total) || 0) / 60),
    }
  } catch (error) {
    console.error("Student Insight Error:", error)
    return null
  }
}
