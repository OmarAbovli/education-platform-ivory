import { VideoRoom } from "@/components/livekit/video-room"
import { Suspense } from "react"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

export default async function LiveKitPage() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionId)

    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-white">Loading LiveKit...</div>}>
            <VideoRoom
                userId={user?.id}
                userName={user?.name}
            />
        </Suspense>
    )
}
