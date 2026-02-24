import { NextResponse } from "next/server"
import { addComment } from "@/server/photo-actions"
import { getPhotoComments } from "@/server/photo-queries"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const comments = await getPhotoComments(params.id)
    return NextResponse.json({ comments })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load comments" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { body } = (await req.json().catch(() => ({}))) as { body?: string }
    if (typeof body !== "string") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }
    const res = await addComment(params.id, body)
    if (!res.ok) {
      return NextResponse.json({ error: res.message }, { status: res.status ?? 400 })
    }
    return NextResponse.json({ comment: res.comment })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to add comment" }, { status: 500 })
  }
}
