import { type NextRequest, NextResponse } from "next/server"
import { createLiveKitToken } from "@/server/livekit-actions"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get("room")
    const participantNameParam = req.nextUrl.searchParams.get("participantName")
    // role param from client is ignored for security

    if (!room) {
        return NextResponse.json({ error: "Missing room" }, { status: 400 })
    }

    try {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get("session_id")?.value
        const user = await getCurrentUser(sessionId)

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = user.role === "teacher" ? "host" : "guest"
        const name = user.name || participantNameParam || "Guest"
        const identity = user.id

        const { token } = await createLiveKitToken(room, identity, role, name)

        // Record join in database for attendance
        try {
            const { sql } = await import("@/server/db")
            await sql`
                INSERT INTO voice_call_participants (call_id, user_id)
                SELECT id, ${user.id} FROM voice_calls WHERE room_name = ${room} AND status = 'active'
                ON CONFLICT (call_id, user_id) DO NOTHING;
            `
        } catch (dbErr) {
            console.error("Failed to record participant join", dbErr)
            // We still return the token so the user can join the call
        }

        return NextResponse.json({ token })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
