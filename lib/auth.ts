import { sql } from "@/server/db"

export type Role = "admin" | "teacher" | "student"

export async function getCurrentUser(sessionId?: string) {
  try {
    if (!sessionId) {
      return null
    }
    const rows = (await sql`
      SELECT u.id, u.role, u.name, u.grade, u.avatar_url, u.username
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
      LIMIT 1;
    `) as any[]
    return rows[0] ?? null
  } catch {
    return null
  }
}
