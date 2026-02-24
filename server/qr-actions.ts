"use server"

import { sql } from "@/server/db"
import { randomUUID } from "crypto"
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

export async function getTeacherQrTokens() {
  try {
    const teacherId = await requireTeacherId()

    const rows = await sql`
      SELECT 
        q.id, 
        q.token, 
        q.user_id, 
        q.expires_at, 
        q.used, 
        q.is_permanent, 
        q.usage_count, 
        q.max_uses,
        u.name as student_name,
        u.username as student_username,
        u.grade as student_grade
      FROM qr_tokens q
      JOIN users u ON u.id = q.user_id
      JOIN teacher_subscriptions ts ON ts.student_id = u.id
      WHERE ts.teacher_id = ${teacherId} AND ts.status = 'active'
      ORDER BY q.expires_at DESC;
    `
    return { ok: true as const, tokens: rows as any[] }
  } catch (e: any) {
    console.error("getTeacherQrTokens error", e)
    return { ok: false as const, error: e?.message || "Internal Error" }
  }
}

export async function updateQrMaxUses(qrId: string, newMax: number) {
  try {
    const teacherId = await requireTeacherId()

    // Safety check: ensure the teacher owns this student
    const [owns] = await sql`
      SELECT 1 
      FROM qr_tokens q
      JOIN teacher_subscriptions ts ON ts.student_id = q.user_id
      WHERE q.id = ${qrId} AND ts.teacher_id = ${teacherId} AND ts.status = 'active'
      LIMIT 1;
    `
    if (!owns) throw new Error("Unauthorized or QR code not found")

    await sql`
      UPDATE qr_tokens
      SET max_uses = ${newMax},
          used = (usage_count >= ${newMax})
      WHERE id = ${qrId};
    `

    revalidatePath("/teacher/qr-login")
    return { ok: true as const }
  } catch (e: any) {
    console.error("updateQrMaxUses error", e)
    return { ok: false as const, error: e?.message || "Internal Error" }
  }
}


export async function createQrToken(args: { token: string; userId: string; expiresInMinutes: number; isPermanent?: boolean; maxUses?: number }) {
  try {
    const id = "qr_" + randomUUID()
    const isPermanent = args.isPermanent ?? false
    const maxUses = args.maxUses ?? 1
    await sql`
      INSERT INTO qr_tokens (id, token, user_id, expires_at, used, is_permanent, usage_count, max_uses)
      VALUES (
        ${id},
        ${args.token},
        ${args.userId},
        NOW() + make_interval(mins := ${args.expiresInMinutes}),
        false,
        ${isPermanent},
        0,
        ${maxUses}
      );
    `
    return true
  } catch (e: any) {
    console.error("createQrToken error", { code: e?.code, message: e?.message })
    return false
  }
}

export async function consumeQrTokenCreateSessionWithRole(token: string) {
  // QR login is enabled by default. Set ENABLE_QR_LOGIN='false' to disable it explicitly.
  if (process.env.ENABLE_QR_LOGIN === 'false') {
    console.warn('QR login is disabled by configuration (ENABLE_QR_LOGIN=false)')
    return null
  }
  try {
    const rows = await sql`
      SELECT q.id, q.user_id, q.expires_at, q.used, u.role, q.is_permanent, q.usage_count, q.max_uses
      FROM qr_tokens q
      JOIN users u ON u.id = q.user_id
      WHERE q.token = ${token}
      LIMIT 1;
    `
    const qr = rows[0] as undefined | {
      id: string;
      user_id: string;
      expires_at: string;
      used: boolean;
      role: string;
      is_permanent: boolean;
      usage_count: number;
      max_uses: number;
    }
    if (!qr) return null

    // Check expiry
    const expired = new Date(qr.expires_at).getTime() < Date.now()
    if (expired) return null

    // Check usage limit
    // If not permanent, standard 'used' check applies (which corresponds to max_uses=1 usually)
    // If permanent, we check usage_count < max_uses
    // We unify this: check if usage_count < max_uses
    if (qr.usage_count >= qr.max_uses) {
      return null
    }

    // Increment usage count
    await sql`
        UPDATE qr_tokens 
        SET usage_count = usage_count + 1,
            used = (usage_count + 1 >= max_uses)
        WHERE id = ${qr.id};
    `

    const sessionId = "sess_" + randomUUID()
    await sql`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (${sessionId}, ${qr.user_id}, NOW() + INTERVAL '30 days', NOW());
    `
    return { id: sessionId, role: qr.role }
  } catch (e: any) {
    console.error("consumeQrTokenCreateSession error", { code: e?.code, message: e?.message })
    return null
  }
}

