import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
import { randomBytes } from "crypto"
import QRCode from "qrcode"
import { createQrToken } from "@/server/qr-actions"

// Helper function to convert bytes to base64url
function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export async function POST(req: NextRequest) {
  try {
    const { studentId } = await req.json()
    if (!studentId) {
      return NextResponse.json({ ok: false, error: "studentId is required" }, { status: 400 })
    }
    const token = base64Url(randomBytes(24))
    const origin = req.nextUrl.origin
    const loginUrl = `${origin}/qr-login?token=${token}`

    // 52560000 minutes = 100 years. Effectively permanent.
    const ok = await createQrToken({ token, userId: studentId, expiresInMinutes: 52560000, isPermanent: true })
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Could not create token" }, { status: 500 })
    }

    const qrDataUrl = await QRCode.toDataURL(loginUrl, { margin: 1, scale: 6 })
    return NextResponse.json({ ok: true, qrDataUrl, loginUrl })
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 })
  }
}
