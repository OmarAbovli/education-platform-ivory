"use server"

import { sql } from "@/server/db"
import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import type { StudentClassification } from "./teacher-actions"

type SelfRegisterInput = {
    name: string
    phone: string
    guardianPhone: string
    grade: number
    username: string
    password: string
    teacherId?: string  // Optional - will be auto-assigned if only one teacher
    classification?: StudentClassification
}

export async function selfRegisterStudent(input: SelfRegisterInput) {
    try {
        // Validation
        if (!input.name || !input.phone || !input.guardianPhone || !input.grade) {
            return { ok: false as const, error: "All fields are required" }
        }

        if (!input.username || input.username.length < 3) {
            return { ok: false as const, error: "Username must be at least 3 characters" }
        }

        if (!input.password || input.password.length < 6) {
            return { ok: false as const, error: "Password must be at least 6 characters" }
        }

        if (![1, 2, 3].includes(input.grade)) {
            return { ok: false as const, error: "Invalid grade" }
        }

        // Check if username already exists
        const existingUser = await sql`
      SELECT id FROM users WHERE username = ${input.username} LIMIT 1
    `

        if (existingUser.length > 0) {
            return { ok: false as const, error: "Username already taken" }
        }

        const studentId = "st_" + randomUUID()
        const passwordHash = await bcrypt.hash(input.password, 10)
        const classification = input.classification ?? "center"

        // Create student account
        await sql`
      INSERT INTO users (id, role, name, phone, guardian_phone, grade, username, password_hash, classification)
      VALUES (${studentId}, 'student', ${input.name}, ${input.phone}, ${input.guardianPhone}, ${input.grade}, ${input.username}, ${passwordHash}, ${classification})
    `

        // Determine which teacher to subscribe to
        let teacherId = input.teacherId

        if (!teacherId) {
            // Auto-assign if only one teacher exists
            const teachers = await sql`
        SELECT id FROM users WHERE role = 'teacher' LIMIT 2
      `

            if (teachers.length === 1) {
                teacherId = teachers[0].id
            }
            // If multiple teachers and no selection, that's an error
            else if (teachers.length > 1) {
                // Delete the created student account
                await sql`DELETE FROM users WHERE id = ${studentId}`
                return { ok: false as const, error: "Please select a teacher" }
            }
        }

        // Create teacher subscription if we have a teacher
        if (teacherId) {
            const subId = "sub_" + randomUUID()
            await sql`
        INSERT INTO teacher_subscriptions (id, student_id, teacher_id, status)
        VALUES (${subId}, ${studentId}, ${teacherId}, 'active')
        ON CONFLICT DO NOTHING
      `
        }

        // Create session for auto-login
        const sessionId = "sess_" + randomUUID()
        const cookieStore = await cookies()

        await sql`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (${sessionId}, ${studentId}, NOW() + INTERVAL '30 days', NOW())
    `

        cookieStore.set("session_id", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/"
        })

        return {
            ok: true as const,
            studentId,
            username: input.username
        }
    } catch (e: any) {
        console.error("selfRegisterStudent error", e)

        if (e?.code === "23505") { // Unique violation
            return { ok: false as const, error: "Username already taken" }
        }

        return { ok: false as const, error: e?.message ?? "Registration failed" }
    }
}
