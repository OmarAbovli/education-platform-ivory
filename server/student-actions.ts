"use server"

import { sql } from "@/server/db"

import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function subscribeToTeacher(studentId: string, teacherId: string, plan: "basic" | "standard" | "premium") {
  try {
    const id = "sub_" + crypto.randomUUID()
    await sql`
      INSERT INTO teacher_subscriptions (id, student_id, teacher_id, status)
      VALUES (${id}, ${studentId}, ${teacherId}, 'active');
    `
    return { ok: true as const, id }
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "DB error" }
  }
}

export async function updateMyCredentials(username: string, newPassword?: string) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    if (!user || user.role !== 'student') {
      return { ok: false, error: "Unauthorized" }
    }

    const trimmedUsername = username.trim().toLowerCase()
    if (!trimmedUsername || trimmedUsername.length < 3) {
      return { ok: false, error: "Username must be at least 3 characters" }
    }

    // Check if username is taken by another user
    const taken = await sql`
      SELECT id FROM users 
      WHERE username = ${trimmedUsername} AND id != ${user.id}
      LIMIT 1
    `
    if (taken.length > 0) {
      return { ok: false, error: "اسم المستخدم مستخدم بالفعل" }
    }

    if (newPassword && newPassword.length > 0) {
      if (newPassword.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters" }
      }
      const hash = await bcrypt.hash(newPassword, 10)
      await sql`
        UPDATE users 
        SET username = ${trimmedUsername}, password_hash = ${hash}
        WHERE id = ${user.id}
      `
    } else {
      await sql`
        UPDATE users 
        SET username = ${trimmedUsername}
        WHERE id = ${user.id}
      `
    }

    return { ok: true }
  } catch (e: any) {
    console.error("updateMyCredentials error", e)
    return { ok: false, error: "Failed to update credentials" }
  }
}
