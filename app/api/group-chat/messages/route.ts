import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
import { z } from "zod"
import { getGroupMessages, sendGroupMessage } from "@/server/group-chat-actions"

export async function GET(req: NextRequest) {
  try {
    // Debug: log cookie presence for troubleshooting
    try {
      const sid = req.cookies.get('session_id')
      console.log('GET /api/group-chat/messages - session_id cookie:', sid?.value ?? null)
    } catch (e) {
      console.log('GET /api/group-chat/messages - could not read cookies from request', e)
    }
    const gradeParam = req.nextUrl.searchParams.get("grade")
    if (!gradeParam) return NextResponse.json({ error: "Missing grade" }, { status: 400 })
    const grade = Number(gradeParam)
    if (Number.isNaN(grade)) return NextResponse.json({ error: "Invalid grade" }, { status: 400 })

    const msgs = await getGroupMessages(grade)
    return NextResponse.json({ ok: true, messages: msgs })
  } catch (e: any) {
    console.error("GET /api/group-chat/messages error", e)
    const status = e?.message?.toLowerCase?.().includes('not authorized') ? 401 : 500
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    try {
      const sid = req.cookies.get('session_id')
      console.log('POST /api/group-chat/messages - session_id cookie:', sid?.value ?? null)
    } catch (e) {
      console.log('POST /api/group-chat/messages - could not read cookies from request', e)
    }
    const body = await req.json()
    const schema = z.object({ grade: z.number().int().min(1), body: z.string().min(1) })
    const payload = schema.parse(body)

    const res = await sendGroupMessage(payload)
    return NextResponse.json({ ok: true, result: res })
  } catch (e: any) {
    console.error("POST /api/group-chat/messages error", e)
    const status = e?.message?.toLowerCase?.().includes('not authorized') ? 401 : 500
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status })
  }
}
