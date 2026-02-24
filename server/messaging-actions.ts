"use server"

import "server-only"
import { z } from "zod"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { sql } from "./db"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { ConversationSchema, MessageSchema, SendMessageSchema, CloseConversationSchema } from "@/lib/messaging-types"

// Helper to get the authenticated user in server actions
async function getAuthedUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionId)
  if (!user) throw new Error("User not authenticated")
  return user
}

//================================================================================
// MUTATIONS (Actions that change data)
//================================================================================

export async function sendMessage(payload: z.infer<typeof SendMessageSchema>) {
  const user = await getAuthedUser()
  const { conversationId, teacherId, studentId, studentIds, body } = SendMessageSchema.parse(payload)
  // If conversationId provided, ensure user is participant
  if (conversationId) {
    const check = await sql`SELECT 1 FROM conversations WHERE id = ${conversationId} AND (student_id = ${user.id} OR teacher_id = ${user.id}) LIMIT 1;`
    if (!check || check.length === 0) throw new Error("User not authorized to post to this conversation")

    await sql`
      INSERT INTO messages (id, conversation_id, sender_id, body)
      VALUES (${nanoid()}, ${conversationId}, ${user.id}, ${body})
    `

    try {
      if (user.role === 'teacher') {
        await sql`UPDATE conversations SET student_has_unread = TRUE, teacher_has_unread = FALSE, updated_at = NOW() WHERE id = ${conversationId}`
      } else {
        await sql`UPDATE conversations SET teacher_has_unread = TRUE, student_has_unread = FALSE, updated_at = NOW() WHERE id = ${conversationId}`
      }
    } catch (e) {
      // ignore
    }

    revalidatePath("/student")
    revalidatePath("/teacher/messages")
    return { success: true, conversationId }
  }

  // Starting new conversation(s)
  if (user.role === "student") {
    // Student starting conversation with a teacher (existing flow)
    if (!teacherId) throw new Error("teacherId is required to start a conversation")
    const existingConv = await sql`
      SELECT id FROM conversations WHERE student_id = ${user.id} AND teacher_id = ${teacherId}
    `
    let convId: string
    if (existingConv.length > 0) {
      convId = existingConv[0].id
    } else {
      convId = nanoid()
      await sql`
        INSERT INTO conversations (id, student_id, teacher_id, subject, status, teacher_has_unread)
        VALUES (${convId}, ${user.id}, ${teacherId}, ${body.substring(0, 50)}, 'pending_teacher_reply', TRUE)
      `
    }

    await sql`
      INSERT INTO messages (id, conversation_id, sender_id, body)
      VALUES (${nanoid()}, ${convId}, ${user.id}, ${body})
    `

    try {
      await sql`UPDATE conversations SET teacher_has_unread = TRUE, student_has_unread = FALSE, updated_at = NOW() WHERE id = ${convId}`
    } catch (e) {
      // ignore
    }

    revalidatePath("/student")
    revalidatePath("/teacher/messages")
    return { success: true, conversationId: convId }
  } else if (user.role === "teacher") {
    // Teacher starting conversation(s) with one or many students
    const targets: string[] = []
    if (studentIds && studentIds.length > 0) {
      targets.push(...studentIds)
    } else if (studentId) {
      targets.push(studentId)
    } else {
      throw new Error("studentId or studentIds is required for a teacher to start a conversation")
    }

    const createdConversationIds: string[] = []
    for (const sid of targets) {
      // Ensure the student exists
      const studentRow = await sql`SELECT id FROM users WHERE id = ${sid} AND role = 'student' LIMIT 1;`
      if (!studentRow || studentRow.length === 0) continue

      // Restrict to subscribed students only
      const sub = (await sql`
        SELECT 1 FROM teacher_subscriptions WHERE student_id = ${sid} AND teacher_id = ${user.id} AND status = 'active' LIMIT 1;
      `) as any[]
      if (!sub || sub.length === 0) {
        // skip non-subscribed students
        continue
      }

      const existingConv = await sql`
        SELECT id FROM conversations WHERE student_id = ${sid} AND teacher_id = ${user.id}
      `
      let convId: string
      if (existingConv.length > 0) {
        convId = existingConv[0].id
      } else {
        convId = nanoid()
        await sql`
          INSERT INTO conversations (id, student_id, teacher_id, subject, status, student_has_unread)
          VALUES (${convId}, ${sid}, ${user.id}, ${body.substring(0, 50)}, 'pending_teacher_reply', TRUE)
        `
      }

      await sql`
        INSERT INTO messages (id, conversation_id, sender_id, body)
        VALUES (${nanoid()}, ${convId}, ${user.id}, ${body})
      `

      try {
        await sql`UPDATE conversations SET student_has_unread = TRUE, teacher_has_unread = FALSE, updated_at = NOW() WHERE id = ${convId}`
      } catch (e) {
        // ignore
      }

      createdConversationIds.push(convId)
    }

    revalidatePath("/student")
    revalidatePath("/teacher/messages")
    return { success: true, conversationId: createdConversationIds[0] ?? null, conversationIds: createdConversationIds }
  } else {
    throw new Error("Only students or teachers can start conversations")
  }
}

