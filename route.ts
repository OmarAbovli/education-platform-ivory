import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/server/db"

export async function POST(request: Request) {
  const cookieStore = cookies()
  const sessionId = cookieStore.get("session_id")?.value

  // 1. Authenticate the user
  const user = await getCurrentUser(sessionId)
  if (user?.role !== "student") {
    // Only track views for students. Non-students or guests get a pass.
    return NextResponse.json({ message: "User is not a student." }, { status: 200 })
  }

  const { videoId } = await request.json()

  if (!videoId) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 })
  }

  try {
    // 2. Fetch video details (including max_views) and current view count for the student
    const [videoDetails, viewCountResult] = await Promise.all([
      sql`SELECT max_views FROM videos WHERE id = ${videoId} LIMIT 1`,
      sql`SELECT view_count FROM student_video_views WHERE student_id = ${user.id} AND video_id = ${videoId} LIMIT 1`,
    ])

    const maxViews = videoDetails[0]?.max_views
    const currentViews = viewCountResult[0]?.view_count ?? 0

    // 3. Check if the student is allowed to watch
    // If maxViews is null (unlimited) or they haven't reached the limit, increment the count.
    if (maxViews === null || currentViews < maxViews) {
      // Using ON CONFLICT to handle both insert and update in one query (UPSERT)
      await sql`
        INSERT INTO student_video_views (student_id, video_id, view_count)
        VALUES (${user.id}, ${videoId}, 1)
        ON CONFLICT (student_id, video_id)
        DO UPDATE SET
          view_count = student_video_views.view_count + 1,
          updated_at = NOW();
      `
      return NextResponse.json({ message: "View tracked successfully." }, { status: 200 })
    } else {
      // 4. If they have reached the limit, do nothing.
      // The check on the video page will prevent them from starting the video again.
      return NextResponse.json({ message: "View limit reached. No new view tracked." }, { status: 200 })
    }
  } catch (error) {
    console.error("Error tracking video view:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}