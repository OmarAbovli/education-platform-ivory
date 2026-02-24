'use server'

import { sql } from '@/server/db'

export type VideoRecord = {
  id: string
  title: string | null
  description: string | null
  url: string | null
  category: string | null
  is_free: boolean | null
  month: number | null
  teacher_id: string
  teacher_name: string | null
  teacher_phone: string | null
  thumbnail_url: string | null
}

export type ResourceRecord = {
  id: string
  video_id: string
  title: string
  url: string
}

export type QuizRecord = {
  id: string
  video_id: string
  title: string
}

export type AccessResult =
  | { allowed: true; reason?: undefined }
  | { allowed: false; reason: 'login-required' | 'subscribe-required' | 'month-locked' | 'not-found' }

export async function getVideoById(videoId: string, studentId?: string) {
  const videoRows = (await sql`
        SELECT
            v.*,
            t.name as teacher_name,
            t.phone as teacher_phone
        FROM videos v
        JOIN users t ON v.teacher_id = t.id
        WHERE v.id = ${videoId}
  `) as any
  const video = videoRows[0] as (Video & { teacher_name: string; teacher_phone: string; category: string }) | undefined

  if (!video) {
    return null
  }

  // Free videos are accessible to everyone, so no further checks needed.
  if (video.is_free) {
    return video
  }

  // For paid videos, if there's no student logged in, return the video.
  // The access check page will then correctly ask them to log in.
  if (!studentId) {
    return video
  }

  // For a logged-in student, check if they are subscribed to the correct teacher.
  const studentAccessRows = (await sql`
    SELECT teacher_id FROM teacher_subscriptions WHERE student_id = ${studentId} AND status = 'active'
  `) as any
  const studentAccess = studentAccessRows[0] as { teacher_id: string } | undefined

  // If the student has an active subscription, but the video is from a different teacher,
  // treat it as "not found". This prevents access to old content.
  if (studentAccess && video.teacher_id !== studentAccess.teacher_id) {
    return null
  }

  // If student has no active subscription, or the video is from the correct teacher,
  // return the video. The `getAccessForVideo` function will then correctly determine
  // if access is allowed (e.g., for month locks) or show the "subscribe-required" message.
  return video
}



export async function getResourcesForVideo(videoId: string): Promise<ResourceRecord[]> {
  const rows = (await sql`
    SELECT id, video_id, title, url
    FROM resources
    WHERE video_id = ${videoId}
    ORDER BY created_at ASC;
  `) as any[]
  return rows as ResourceRecord[]
}

export async function getQuizzesForVideo(videoId: string): Promise<QuizRecord[]> {
  const rows = (await sql`
    SELECT id, video_id, title
    FROM quizzes
    WHERE video_id = ${videoId}
    ORDER BY created_at ASC;
  `) as any[]
  return rows as QuizRecord[]
}

export async function getAllVideosForQuizForm() {
  const videos = (await sql`
    SELECT id, title
    FROM videos
    ORDER BY created_at DESC;
  `) as any[]
  return videos as { id: string; title: string }[]
}