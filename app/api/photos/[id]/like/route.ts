import { NextResponse } from "next/server"
import { toggleLike } from "@/server/photo-actions"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const res = await toggleLike(params.id)
    if (!res.ok) {
      return NextResponse.json({ error: res.message }, { status: res.status ?? 400 })
    }
    return NextResponse.json({ count: res.count })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to toggle like" }, { status: 500 })
  }
}
