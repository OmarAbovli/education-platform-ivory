import SiteHeader from "@/components/site-header"
import GroupChat from "@/components/messaging/group-chat"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

export default async function CommunityChatPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  const user = await getCurrentUser(sessionId)
  if (!user) return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-4xl p-6">Please log in to view community chats.</div>
    </main>
  )

  // If student, determine their grade and render the client component with that grade
  const grade = user.role === 'student' ? user.grade : undefined

  return (
    <main>
      <SiteHeader />
      <div className="pt-6">
        {/* GroupChat is a client component */}
        <GroupChat grade={grade} isTeacher={false} />
      </div>
    </main>
  )
}
