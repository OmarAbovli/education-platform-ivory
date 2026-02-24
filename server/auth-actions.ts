"use server"

import { sql } from "@/server/db"
import { randomUUID, randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

type CreateTeacherInput = {
  name: string
  email?: string
  phone: string
  subject?: string
  bio?: string
  avatarUrl?: string
  themePrimary?: string
  themeSecondary?: string
}

export type PasswordLoginState =
  | { ok: true }
  | {
    ok: false
    message: string
    fieldErrors?: {
      identifier?: string
      password?: string
    }
  }

// Convert random bytes to URL-safe base64 without relying on "base64url"
function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function randomUsername() {
  const token = base64Url(randomBytes(6))
  // Keep alphanumerics, prefix with tfk_
  return ("tfk_" + token)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12)
    .toLowerCase()
}

function randomPassword() {
  const token = base64Url(randomBytes(12))
  // Alphanumeric, decent length
  return token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14)
}

export async function createTeacher(input: CreateTeacherInput) {
  try {
    const id = "t_" + randomUUID()
    const username = randomUsername()
    const password = randomPassword()
    const hash = await bcrypt.hash(password, 10)

    await sql`
      INSERT INTO users (id, role, name, email, phone, subject, bio, avatar_url, theme_primary, theme_secondary, username, password_hash)
      VALUES (
        ${id},
        'teacher',
        ${input.name},
        ${input.email ?? null},
        ${input.phone},
        ${input.subject ?? null},
        ${input.bio ?? null},
        ${input.avatarUrl ?? null},
        ${input.themePrimary ?? null},
        ${input.themeSecondary ?? null},
        ${username},
        ${hash}
      );
    `
    return { ok: true as const, teacherId: id, username, password }
  } catch (e: any) {
    console.error("createTeacher error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function getTeachersList() {
  try {
    const rows = (await sql`
      SELECT id, name, subject, bio, phone, avatar_url, username, theme_primary, theme_secondary
      FROM users WHERE role = 'teacher' ORDER BY created_at DESC
    `) as any[]
    return rows
  } catch {
    return []
  }
}

export async function adminUpdateTeacher(
  teacherId: string,
  input: {
    name?: string
    subject?: string
    bio?: string
    phone?: string
    avatarUrl?: string
    themePrimary?: string
    themeSecondary?: string
  },
) {
  try {
    await sql`
      UPDATE users
      SET
        name = COALESCE(${input.name}, name),
        subject = COALESCE(${input.subject}, subject),
        bio = COALESCE(${input.bio}, bio),
        phone = COALESCE(${input.phone}, phone),
        avatar_url = COALESCE(${input.avatarUrl}, avatar_url),
        theme_primary = COALESCE(${input.themePrimary}, theme_primary),
        theme_secondary = COALESCE(${input.themeSecondary}, theme_secondary)
      WHERE id = ${teacherId} AND role = 'teacher';
    `
    return true
  } catch (e) {
    console.error("adminUpdateTeacher error", e)
    return false
  }
}

export async function adminChangeCredentials(teacherId: string, username: string, newPassword?: string) {
  try {
    if (newPassword && newPassword.length > 0) {
      const hash = await bcrypt.hash(newPassword, 10)
      await sql`
        UPDATE users SET username = ${username}, password_hash = ${hash}
        WHERE id = ${teacherId} AND role = 'teacher';
      `
    } else {
      await sql`
        UPDATE users SET username = ${username}
        WHERE id = ${teacherId} AND role = 'teacher';
      `
    }
    return true
  } catch (e) {
    console.error("adminChangeCredentials error", e)
    return false
  }
}

export async function adminDeleteTeacher(teacherId: string) {
  try {
    await sql`DELETE FROM users WHERE id = ${teacherId} AND role = 'teacher';`
    return true
  } catch (e) {
    console.error("adminDeleteTeacher error", e)
    return false
  }
}

/**
 * Improved login UX: returns structured errors for invalid credentials,
 * and redirects on success. Used with useActionState in the client.
 */
export async function passwordLogin(
  _prevState: PasswordLoginState | undefined,
  formData: FormData,
): Promise<PasswordLoginState | void> {
  const identifier = String(formData.get("identifier") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  // Basic validation
  const fieldErrors: Record<string, string> = {}
  if (!identifier) fieldErrors.identifier = "Please enter your username, email, or phone."
  if (!password) fieldErrors.password = "Please enter your password."
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Please correct the errors below.", fieldErrors }
  }

  // Fetch user by identifier
  // NOTE: Only selecting columns that are guaranteed to exist.
  const rows = (await sql`
    SELECT id, role, username, email, phone, password_hash
    FROM users
    WHERE username = ${identifier} OR email = ${identifier} OR phone = ${identifier}
    LIMIT 1;
  `) as any[]

  const user = rows[0]
  // Uniform error message to avoid leaking which part was wrong
  const invalidResponse: PasswordLoginState = {
    ok: false,
    message: "Incorrect username or password.",
    fieldErrors: { identifier: undefined, password: undefined },
  }

  if (!user) {
    // Small delay to reduce brute-force speed without impacting UX
    await new Promise((r) => setTimeout(r, 300))
    return invalidResponse
  }

  const stored = user.password_hash as string | null
  let match = false
  if (stored?.startsWith("$2")) {
    match = await bcrypt.compare(password, stored)
  } else {
    match = stored === password
  }

  if (!match) {
    await new Promise((r) => setTimeout(r, 300))
    return invalidResponse
  }

  // Success: create session and redirect based on role
  const sessionId = "sess_" + randomUUID()
  await sql`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (${sessionId}, ${user.id}, NOW() + INTERVAL '365 days', NOW());
  `
    ; (await cookies()).set("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 31536000, // 365 days in seconds
      secure: process.env.NODE_ENV === "production",
    })

  // Redirect to appropriate dashboard
  redirect(user.role === "admin" ? "/admin" : user.role === "teacher" ? "/teacher" : "/student")
}

export async function logout() {
  try {
    const c = await cookies()
    const sid = c.get("session_id")?.value
    if (sid) {
      await sql`DELETE FROM sessions WHERE id = ${sid};`
    }
    c.delete("session_id")
    return { ok: true as const }
  } catch (e: any) {
    console.error("logout error", e)
    return { ok: false as const, error: e?.message ?? "Logout failed" }
  }
}
