"use server"

import { sql } from "@/server/db"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

function genId() {
    try {
        // @ts-ignore
        if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
    } catch { }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

async function requireUser() {
    const sessionId = (await cookies()).get("session_id")?.value
    const me = await getCurrentUser(sessionId)
    return me
}

/**
 * Any authenticated user can comment on a video.
 */
export async function addVideoComment(videoId: string, body: string) {
    const me = await requireUser()
    if (!me) {
        return { ok: false as const, status: 401, message: "يجب تسجيل الدخول لإضافة تعليق" }
    }

    const text = (body ?? "").toString().trim()
    if (!text) return { ok: false as const, status: 400, message: "لا يمكن إرسال تعليق فارغ" }
    if (text.length > 2000) return { ok: false as const, status: 400, message: "التعليق طويل جداً" }

    try {
        const id = genId()
        await sql`
      INSERT INTO video_comments (id, video_id, user_id, body)
      VALUES (${id}, ${videoId}, ${me.id}, ${text});
    `

        revalidatePath(`/watch/${videoId}`)
        return { ok: true as const }
    } catch (e) {
        console.error("addVideoComment error", e)
        return { ok: false as const, status: 500, message: "فشل في إضافة التعليق" }
    }
}

/**
 * Teachers and admins can delete any comment. Students can delete their own.
 */
export async function deleteVideoComment(commentId: string, videoId: string) {
    const me = await requireUser()
    if (!me) {
        return { ok: false as const, status: 401, message: "غير مصرح" }
    }

    try {
        // Admin and Teacher can delete any. Student can delete only theirs.
        if (me.role === "admin" || me.role === "teacher") {
            await sql`DELETE FROM video_comments WHERE id = ${commentId}`
        } else {
            await sql`DELETE FROM video_comments WHERE id = ${commentId} AND user_id = ${me.id}`
        }

        revalidatePath(`/watch/${videoId}`)
        return { ok: true as const }
    } catch (e) {
        console.error("deleteVideoComment error", e)
        return { ok: false as const, status: 500, message: "فشل في حذف التعليق" }
    }
}
