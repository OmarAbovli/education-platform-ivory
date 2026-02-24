'use server'

import { sql } from '@/server/db'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'

export type Notification = {
  id: string
  message: string
  url: string | null
  is_read: boolean
  created_at: string
}

export async function getMyNotifications(): Promise<Notification[]> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session_id')?.value
  const user = await getCurrentUser(sessionCookie)
  if (!user) return []

  try {
    const notifications = (await sql`
      SELECT id, message, url, is_read, created_at
      FROM notifications
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 20;
    `) as any[]
    return notifications
  } catch (e) {
    console.error('Failed to fetch notifications:', e)
    return []
  }
}

export async function markMyNotificationsAsRead() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session_id')?.value
  const user = await getCurrentUser(sessionCookie)
  if (!user) return { ok: false, error: 'Not authenticated' }

  try {
    await sql`
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = ${user.id} AND is_read = FALSE;
    `
    return { ok: true as const }
  } catch (e: any) {
    console.error('Failed to mark notifications as read:', e)
    return { ok: false as const, error: e.message }
  }
}
