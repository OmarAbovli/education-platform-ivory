import { sql } from "@/server/db"

export type VideoComment = {
    id: string
    video_id: string
    user_id: string
    body: string
    created_at: string
    author_name: string | null
    author_avatar_url: string | null
}

/**
 * List comments for a specific video, newest first.
 */
export async function getVideoComments(videoId: string): Promise<VideoComment[]> {
    try {
        const rows = (await sql`
      SELECT
        vc.id,
        vc.video_id,
        vc.user_id,
        vc.body,
        vc.created_at,
        u.name AS author_name,
        u.avatar_url AS author_avatar_url
      FROM video_comments vc
      JOIN users u ON u.id = vc.user_id
      WHERE vc.video_id = ${videoId}
      ORDER BY vc.created_at DESC;
    `) as any[]

        return rows.map((r) => ({
            id: r.id,
            video_id: r.video_id,
            user_id: r.user_id,
            body: r.body,
            created_at: r.created_at,
            author_name: r.author_name ?? null,
            author_avatar_url: r.author_avatar_url ?? null,
        }))
    } catch (error) {
        console.error("getVideoComments error", error)
        return []
    }
}
