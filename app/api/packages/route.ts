import { NextResponse } from "next/server"
import { sql } from "@/server/db"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const teacherId = url.searchParams.get("teacherId")
    const gradeParam = url.searchParams.get("grade")
    const grade = gradeParam ? Number(gradeParam) : null

    if (!grade || !Number.isFinite(grade)) {
      return NextResponse.json(
        { error: "missing_or_invalid_grade" },
        { status: 400 },
      )
    }

    const includeUngraded = grade === 1
    const gradeCondition = includeUngraded
      ? sql`
          (
            (grades IS NOT NULL AND ${grade} = ANY(grades))
            OR grades IS NULL
            OR array_length(grades, 1) = 0
          )
        `
      : sql`
          grades IS NOT NULL AND ${grade} = ANY(grades)
        `

    let rows: any[]

    if (teacherId) {
      rows = (await sql`
        SELECT id, teacher_id, name, description, price, thumbnail_url, grades
        FROM packages
        WHERE teacher_id = ${teacherId}
          AND ${gradeCondition}
        ORDER BY created_at ASC;
      `) as any[]
    } else {
      rows = (await sql`
        SELECT id, teacher_id, name, description, price, thumbnail_url, grades
        FROM packages
        WHERE ${gradeCondition}
        ORDER BY created_at ASC;
      `) as any[]
    }

    return NextResponse.json(rows)
  } catch (error) {
    console.error("Failed to fetch packages:", error)
    return NextResponse.json({ error: "failed_to_fetch_packages" }, { status: 500 })
  }
}
