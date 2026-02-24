"use server"

import { sql } from "@/server/db"
import { randomUUID } from "crypto"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"

export type VideoPackage = {
  id: string
  teacher_id: string
  name: string
  description: string | null
  price: number
  thumbnail_url: string | null
  grades: number[] | null
  created_at: string
}

type CreatePackageInput = {
  name: string
  description?: string
  price: number
  thumbnailUrl?: string
  grades?: number[]
}

type UpdatePackageInput = {
  name?: string
  description?: string
  price?: number
  thumbnailUrl?: string
  grades?: number[]
}

async function requireTeacherId() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  if (!me || me.role !== "teacher") {
    throw new Error("Not authorized: teacher access required")
  }
  return me.id
}

export async function createPackage(input: CreatePackageInput) {
  try {
    const teacherId = await requireTeacherId()
    const id = randomUUID()

    await sql`
      INSERT INTO packages (id, teacher_id, name, description, price, thumbnail_url, grades)
      VALUES (
        ${id},
        ${teacherId},
        ${input.name},
        ${input.description ?? null},
        ${input.price},
        ${input.thumbnailUrl ?? null},
        ${input.grades && input.grades.length > 0 ? input.grades : null}
      );
    `
    return { ok: true as const, packageId: id }
  } catch (e: any) {
    console.error("createPackage error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function updatePackage(packageId: string, updates: UpdatePackageInput) {
  try {
    const teacherId = await requireTeacherId()

    const rows = (await sql`
      UPDATE packages
      SET
        name = COALESCE(${updates.name}, name),
        description = COALESCE(${updates.description}, description),
        price = COALESCE(${updates.price}, price),
        thumbnail_url = COALESCE(${updates.thumbnailUrl}, thumbnail_url),
        grades = CASE WHEN ${updates.grades !== undefined} THEN ${updates.grades && updates.grades.length > 0 ? updates.grades : null} ELSE grades END
      WHERE id = ${packageId} AND teacher_id = ${teacherId}
      RETURNING id;
    `) as any[]

    if (!rows[0]) {
      return { ok: false, error: "Package not found or unauthorized" }
    }

    return { ok: true as const }
  } catch (e: any) {
    console.error("updatePackage error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function deletePackage(packageId: string) {
  try {
    const teacherId = await requireTeacherId()

    // Optional: Check if the package has videos and prevent deletion if it's not empty.
    // For now, we allow deleting it, and videos will have their package_id set to NULL.

    const rows = (await sql`
      DELETE FROM packages
      WHERE id = ${packageId} AND teacher_id = ${teacherId}
      RETURNING id;
    `) as any[]

    if (!rows[0]) {
      return { ok: false, error: "Package not found or unauthorized" }
    }

    return { ok: true as const }
  } catch (e: any) {
    console.error("deletePackage error", e)
    return { ok: false as const, error: e?.message ?? "DB Error" }
  }
}

export async function getTeacherPackages(): Promise<VideoPackage[]> {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      SELECT id, teacher_id, name, description, price, thumbnail_url, grades, created_at
      FROM packages
      WHERE teacher_id = ${teacherId}
      ORDER BY created_at DESC;
    `) as any[]
    return rows as VideoPackage[]
  } catch (e) {
    console.error("getTeacherPackages error", e)
    return []
  }
}

export async function getPackageById(packageId: string): Promise<VideoPackage | null> {
  try {
    const teacherId = await requireTeacherId()
    const rows = (await sql`
      SELECT id, teacher_id, name, description, price, thumbnail_url, grades, created_at
      FROM packages
      WHERE id = ${packageId} AND teacher_id = ${teacherId};
    `) as any[]
    return (rows[0] as VideoPackage) ?? null
  } catch (e) {
    console.error("getPackageById error", e)
    return null
  }
}
