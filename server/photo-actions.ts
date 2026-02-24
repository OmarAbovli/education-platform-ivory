"use server"

import { sql } from "@/server/db"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

type CreatePhotoInput = {
  url: string
  caption?: string | null
}

function genId() {
  try {
    // @ts-ignore
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

async function requireUser() {
  const sessionId = (await cookies()).get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  return me
}

/**
 * Teachers can create a photo with a public URL and optional caption.
 * This matches the call-site: createPhoto({ url, caption })
 */
export async function createPhoto(input: CreatePhotoInput) {
  const me = await requireUser()
  if (!me || me.role !== "teacher") {
    throw new Error("Only teachers can upload photos")
  }

  const id = genId()
  const caption = (input.caption ?? "").toString().slice(0, 1000)

  await sql`
    INSERT INTO photos (id, teacher_id, url, caption)
    VALUES (${id}, ${me.id}, ${input.url}, ${caption})
  `

  // Make sure the Teacher dashboard updates immediately
  revalidatePath("/teacher")
  // And the public gallery if you have one
  revalidatePath("/photos")

  return { id }
}

/**
 * Any authenticated user can like/unlike a photo.
 */
export async function toggleLike(photoId: string) {
  const me = await requireUser()
  if (!me) {
    return { ok: false as const, status: 401, message: "Not authenticated." }
  }

  try {
    const existing = (await sql`
      SELECT 1 FROM photo_likes WHERE photo_id = ${photoId} AND user_id = ${me.id} LIMIT 1;
    `) as any[]

    if (existing.length > 0) {
      await sql`DELETE FROM photo_likes WHERE photo_id = ${photoId} AND user_id = ${me.id};`
    } else {
      await sql`INSERT INTO photo_likes (photo_id, user_id) VALUES (${photoId}, ${me.id});`
    }

    const [{ cnt }] = (await sql`
      SELECT COUNT(*)::int AS cnt FROM photo_likes WHERE photo_id = ${photoId};
    `) as any[]

    revalidatePath("/photos")
    return { ok: true as const, count: Number(cnt) }
  } catch (e) {
    console.error("toggleLike error", e)
    return { ok: false as const, status: 500, message: "Failed to toggle like." }
  }
}

/**
 * Any authenticated user can comment on a photo.
 */
export async function addComment(photoId: string, body: string) {
  const me = await requireUser()
  if (!me) {
    return { ok: false as const, status: 401, message: "Not authenticated." }
  }

  const text = (body ?? "").toString().trim()
  if (!text) return { ok: false as const, status: 400, message: "Comment cannot be empty." }
  if (text.length > 2000) return { ok: false as const, status: 400, message: "Comment too long." }

  try {
    const [row] = (await sql`
      INSERT INTO photo_comments (id, photo_id, user_id, body)
      VALUES (${genId()}, ${photoId}, ${me.id}, ${text})
      RETURNING id, photo_id, user_id, body, created_at;
    `) as any[]

    const [u] = (await sql`
      SELECT name AS user_name, avatar_url AS user_avatar_url
      FROM users WHERE id = ${me.id} LIMIT 1;
    `) as any[]

    revalidatePath("/photos")
    return { ok: true as const, comment: { ...row, ...u } }
  } catch (e) {
    console.error("addComment error", e)
    return { ok: false as const, status: 500, message: "Failed to add comment." }
  }
}

// ==================== NEW: Photo Upload with Approval System ====================

/**
 * Student uploads a photo (goes to pending approval)
 */
export async function uploadPhotoForApproval(input: {
  imageUrl: string
  caption?: string
  uploadType: 'gallery' | 'chat'
  teacherId: string
}) {
  const me = await requireUser()
  if (!me || me.role !== 'student') {
    return { success: false, error: 'Only students can upload photos for approval' }
  }

  try {
    const result = await sql`
      INSERT INTO photo_uploads (
        student_id, teacher_id, image_url, caption, status, upload_type
      )
      VALUES (
        ${me.id}, ${input.teacherId}, ${input.imageUrl}, 
        ${input.caption || null}, 'pending', ${input.uploadType}
      )
      RETURNING id
    `

    const photoId = result[0].id

    // Create notification for teacher
    await sql`
      INSERT INTO photo_notifications (photo_id, user_id, notification_type)
      VALUES (${photoId}, ${input.teacherId}, 'upload_pending')
    `

    // For chat uploads, auto-approve
    if (input.uploadType === 'chat') {
      await approvePhotoUpload(photoId)
    }

    revalidatePath('/teacher/photos')
    revalidatePath('/photos')
    
    return { success: true, photoId }
  } catch (error) {
    console.error('Error uploading photo:', error)
    return { success: false, error: 'Failed to upload photo' }
  }
}

/**
 * Teacher approves a photo upload
 */
export async function approvePhotoUpload(photoId: string) {
  const me = await requireUser()
  if (!me || me.role !== 'teacher') {
    return { success: false, error: 'Only teachers can approve photos' }
  }

  try {
    // Get photo details
    const photos = await sql`
      SELECT student_id, image_url, caption, teacher_id
      FROM photo_uploads
      WHERE id = ${photoId} AND teacher_id = ${me.id}
    `

    if (photos.length === 0) {
      return { success: false, error: 'Photo not found' }
    }

    const photo = photos[0]

    // Update status to approved
    await sql`
      UPDATE photo_uploads
      SET status = 'approved', reviewed_at = NOW(), updated_at = NOW()
      WHERE id = ${photoId}
    `

    // Try to add to main photos table
    try {
      const photoRecordId = genId()
      
      // Get student info to use as the uploader
      const students = await sql`
        SELECT id, name FROM users WHERE id = ${photo.student_id}
      `
      
      // Insert photo with student as the owner/uploader
      await sql`
        INSERT INTO photos (id, teacher_id, url, caption, uploader_name, uploader_id)
        VALUES (
          ${photoRecordId}, 
          ${photo.teacher_id}, 
          ${photo.image_url}, 
          ${photo.caption || ''},
          ${students[0]?.name || 'طالب'},
          ${photo.student_id}
        )
      `
    } catch (photoInsertError) {
      console.log('Photos table insert skipped (table may not exist):', photoInsertError)
      // Continue anyway - the photo is approved in photo_uploads
    }

    // Create notification for student
    try {
      await sql`
        INSERT INTO photo_notifications (photo_id, user_id, notification_type)
        VALUES (${photoId}, ${photo.student_id}, 'approved')
      `
    } catch (notifError) {
      console.log('Photo notification insert error:', notifError)
    }

    // Create general notification if notifications table exists
    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
          ${photo.student_id}, 
          'photo_approved',
          'تم قبول صورتك',
          'تم قبول الصورة التي قمت برفعها وأصبحت متاحة في المعرض'
        )
      `
    } catch (notifError) {
      console.log('General notification insert error:', notifError)
    }

    revalidatePath('/teacher/photos')
    revalidatePath('/photos')
    revalidatePath('/student')
    
    return { success: true }
  } catch (error: any) {
    console.error('Error approving photo:', error)
    return { success: false, error: error.message || 'Failed to approve photo' }
  }
}

/**
 * Teacher rejects a photo upload
 */
export async function rejectPhotoUpload(photoId: string, reason?: string) {
  const me = await requireUser()
  if (!me || me.role !== 'teacher') {
    return { success: false, error: 'Only teachers can reject photos' }
  }

  try {
    // Get student ID
    const photos = await sql`
      SELECT student_id FROM photo_uploads
      WHERE id = ${photoId} AND teacher_id = ${me.id}
    `

    if (photos.length === 0) {
      return { success: false, error: 'Photo not found' }
    }

    const studentId = photos[0].student_id

    // Update status to rejected
    await sql`
      UPDATE photo_uploads
      SET status = 'rejected', rejection_reason = ${reason || null}, 
          reviewed_at = NOW(), updated_at = NOW()
      WHERE id = ${photoId}
    `

    // Create notification for student
    try {
      await sql`
        INSERT INTO photo_notifications (photo_id, user_id, notification_type)
        VALUES (${photoId}, ${studentId}, 'rejected')
      `
    } catch (notifError) {
      console.log('Photo notification insert error:', notifError)
    }

    // Create general notification
    try {
      const message = reason 
        ? `تم رفض الصورة. السبب: ${reason}`
        : 'تم رفض الصورة التي قمت برفعها'
      
      await sql`
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
          ${studentId}, 
          'photo_rejected',
          'تم رفض صورتك',
          ${message}
        )
      `
    } catch (notifError) {
      console.log('General notification insert error:', notifError)
    }

    revalidatePath('/teacher/photos')
    revalidatePath('/photos')
    revalidatePath('/student')
    
    return { success: true }
  } catch (error) {
    console.error('Error rejecting photo:', error)
    return { success: false, error: 'Failed to reject photo' }
  }
}

/**
 * Get pending photo uploads for teacher
 */
export async function getPendingPhotoUploads() {
  const me = await requireUser()
  if (!me || me.role !== 'teacher') {
    return { success: false, error: 'Only teachers can view pending uploads' }
  }

  try {
    const uploads = await sql`
      SELECT 
        pu.id,
        pu.image_url,
        pu.caption,
        pu.upload_type,
        pu.created_at,
        u.name as student_name,
        u.grade as student_grade,
        u.avatar_url as student_avatar
      FROM photo_uploads pu
      JOIN users u ON pu.student_id = u.id
      WHERE pu.teacher_id = ${me.id} AND pu.status = 'pending'
      ORDER BY pu.created_at DESC
    `

    return { success: true, uploads }
  } catch (error) {
    console.error('Error getting pending uploads:', error)
    return { success: false, error: 'Failed to get pending uploads' }
  }
}

/**
 * Get student's photo upload history
 */
export async function getMyPhotoUploads() {
  const me = await requireUser()
  if (!me || me.role !== 'student') {
    return { success: false, error: 'Only students can view their uploads' }
  }

  try {
    const uploads = await sql`
      SELECT 
        id,
        image_url,
        caption,
        status,
        upload_type,
        rejection_reason,
        created_at,
        reviewed_at
      FROM photo_uploads
      WHERE student_id = ${me.id}
      ORDER BY created_at DESC
    `

    return { success: true, uploads }
  } catch (error) {
    console.error('Error getting uploads:', error)
    return { success: false, error: 'Failed to get uploads' }
  }
}

/**
 * Teacher deletes a photo from the main gallery
 * Teacher can delete any photo uploaded under their account (including student uploads they approved)
 */
export async function deletePhoto(photoId: string) {
  const me = await requireUser()
  if (!me || me.role !== 'teacher') {
    return { success: false, error: 'Only teachers can delete photos' }
  }

  try {
    // Delete from photos table (teacher can delete photos under their account)
    await sql`
      DELETE FROM photos
      WHERE id = ${photoId} AND teacher_id = ${me.id}
    `

    revalidatePath('/photos')
    revalidatePath('/teacher/photos')
    
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting photo:', error)
    return { success: false, error: error.message || 'Failed to delete photo' }
  }
}
