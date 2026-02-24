"use server"

import { sql } from "@/server/db"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { awardXP } from "./xp-actions"

interface VideoWatchInfo {
  videoId: string
  timesWatched: number
  maxAllowed: number
  remainingWatches: number
  canWatch: boolean
  lastWatchProgress: number
  watchLimitEnabled: boolean
}

interface TrackProgressResult {
  success: boolean
  message?: string
  completed?: boolean
  progress?: number
  remainingWatches?: number
  totalWatches?: number
}

/**
 * الحصول على معلومات مشاهدة الفيديو للطالب
 */
export async function getVideoWatchInfo(videoId: string): Promise<VideoWatchInfo | null> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || user.role !== "student") {
      return null
    }

    // الحصول على معلومات الفيديو ومعلومات المشاهدة
    const result = await sql`
      SELECT 
        v.id as video_id,
        v.url as video_url,
        COALESCE(vwt.completed_count, 0) as times_watched,
        COALESCE(v.max_watch_count, 3) as max_allowed,
        COALESCE(vwt.last_watch_progress, 0) as last_watch_progress,
        COALESCE(v.watch_limit_enabled, true) as watch_limit_enabled,
        COALESCE(v.duration_seconds, 0) as duration
      FROM videos v
      LEFT JOIN video_watch_tracking vwt ON 
        vwt.video_id = v.id AND 
        vwt.student_id = ${user.id}
      WHERE v.id = ${videoId}
      LIMIT 1
    ` as any[]

    if (result.length === 0) {
      return null
    }

    const data = result[0]
    const remainingWatches = data.watch_limit_enabled
      ? Math.max(0, data.max_allowed - data.times_watched)
      : 999 // عدد كبير إذا كان الحد غير مفعل

    const canWatch = !data.watch_limit_enabled || data.times_watched < data.max_allowed

    return {
      videoId: data.video_id,
      timesWatched: data.times_watched,
      maxAllowed: data.max_allowed,
      remainingWatches,
      canWatch,
      lastWatchProgress: data.last_watch_progress,
      watchLimitEnabled: data.watch_limit_enabled
    }
  } catch (error) {
    console.error("Error getting video watch info:", error)
    return null
  }
}

/**
 * الحصول على آخر موضع مشاهدة للفيديو
 */
export async function getLastWatchPosition(videoId: string): Promise<number> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || user.role !== "student") {
      return 0
    }

    // الحصول على آخر جلسة لم تكتمل
    const result = await sql`
      SELECT 
        vws.max_progress,
        vws.session_end,
        vwt.last_watch_progress,
        v.duration_seconds
      FROM videos v
      LEFT JOIN video_watch_tracking vwt ON 
        vwt.video_id = v.id AND 
        vwt.student_id = ${user.id}
      LEFT JOIN video_watch_sessions vws ON 
        vws.video_id = v.id AND 
        vws.student_id = ${user.id} AND
        vws.is_completed = false
      WHERE v.id = ${videoId}
      ORDER BY vws.created_at DESC
      LIMIT 1
    ` as any[]

    if (result.length === 0) {
      return 0
    }

    const data = result[0]
    const duration = data.duration_seconds || 0

    // إذا كان هناك جلسة غير مكتملة، استخدم تقدمها
    if (data.max_progress && data.max_progress < 85) {
      // حول النسبة المئوية إلى ثواني
      return (data.max_progress / 100) * duration
    }

    // إذا لم تكن هناك جلسة غير مكتملة، استخدم آخر تقدم محفوظ
    if (data.last_watch_progress && data.last_watch_progress < 85) {
      return (data.last_watch_progress / 100) * duration
    }

    return 0
  } catch (error) {
    console.error("Error getting last watch position:", error)
    return 0
  }
}

/**
 * بدء جلسة مشاهدة جديدة
 */
export async function startWatchSession(videoId: string): Promise<{ success: boolean; sessionId?: string; canWatch?: boolean; lastPosition?: number }> {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || user.role !== "student") {
      return { success: false }
    }

    // التحقق من إمكانية المشاهدة
    const watchInfo = await getVideoWatchInfo(videoId)
    if (!watchInfo || !watchInfo.canWatch) {
      return { success: false, canWatch: false }
    }

    // إنشاء جلسة مشاهدة جديدة
    const result = await sql`
      INSERT INTO video_watch_sessions (student_id, video_id)
      VALUES (${user.id}, ${videoId})
      RETURNING id
    ` as any[]

    // تحديث أو إنشاء سجل التتبع - لا نزيد watch_count هنا
    // watch_count سيتم تحديثه فقط عند اكتمال المشاهدة
    await sql`
      INSERT INTO video_watch_tracking (student_id, video_id, watch_count, last_watched_at)
      VALUES (${user.id}, ${videoId}, 0, NOW())
      ON CONFLICT (student_id, video_id)
      DO UPDATE SET 
        last_watched_at = NOW()
    `

    // الحصول على آخر موضع مشاهدة
    const lastPosition = await getLastWatchPosition(videoId)

    return {
      success: true,
      sessionId: result[0].id,
      canWatch: true,
      lastPosition
    }
  } catch (error) {
    console.error("Error starting watch session:", error)
    return { success: false }
  }
}

