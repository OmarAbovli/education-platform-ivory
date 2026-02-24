import SiteHeader from "@/components/site-header"
import PhotoCard from "@/components/photo-card"
import { getRecentPhotos } from "@/server/photo-queries"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { StudentPhotoUpload } from "@/components/student-photo-upload"
import { StudentPhotoHistory } from "@/components/student-photo-history"

export default async function PhotosPage() {
  const photos = await getRecentPhotos(30)
  const sessionId = (await cookies()).get('session_id')?.value
  const user = await getCurrentUser(sessionId)

  // Get student's teacher ID if they're a student
  let teacherId = null
  if (user?.role === 'student') {
    const { sql } = await import("@/server/db")
    const subscriptions = await sql`
      SELECT teacher_id FROM teacher_subscriptions
      WHERE student_id = ${user.id} AND status = 'active'
      LIMIT 1
    `
    if (subscriptions.length > 0) {
      teacherId = subscriptions[0].teacher_id
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <SiteHeader />
      <div className="mx-auto max-w-7xl p-6 space-y-8">
        {/* Student Upload Section */}
        {user?.role === 'student' && teacherId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StudentPhotoUpload teacherId={teacherId} />
            <StudentPhotoHistory />
          </div>
        )}

        {/* Photos Gallery */}
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <PhotoCard
                key={p.id}
                id={p.id}
                url={p.url}
                caption={p.caption}
                likeCount={p.like_count}
                commentCount={p.comment_count}
                likedByMe={false}
                teacherId={p.teacher_id}
                teacherName={p.teacher_name}
                teacherAvatarUrl={p.teacher_avatar_url}
                createdAt={p.created_at}
                isTeacher={user?.role === 'teacher'}
                currentUserId={user?.id}
              />
            ))}
            {photos.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-400">لا توجد صور بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
