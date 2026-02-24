"use server"

import { sql } from "@/server/db"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { put } from "@vercel/blob"
import { revalidatePath } from "next/cache"

async function requireUser() {
  const sessionId = (await cookies()).get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  return me
}

/**
 * Upload student profile picture
 */
export async function uploadProfilePicture(formData: FormData) {
  const me = await requireUser()
  if (!me || me.role !== 'student') {
    return { success: false, error: 'Only students can upload profile pictures' }
  }

  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image size must be less than 5MB' }
    }

    // Upload to Vercel Blob
    const blob = await put(`profile-pictures/${me.id}-${Date.now()}.${file.name.split('.').pop()}`, file, {
      access: 'public',
    })

    // Update user avatar_url
    await sql`
      UPDATE users
      SET avatar_url = ${blob.url}
      WHERE id = ${me.id}
    `

    revalidatePath('/student')
    revalidatePath('/community-chat')
    revalidatePath('/photos')

    return { success: true, url: blob.url }
  } catch (error: any) {
    console.error('Error uploading profile picture:', error)
    return { success: false, error: error.message || 'Failed to upload profile picture' }
  }
}

/**
 * Remove student profile picture
 */
export async function removeProfilePicture() {
  const me = await requireUser()
  if (!me || me.role !== 'student') {
    return { success: false, error: 'Only students can remove profile pictures' }
  }

  try {
    await sql`
      UPDATE users
      SET avatar_url = NULL
      WHERE id = ${me.id}
    `

    revalidatePath('/student')
    revalidatePath('/community-chat')
    revalidatePath('/photos')

    return { success: true }
  } catch (error: any) {
    console.error('Error removing profile picture:', error)
    return { success: false, error: error.message || 'Failed to remove profile picture' }
  }
}

/**
 * Get student profile info
 */
export async function getStudentProfile() {
  const me = await requireUser()
  if (!me || me.role !== 'student') {
    return { success: false, error: 'Only students can view their profile' }
  }

  try {
    const rows = await sql`
      SELECT id, name, email, grade, avatar_url, created_at
      FROM users
      WHERE id = ${me.id}
    `

    if (rows.length === 0) {
      return { success: false, error: 'Profile not found' }
    }

    return { success: true, profile: rows[0] }
  } catch (error: any) {
    console.error('Error getting student profile:', error)
    return { success: false, error: error.message || 'Failed to get profile' }
  }
}
