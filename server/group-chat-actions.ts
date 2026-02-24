"use server"

import "server-only"
import { z } from "zod"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { sql } from "./db"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

async function getAuthedUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionId)
  if (!user) throw new Error("User not authenticated")
  return user
}

const SendGroupMessageSchema = z.object({
  grade: z.number().int().min(1),
  body: z.string().min(1),
})

export async function sendGroupMessage(payload: z.infer<typeof SendGroupMessageSchema>) {
  const user = await getAuthedUser()
  const { grade, body } = SendGroupMessageSchema.parse(payload)

  const id = nanoid()
  await sql`
    INSERT INTO group_messages (id, grade, sender_id, body)
    VALUES (${id}, ${grade}, ${user.id}, ${body})
  `

  // simple revalidate so students/teachers see updates
  revalidatePath("/community-chat")
  revalidatePath("/teacher/community-chat")
  return { success: true, id }
}

export async function getGroupMessages(grade: number) {
  const user = await getAuthedUser()
  // authorization: students can view their grade only, teachers can view any
  if (user.role === 'student') {
    // check student's grade
    const row = await sql`SELECT grade FROM users WHERE id = ${user.id} LIMIT 1`
    if (!row || row.length === 0) throw new Error("Student not found")
    const myGrade = row[0].grade
    if (myGrade !== grade) throw new Error("Not authorized to view this grade chat")
  }

  const rows = await sql`
    SELECT gm.*, json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) AS sender
    FROM group_messages gm
    JOIN users u ON u.id = gm.sender_id
    WHERE gm.grade = ${grade}
    ORDER BY gm.created_at ASC
    LIMIT 100
  `
  return rows
}

export async function getMyGradesForTeacher() {
  const user = await getAuthedUser()
  if (user.role !== 'teacher') throw new Error("Only teachers can perform this action")
  // teacher_subscriptions doesn't store grade directly; infer grades from subscribed students
  const rows = await sql`
    SELECT DISTINCT u.grade as grade
    FROM teacher_subscriptions ts
    JOIN users u ON u.id = ts.student_id
    WHERE ts.teacher_id = ${user.id} AND ts.status = 'active' AND u.grade IS NOT NULL
    ORDER BY u.grade ASC
  `
  return rows.map((r: any) => r.grade).filter(Boolean)
}

export async function getMyGradesAndLastActiveForTeacher() {
  const user = await getAuthedUser()
  if (user.role !== 'teacher') throw new Error("Only teachers can perform this action")

  const rows = await sql`
    SELECT DISTINCT u.grade as grade
    FROM teacher_subscriptions ts
    JOIN users u ON u.id = ts.student_id
    WHERE ts.teacher_id = ${user.id} AND ts.status = 'active' AND u.grade IS NOT NULL
    ORDER BY u.grade ASC
  `
  const grades = rows.map((r: any) => r.grade).filter(Boolean)

  if (grades.length === 0) return { grades, lastActiveGrade: null }

  // Find the most recent message among these grades
  const last = await sql`
    SELECT gm.grade
    FROM group_messages gm
    WHERE gm.grade = ANY(${grades})
    ORDER BY gm.created_at DESC
    LIMIT 1
  `
  const lastActiveGrade = last && last[0] ? last[0].grade : null
  return { grades, lastActiveGrade }
}
