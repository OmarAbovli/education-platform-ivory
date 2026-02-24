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

    const ext = file.name.split(".").pop() || "jpg"
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "")
    const filename = `avatars/${randomUUID()}.${safeExt}`

    // Check for token existence manually for debugging
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      console.error("❌ BLOB_READ_WRITE_TOKEN is missing")
    } else {
      console.log("✅ BLOB_READ_WRITE_TOKEN found, length:", token.length)
      if (token.startsWith('"') || token.startsWith("'")) {
        console.warn("⚠️ Token starts with quote, this might be an issue")
      }
    }

    // Upload to Vercel Blob as public file
    const uploaded = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    })

    console.log("✅ Upload success:", uploaded.url)

    return NextResponse.json({ ok: true, url: uploaded.url })
  } catch (e: any) {
    console.error("❌ Upload error details:", e)
    console.error("❌ Token used (masked):", process.env.BLOB_READ_WRITE_TOKEN ? `${process.env.BLOB_READ_WRITE_TOKEN.substring(0, 10)}...` : "None")

    return NextResponse.json(
      {
        ok: false,
        error:
          "Upload failed. If running locally, ensure Vercel Blob is configured or set BLOB_READ_WRITE_TOKEN in your env.",
      },
      { status: 500 },
    )
  }
}
