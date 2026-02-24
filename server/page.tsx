import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/server/db"
import { cookies } from "next/headers"
import BunnyPlayer from "@/components/bunny-player"
import { notFound } from "next/navigation"
import SiteHeader from "@/components/site-header"

type VideoPageParams = { params: { id: string } }

export default async function WatchVideoPage({ params }: VideoPageParams) {
  const user = await getCurrentUser(cookies().get("session_id")?.value)

  // This page is only for logged-in students
  if (user?.role !== "student") {
    notFound()
  }

  // 1. Fetch video details and student's view count in parallel
  const [videoResult, viewCountResult] = await Promise.all([
    sql`SELECT id, title, url, max_views FROM videos WHERE id = ${params.id} LIMIT 1`,
    sql`SELECT view_count FROM student_video_views WHERE student_id = ${user.id} AND video_id = ${params.id} LIMIT 1`,
  ])

  const video = videoResult[0]
  if (!video) {
    notFound()
  }

  const currentViews = viewCountResult[0]?.view_count ?? 0
  const maxViews = video.max_views

  // 2. Check if the student has reached the view limit
  // The check is `currentViews >= maxViews`
  const hasReachedLimit = maxViews !== null && currentViews >= maxViews

  if (hasReachedLimit) {
    return (
      <>
        <SiteHeader />
        <main className="container mx-auto max-w-4xl p-4">
          <div className="flex flex-col items-center justify-center rounded-lg border border-destructive bg-card p-8 text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">لقد استنفدت عدد المشاهدات</h1>
            <p className="text-lg">
              لقد انتهى عدد مرات المشاهدة المسموحة لك لهذا الفيديو وهي: {maxViews} مرات.
            </p>
            <p className="mt-2 text-muted-foreground">
              يمكنك التواصل معنا للحصول على مشاهدات أخرى.
            </p>
          </div>
        </main>
      </>
    )
  }

  // 3. If allowed, render the player
  return (
    <>
      <SiteHeader />
      <main className="container mx-auto max-w-4xl p-4">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{video.title}</h1>
          {maxViews !== null && (
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
              <p>
                متبقي لك {maxViews - currentViews} من {maxViews} مشاهدات. سيتم احتساب المشاهدة عند إكمال الفيديو.
              </p>
            </div>
          )}
          <div className="overflow-hidden rounded-lg border shadow-lg">
            <BunnyPlayer videoId={video.id} videoUrl={video.url} />
          </div>
        </div>
      </main>
    </>
  )
}