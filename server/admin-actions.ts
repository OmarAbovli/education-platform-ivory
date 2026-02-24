"use server"

import { sql } from "@/server/db"
import { randomUUID, randomBytes } from "crypto"
import bcrypt from "bcryptjs"

// Helper: Convert to URL-safe base64 (avoid "base64url" runtime differences)
function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

type CreateTeacherCoreInput = {
  name: string
  email?: string
  phone: string
  subject?: string
  bio?: string
  avatarUrl?: string
  themePrimary?: string
  themeSecondary?: string
}

function randomUsername() {
  const token = base64Url(randomBytes(10))
  return ("tfk_" + token)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 16)
    .toLowerCase()
}

function randomPassword() {
  const token = base64Url(randomBytes(12))
  return token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 14)
}

// Core insert that returns credentials or an error message
async function createTeacherCore(input: CreateTeacherCoreInput) {
  // Normalize inputs: empty email -> NULL so it does not conflict with UNIQUE(email)
  const emailTrimmed = input.email?.trim() ?? ""
  const safeEmail: string | null = emailTrimmed.length > 0 ? emailTrimmed : null

  const phoneTrimmed = input.phone?.trim() ?? ""
  const safePhone: string | null = phoneTrimmed.length > 0 ? phoneTrimmed : null

  const subject = input.subject?.trim() || null
  const bio = input.bio?.trim() || null
  const avatarUrl = input.avatarUrl?.trim() || null
  const themePrimary = input.themePrimary ?? null
  const themeSecondary = input.themeSecondary ?? null

  const password = randomPassword()
  const hash = await bcrypt.hash(password, 10)

  let attempts = 0
  while (attempts < 7) {
    const id = "t_" + randomUUID()
    const username = randomUsername()
    try {
      await sql`
        INSERT INTO users (
          id, role, name, email, phone, subject, bio, avatar_url,
          theme_primary, theme_secondary, username, password_hash
        )
        VALUES (
          ${id},
          'teacher',
          ${input.name},
          ${safeEmail},
          ${safePhone},
          ${subject},
          ${bio},
          ${avatarUrl},
          ${themePrimary},
          ${themeSecondary},
          ${username},
          ${hash}
        );
      `
      return { ok: true as const, teacherId: id, username, password }
    } catch (e: any) {
      // 23505 = unique_violation
      const code = String(e?.code ?? "")
      const constraint = String(e?.constraint ?? "")
      const msg = String(e?.message ?? "")
      if (code === "23505") {
        if (constraint.includes("users_email") || msg.includes("users_email_key")) {
          return { ok: false as const, error: "Email already in use. Use a different email or leave it blank." }
        }
        if (constraint.includes("users_username") || msg.includes("users_username_key")) {
          attempts++
          continue
        }
      }
      // Surface other errors
      return { ok: false as const, error: e?.message ?? "DB Error" }
    }
  }

  return { ok: false as const, error: "Could not generate a unique username. Please try again." }
}

// Server Action to be used with useActionState (models expected errors as return values)
export type CreateTeacherState =
  | {
      ok: true
      username: string
      password: string
      message?: string
    }
  | {
      ok: false
      message: string
    }
  | undefined

export async function createTeacherAction(
  _prevState: CreateTeacherState,
  formData: FormData,
): Promise<CreateTeacherState> {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const subject = String(formData.get("subject") ?? "").trim()
  const bio = String(formData.get("bio") ?? "").trim()
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim()
  const themePrimary = String(formData.get("themePrimary") ?? "#10b981")
  const themeSecondary = String(formData.get("themeSecondary") ?? "#14b8a6")

  if (!name || !phone) {
    return { ok: false, message: "Name and phone are required." }
  }

  const res = await createTeacherCore({
    name,
    email: email.length > 0 ? email : undefined,
    phone,
    subject: subject.length > 0 ? subject : undefined,
    bio: bio.length > 0 ? bio : undefined,
    avatarUrl: avatarUrl.length > 0 ? avatarUrl : undefined,
    themePrimary,
    themeSecondary,
  })

  if (res.ok) {
    return {
      ok: true,
      username: res.username,
      password: res.password,
      message: "Teacher created. Share credentials securely.",
    }
  }

  return { ok: false, message: res.error ?? "Failed to create teacher." }
}

// Existing admin APIs (unchanged)
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
  } catch (e) {
    console.error("adminDeleteTeacher error", e)
    return false
  }
  return true
}

/* ========== Students management for Super Admin ========== */

export type AccessTeacher = { id: string; name: string | null }
export type Student = {
  id: string
  name: string | null
  username: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  created_at?: string
  // New fields for Super Admin view:
  creator_teacher_id?: string | null
  creator_teacher_name?: string | null
  access_teachers?: AccessTeacher[]
}

async function hasColumn(table: string, column: string) {
  try {
    const rows = (await sql`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
      LIMIT 1;
    `) as any[]
    return rows.length > 0
  } catch {
    return false
  }
}

