import { NextResponse } from "next/server";
import { sql } from "@/server/db";

export async function GET() {
  try {
    const teachers = await sql`
      SELECT id, name, subject, avatar_url, phone
      FROM users
      WHERE role = 'teacher'
      ORDER BY name;
    `;
    return NextResponse.json(teachers);
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    return NextResponse.json(
      { error: "Failed to fetch teachers" },
      { status: 500 }
    );
  }
}