/**
 * تتبع تقدم المشاهدة
 */
export async function trackVideoProgress(
  videoId: string,
  progressPercent: number,
  sessionId?: string
): Promise<TrackProgressResult> {
  try {
    const cookieStore = await cookies()
    const cookieSessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(cookieSessionId)

    if (!user || user.role !== "student") {
      return { success: false, message: "Unauthorized" }
    }

    // التحقق من أن التقدم بين 0 و 100
    const validProgress = Math.min(100, Math.max(0, progressPercent))
    const isCompleted = validProgress >= 85 // يعتبر مكتمل عند 85%

    console.log(`[Track Progress] Video: ${videoId}, Progress: ${validProgress}%, Is Completed: ${isCompleted}, Session: ${sessionId}`)

    // تحديث جلسة المشاهدة إذا كان لدينا session ID - لكن لا نحدث is_completed هنا
    if (sessionId) {
      await sql`
        UPDATE video_watch_sessions
        SET 
          max_progress = GREATEST(max_progress, ${validProgress}),
          session_end = NOW()
        WHERE 
          id = ${sessionId} AND
          student_id = ${user.id} AND
          video_id = ${videoId}
      `
    }

    // الحصول على معلومات التتبع الحالية
    const currentTracking = await sql`
      SELECT completed_count, last_watch_progress
      FROM video_watch_tracking
      WHERE student_id = ${user.id} AND video_id = ${videoId}
    ` as any[]

    let completedCount = 0
    let previousProgress = 0

    if (currentTracking.length > 0) {
      completedCount = currentTracking[0].completed_count
      previousProgress = currentTracking[0].last_watch_progress || 0
    }

    // التحقق من الجلسة الحالية إذا كان لدينا session ID
    let sessionAlreadyCompleted = false
    if (sessionId) {
      const sessionData = await sql`
        SELECT is_completed
        FROM video_watch_sessions
        WHERE id = ${sessionId} AND student_id = ${user.id} AND video_id = ${videoId}
      ` as any[]

      if (sessionData.length > 0) {
        sessionAlreadyCompleted = sessionData[0].is_completed
      }
    }

    // إذا وصل إلى 85% ولم يكن قد أكمل في هذه الجلسة
    let newCompletion = false
    console.log(`[Track Progress] Check completion: isCompleted=${isCompleted}, sessionAlreadyCompleted=${sessionAlreadyCompleted}, sessionId=${sessionId}`)

    if (isCompleted && !sessionAlreadyCompleted) {
      console.log('[Track Progress] ✅ Marking session as completed. Previous count:', completedCount)
      completedCount += 1
      newCompletion = true

      // تحديث الجلسة كمكتملة
      if (sessionId) {
        console.log('[Track Progress] Updating session as completed in DB')
        await sql`
          UPDATE video_watch_sessions
          SET is_completed = true, max_progress = ${validProgress}
          WHERE id = ${sessionId}
        `
      }

      // 🏆 Award XP for completion
      await awardXP({
        userId: user.id,
        amount: 100,
        source: 'video',
        sourceId: videoId,
        description: `Video Completion: ${videoId}`
      })
    } else {
      console.log(`[Track Progress] ❌ Not marking as complete. Reasons: isCompleted=${isCompleted}, sessionAlreadyCompleted=${sessionAlreadyCompleted}`)
    }

    // 🏆 Award XP for progress duration (incremental)
    if (validProgress > previousProgress) {
      const progressGained = validProgress - previousProgress
      // Award 2 XP per 1% of video progress gained
      const durationXP = Math.floor(progressGained * 2)
      if (durationXP > 0) {
        await awardXP({
          userId: user.id,
          amount: durationXP,
          source: 'video',
          sourceId: videoId,
          description: `Video Watch Progress (+${Math.round(progressGained)}%)`
        })
      }
    }

    // تحديث أو إنشاء سجل التتبع
    await sql`
      INSERT INTO video_watch_tracking (
        student_id, video_id, last_watch_progress, completed_count, last_watched_at, watch_count
      )
      VALUES (
        ${user.id}, ${videoId}, ${validProgress}, ${completedCount}, NOW(), 0
      )
      ON CONFLICT (student_id, video_id)
      DO UPDATE SET
        last_watch_progress = GREATEST(video_watch_tracking.last_watch_progress, ${validProgress}),
        completed_count = ${completedCount},
        last_watched_at = NOW(),
        updated_at = NOW()
    `

    // الحصول على عدد المشاهدات المتبقية
    const videoInfo = await sql`
      SELECT 
        COALESCE(max_watch_count, 3) as max_allowed,
        watch_limit_enabled
      FROM videos
      WHERE id = ${videoId}
    ` as any[]

    const maxAllowed = videoInfo[0]?.max_allowed || 3
    const watchLimitEnabled = videoInfo[0]?.watch_limit_enabled ?? true
    const remainingWatches = watchLimitEnabled
      ? Math.max(0, maxAllowed - completedCount)
      : 999

    const result = {
      success: true,
      completed: newCompletion,
      progress: validProgress,
      remainingWatches,
      totalWatches: completedCount
    }

    console.log('[Track Progress] Final result:', result)
    return result
  } catch (error) {
    console.error("Error tracking video progress:", error)
    return { success: false, message: "Failed to track progress" }
  }
}