async function loadCreatorByColumn(studentIds: string[], columnName: string) {
  // Requires that the column exists. Joins to users (teachers) to fetch creator name.
  const rows = (await sql`
    SELECT s.id AS student_id, s.${sql.raw(columnName)}::text AS creator_id, t.name AS creator_name
    FROM users s
    LEFT JOIN users t ON t.id = s.${sql.raw(columnName)}
    WHERE s.role = 'student' AND s.id = ANY(${studentIds});
  `) as any[]
  const map = new Map<string, { id: string | null; name: string | null }>()
  for (const r of rows) {
    map.set(r.student_id, { id: r.creator_id ?? null, name: r.creator_name ?? null })
  }
  return map
}

async function loadCreatorFromVideoAccess(studentIds: string[]) {
  try {
    const rows = (await sql`
      WITH ranked AS (
        SELECT
          va.student_id,
          va.teacher_id,
          ROW_NUMBER() OVER (PARTITION BY va.student_id ORDER BY va.created_at ASC) AS rn
        FROM video_access va
        WHERE va.student_id = ANY(${studentIds})
      )
      SELECT r.student_id, r.teacher_id AS creator_id, t.name AS creator_name
      FROM ranked r
      JOIN users t ON t.id = r.teacher_id
      WHERE r.rn = 1;
    `) as any[]
    const map = new Map<string, { id: string | null; name: string | null }>()
    for (const r of rows) {
      map.set(r.student_id, { id: r.creator_id ?? null, name: r.creator_name ?? null })
    }
    return map
  } catch {
    return new Map<string, { id: string | null; name: string | null }>()
  }
}

async function loadAccessTeachers(studentIds: string[]) {
  try {
    const rows = (await sql`
      SELECT
        va.student_id,
        json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name) AS teachers
      FROM video_access va
      JOIN users t ON t.id = va.teacher_id
      WHERE va.student_id = ANY(${studentIds})
      GROUP BY va.student_id;
    `) as any[]
    const map = new Map<string, AccessTeacher[]>()
    for (const r of rows) {
      const items = Array.isArray(r.teachers)
        ? (r.teachers as any[]).map((x) => ({ id: String(x.id), name: x.name ?? null }))
        : []
      map.set(r.student_id, items)
    }
    return map
  } catch {
    return new Map<string, AccessTeacher[]>()
  }
}

export async function getStudentsList(q?: string) {
  try {
    const whereSearch =
      q && q.trim().length > 0
        ? sql`AND (name ILIKE ${"%" + q.trim() + "%"} OR username ILIKE ${"%" + q.trim() + "%"} OR email ILIKE ${
            "%" + q.trim() + "%"
          } OR phone ILIKE ${"%" + q.trim() + "%"})`
        : sql``

    const students = (await sql`
      SELECT id, name, username, email, phone, avatar_url, created_at
      FROM users
      WHERE role = 'student'
      ${whereSearch}
      ORDER BY created_at DESC
      LIMIT 200;
    `) as any[]

    const ids = students.map((s) => s.id) as string[]
    if (ids.length === 0) return [] as Student[]

    // Load permissions-with (teachers who granted access)
    const accessMap = await loadAccessTeachers(ids)

    // Determine creator:
    // Prefer a dedicated creator column on users if available; else fall back to earliest access.
    const creatorColumnCandidates = ["created_by_teacher_id", "created_by", "owner_teacher_id", "teacher_id"]
    let creatorMap = new Map<string, { id: string | null; name: string | null }>()
    for (const col of creatorColumnCandidates) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await hasColumn("users", col)
      if (exists) {
        // eslint-disable-next-line no-await-in-loop
        creatorMap = await loadCreatorByColumn(ids, col)
        break
      }
    }
    if (creatorMap.size === 0) {
      creatorMap = await loadCreatorFromVideoAccess(ids)
    }

    // Merge enriched fields
    const enriched: Student[] = students.map((s) => {
      const creator = creatorMap.get(s.id)
      const teachers = accessMap.get(s.id) ?? []
      return {
        id: s.id,
        name: s.name ?? null,
        username: s.username ?? null,
        email: s.email ?? null,
        phone: s.phone ?? null,
        avatar_url: s.avatar_url ?? null,
        created_at: s.created_at ?? undefined,
        creator_teacher_id: creator?.id ?? null,
        creator_teacher_name: creator?.name ?? null,
        access_teachers: teachers,
      }
    })
    return enriched
  } catch (e) {
    console.error("getStudentsList error", e)
    return []
  }
}

export type UpdateStudentState = { ok: true; message?: string } | { ok: false; message: string } | undefined

export async function adminUpdateStudentAction(
  _prev: UpdateStudentState,
  formData: FormData,
): Promise<UpdateStudentState> {
  const id = String(formData.get("id") ?? "")
  if (!id) return { ok: false, message: "Missing student id." }

  const name = (formData.get("name") as string | null)?.trim() || null
  const username = (formData.get("username") as string | null)?.trim() || null
  const email = (formData.get("email") as string | null)?.trim() || null
  const phone = (formData.get("phone") as string | null)?.trim() || null
  try {
    await sql`
      UPDATE users
      SET
        name = COALESCE(${name}, name),
        username = COALESCE(${username}, username),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone)
      WHERE id = ${id} AND role = 'student';
    `
    return { ok: true, message: "Student updated." }
  } catch (e: any) {
    const code = String(e?.code ?? "")
    if (code === "23505") {
      return { ok: false, message: "Username or email already in use." }
    }
    return { ok: false, message: e?.message ?? "Failed to update student." }
  }
}