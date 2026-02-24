import SiteHeader from "@/components/site-header"
import GroupChat from "@/components/messaging/group-chat"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { getMyGradesForTeacher, getMyGradesAndLastActiveForTeacher } from "@/server/group-chat-actions"

export default async function TeacherCommunityChatPage({ searchParams }: { searchParams?: { [key: string]: string | string[] } }) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  const user = await getCurrentUser(sessionId)
  if (!user || user.role !== 'teacher') return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-4xl p-6">Please sign in as a teacher to view this page.</div>
    </main>
  )
  // fetch grades server-side so the client UI has options immediately
  const info = await getMyGradesAndLastActiveForTeacher().catch(() => ({ grades: [] as number[], lastActiveGrade: null }))
  const grades = info.grades || []
  const lastActiveGrade = info.lastActiveGrade ?? null

  // honor ?grade= query param (if provided and valid) so header grade links can open a specific class
  let requestedGrade: number | null = null
  try {
    const g = searchParams?.grade
    if (typeof g === 'string') {
      const n = Number(g)
      if (!Number.isNaN(n)) requestedGrade = n
    }
  } catch (e) {
    requestedGrade = null
  }

  return (
    <main>
      <SiteHeader />
      <div className="pt-6">
        {grades.length === 0 ? (
          <div className="mx-auto max-w-4xl p-6">
            <div className="rounded border p-4 bg-yellow-50 dark:bg-yellow-900/30">
              <h3 className="font-semibold">No grade chats available</h3>
              <p className="text-sm mt-2">It looks like you don't have any subscribed students with a grade assigned. To open a community chat you need students subscribed to you who have a grade set.</p>
              <div className="mt-3">
                <a href="/teacher" className="text-sm underline">Go to Students Manager to review subscriptions and grades</a>
              </div>
            </div>
          </div>
        ) : (
          <GroupChat isTeacher grade={requestedGrade ?? (lastActiveGrade ?? grades[0])} initialGrades={grades} />
        )}
      </div>
    </main>
  )
}
