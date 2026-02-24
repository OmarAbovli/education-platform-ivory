import { sql } from "@/server/db"

export type TeacherPhoto = {
  id: string
  teacher_id: string
  url: string
  caption: string | null
  created_at: string
}

/**
 * List photos for a specific teacher, newest first.
 */
export async function getTeacherPhotos(teacherId: string): Promise<TeacherPhoto[]> {
  const rows = (await sql`
    SELECT id, teacher_id, url, caption, created_at
    FROM photos
    WHERE teacher_id = ${teacherId}
    ORDER BY created_at DESC
  `) as any[]

  return rows.map((r) => ({
    id: r.id,
    teacher_id: r.teacher_id,
    url: r.url,
    caption: r.caption,
    created_at: r.created_at,
  }))
}

export type RecentPhoto = {
  id: string
  teacher_id: string
  url: string
  caption: string | null
  created_at: string
  teacher_name: string | null
  teacher_avatar_url: string | null
  like_count: number
  comment_count: number
}

export async function getRecentPhotos(limit = 50, offset = 0): Promise<RecentPhoto[]> {
  const rows = (await sql`
    SELECT
      p.id,
      p.teacher_id,
      p.url,
      p.caption,
      p.created_at,
      COALESCE(p.uploader_name, u.name) AS teacher_name,
      COALESCE(uploader.avatar_url, u.avatar_url) AS teacher_avatar_url,
      COALESCE(l.cnt, 0) AS like_count,
      COALESCE(c.cnt, 0) AS comment_count
    FROM photos p
    JOIN users u ON u.id = p.teacher_id
    LEFT JOIN users uploader ON uploader.id = p.uploader_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM photo_likes pl
      WHERE pl.photo_id = p.id
    ) l ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM photo_comments pc
      WHERE pc.photo_id = p.id
    ) c ON TRUE
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `) as any[]

  return rows.map((r) => ({
    id: r.id,
    teacher_id: r.teacher_id,
    url: r.url,
    caption: r.caption,
    created_at: r.created_at,
    teacher_name: r.teacher_name ?? null,
    teacher_avatar_url: r.teacher_avatar_url ?? null,
    like_count: Number(r.like_count ?? 0),
    comment_count: Number(r.comment_count ?? 0),
  }))
}

export type PhotoComment = {
  id: string
  photo_id: string
  user_id: string
  body: string
  created_at: string
  author_name: string | null
  author_avatar_url: string | null
}

export async function getPhotoComments(photoId: string): Promise<PhotoComment[]> {
  const rows = (await sql`
    SELECT
      pc.id,
      pc.photo_id,
      pc.user_id,
      pc.body,
      pc.created_at,
      u.name AS author_name,
      u.avatar_url AS author_avatar_url
    FROM photo_comments pc
    JOIN users u ON u.id = pc.user_id
    WHERE pc.photo_id = ${photoId}
    ORDER BY pc.created_at ASC;
  `) as any[]

  return rows.map((r) => ({
    id: r.id,
    photo_id: r.photo_id,
    user_id: r.user_id,
    body: r.body,
    created_at: r.created_at,
    author_name: r.author_name ?? null,
    author_avatar_url: r.author_avatar_url ?? null,
  }))
}
