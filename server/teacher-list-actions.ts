"use server"

import { sql } from "@/server/db"

export type Teacher = {
    id: string
    name: string
    subject: string | null
    bio: string | null
}

export async function getAvailableTeachers(): Promise<Teacher[]> {
    try {
        const teachers = await sql`
      SELECT id, name, subject, bio
      FROM users
      WHERE role = 'teacher'
      ORDER BY name ASC
    `
        return teachers as Teacher[]
    } catch (e) {
        console.error("getAvailableTeachers error", e)
        return []
    }
}
