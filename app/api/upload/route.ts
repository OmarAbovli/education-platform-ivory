import { NextResponse, type NextRequest } from "next/server"
import { put } from "@vercel/blob"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 })
    }

    // Optional: validate size/type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Only image files are allowed" }, { status: 400 })
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      console.error("❌ BLOB_READ_WRITE_TOKEN is missing")
      return NextResponse.json(
        { ok: false, error: "Server is not configured for file uploads. BLOB_READ_WRITE_TOKEN is missing." },
        { status: 500 }
      )
    }

    const ext = file.name.split(".").pop() || "jpg"
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "")
    const filename = `avatars/${randomUUID()}.${safeExt}`

    // Upload to Vercel Blob
    // Pass token explicitly so it works locally as well as in production
    const uploaded = await put(filename, file, {
      access: "private",
      addRandomSuffix: false,
      token,
    })

    console.log("✅ Upload success:", uploaded.url)

    return NextResponse.json({ ok: true, url: uploaded.url })
  } catch (e: any) {
    console.error("❌ Upload error details:", e)

    return NextResponse.json(
      {
        ok: false,
        error: "Upload failed: " + (e?.message ?? "Unknown error"),
      },
      { status: 500 },
    )
  }
}