/**
 * الحصول على إحصائيات المشاهدة للطالب
 */
export async function getStudentWatchStats(studentId?: string) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user) return null

    // إذا لم يتم تحديد studentId، استخدم المستخدم الحالي
    const targetStudentId = studentId || user.id

    // التحقق من الصلاحيات
    if (user.role === "student" && targetStudentId !== user.id) {
      return null // الطالب يمكنه رؤية إحصائياته فقط
    }

    const stats = await sql`
      SELECT 
        COUNT(DISTINCT video_id) as total_videos_watched,
        SUM(completed_count) as total_completions,
        AVG(last_watch_progress) as avg_progress,
        MAX(last_watched_at) as last_activity
      FROM video_watch_tracking
      WHERE student_id = ${targetStudentId}
    ` as any[]

    return stats[0] || null
  } catch (error) {
    console.error("Error getting student watch stats:", error)
    return null
  }
}

/**
 * الحصول على قائمة الفيديوهات مع معلومات المشاهدة
 */
export async function getVideosWithWatchInfo(packageId?: string) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || user.role !== "student") {
      return []
    }

    if (packageId) {
      const result = await sql`
        SELECT 
          v.id,
          v.title,
          v.description,
          v.thumbnail_url,
          v.max_watch_count,
          v.watch_limit_enabled,
          COALESCE(vwt.completed_count, 0) as times_watched,
          COALESCE(vwt.last_watch_progress, 0) as last_progress,
          vwt.last_watched_at,
          CASE 
            WHEN NOT v.watch_limit_enabled THEN TRUE
            WHEN vwt.completed_count IS NULL THEN TRUE
            WHEN vwt.completed_count < v.max_watch_count THEN TRUE
            ELSE FALSE
          END as can_watch,
          GREATEST(0, v.max_watch_count - COALESCE(vwt.completed_count, 0)) as remaining_watches
        FROM videos v
        LEFT JOIN video_watch_tracking vwt ON 
          vwt.video_id = v.id AND 
          vwt.student_id = ${user.id}
        WHERE v.package_id = ${packageId}
        ORDER BY v.created_at DESC
      ` as any[]
      return result
    } else {
      const result = await sql`
        SELECT 
          v.id,
          v.title,
          v.description,
          v.thumbnail_url,
          v.max_watch_count,
          v.watch_limit_enabled,
          COALESCE(vwt.completed_count, 0) as times_watched,
          COALESCE(vwt.last_watch_progress, 0) as last_progress,
          vwt.last_watched_at,
          CASE 
            WHEN NOT v.watch_limit_enabled THEN TRUE
            WHEN vwt.completed_count IS NULL THEN TRUE
            WHEN vwt.completed_count < v.max_watch_count THEN TRUE
            ELSE FALSE
          END as can_watch,
          GREATEST(0, v.max_watch_count - COALESCE(vwt.completed_count, 0)) as remaining_watches
        FROM videos v
        LEFT JOIN video_watch_tracking vwt ON 
          vwt.video_id = v.id AND 
          vwt.student_id = ${user.id}
        ORDER BY v.created_at DESC
      ` as any[]
      return result
    }
  } catch (error) {
    console.error("Error getting videos with watch info:", error)
    return []
  }
}

/**
 * التحقق من المعلم
 */
async function requireTeacherId() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  if (!me || me.role !== "teacher") {
    throw new Error("Not authorized: teacher access required")
  }
  return me.id
}

/**
 * الحصول على قائمة الطلاب الذين شاهدوا فيديو معين
 */
export async function getVideoWatchers(videoId: string) {
  try {
    const teacherId = await requireTeacherId()

    // التأكد من أن المعلم يملك هذا الفيديو
    const [video] = await sql`
      SELECT id FROM videos WHERE id = ${videoId} AND teacher_id = ${teacherId}
    ` as any[]

    if (!video) {
      return { ok: false, error: "Unauthorized or video not found" }
    }

    const rows = await sql`
      SELECT 
        vwt.student_id,
        u.name as student_name,
        u.username as student_username,
        u.grade as student_grade,
        vwt.completed_count,
        vwt.last_watch_progress,
        vwt.last_watched_at
      FROM video_watch_tracking vwt
      JOIN users u ON u.id = vwt.student_id
      WHERE vwt.video_id = ${videoId}
      ORDER BY vwt.last_watched_at DESC;
    `
    return { ok: true as const, watchers: rows as any[] }
  } catch (e: any) {
    console.error("getVideoWatchers error", e)
    return { ok: false as const, error: e?.message || "Internal Error" }
  }
}
