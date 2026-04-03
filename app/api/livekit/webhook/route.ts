import { WebhookReceiver } from "livekit-server-sdk"
import { sql } from "@/server/db"
import { NextRequest, NextResponse } from "next/server"

let receiver: WebhookReceiver | null = null;
try {
    if (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET) {
        receiver = new WebhookReceiver(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET)
    }
} catch (e) {
    console.error("Failed to initialize WebhookReceiver", e)
}

export async function POST(req: NextRequest) {
    if (!receiver) return new NextResponse("Webhook Receiver not configured", { status: 500 })

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return new NextResponse("Unauthorized", { status: 401 })

    const body = await req.text()

    try {
        const event = await receiver.receive(body, authHeader)
        
        if (event.event === "participant_left" || event.event === "participant_disconnected" as string) {
            // Participant left the room (e.g. disconnected, closed browser)
            if (event.participant?.identity && event.room?.name) {
                await sql`
                    UPDATE voice_call_participants
                    SET left_at = NOW()
                    WHERE user_id = ${event.participant.identity} 
                    AND call_id IN (SELECT id FROM voice_calls WHERE room_name = ${event.room.name} AND status = 'active')
                `
            }
        } else if (event.event === "room_finished") {
             // Room was destroyed or ended by LiveKit
             if (event.room?.name) {
                 await sql`
                    UPDATE voice_calls
                    SET status = 'ended', ended_at = NOW()
                    WHERE room_name = ${event.room.name} AND status = 'active';
                 `
                 await sql`
                    UPDATE voice_call_participants
                    SET left_at = NOW()
                    WHERE left_at IS NULL AND call_id IN (
                        SELECT id FROM voice_calls WHERE room_name = ${event.room.name}
                    )
                 `
             }
        }

        return NextResponse.json({ success: true, event: event.event })
    } catch (e: any) {
        console.error("LiveKit Webhook error:", e)
        return new NextResponse(e.message, { status: 500 })
    }
}