export async function closeConversation(payload: z.infer<typeof CloseConversationSchema>) {
  const user = await getAuthedUser()
  if (user.role === "student") {
    throw new Error("Only teachers or admins can close conversations.")
  }
  const { conversationId } = CloseConversationSchema.parse(payload)
  await sql`
    UPDATE conversations SET status = 'closed' WHERE id = ${conversationId}
  `
  revalidatePath("/teacher/messages")
  return { success: true }
}


//================================================================================
// QUERIES (Actions that read data, made available to the client)
//================================================================================

export async function getConversationsForUser() {
  const user = await getAuthedUser()
  const isStudent = user.role === "student"
  const participantIdColumn = isStudent ? sql`c.teacher_id` : sql`c.student_id`
  const userIdColumn = isStudent ? sql`c.student_id` : sql`c.teacher_id`

  const conversations = await sql`
    SELECT c.*,
           json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url) AS participant,
           (SELECT json_build_object('body', m.body, 'created_at', m.created_at)
            FROM messages m WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN users p ON p.id = ${participantIdColumn}
    WHERE ${userIdColumn} = ${user.id}
    ORDER BY c.updated_at DESC
  `
  return z.array(ConversationSchema).parse(conversations)
}

export async function getMessagesForConversation(conversationId: string) {
  const user = await getAuthedUser()
  const convCheck = await sql`SELECT 1 FROM conversations WHERE id = ${conversationId} AND (student_id = ${user.id} OR teacher_id = ${user.id})`
  if (convCheck.length === 0) {
    throw new Error("User not authorized to view this conversation")
  }

  const unreadColumn = user.role === 'student' ? sql`student_has_unread` : sql`teacher_has_unread`
  await sql`UPDATE conversations SET ${unreadColumn} = FALSE WHERE id = ${conversationId}`

  const messages = await sql`
    SELECT m.*, json_build_object('name', u.name, 'avatar_url', u.avatar_url) AS sender
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
  `
  return z.array(MessageSchema).parse(messages)
}

export async function getUnreadConversationCount() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionId)
  if (!user) return 0

  const unreadColumn = user.role === 'student' ? sql`student_has_unread` : sql`teacher_has_unread`
  const userIdColumn = user.role === 'student' ? sql`student_id` : sql`teacher_id`

  const result = await sql`
    SELECT COUNT(*) FROM conversations WHERE ${unreadColumn} = TRUE AND ${userIdColumn} = ${user.id}
  `
  return parseInt(result[0].count, 10)
}

export async function getSubscribedTeachers() {
  const user = await getAuthedUser()
  if (user.role !== 'student') {
    throw new Error("Only students can perform this action.")
  }

  const teachers = await sql`
    SELECT u.id, u.name, u.avatar_url
    FROM teacher_subscriptions ts
    JOIN users u ON u.id = ts.teacher_id
    WHERE ts.student_id = ${user.id} AND ts.status = 'active'
    ORDER BY u.name ASC;
  `
  return z.array(z.object({ id: z.string(), name: z.string().nullable(), avatar_url: z.string().nullable() })).parse(teachers)
}
