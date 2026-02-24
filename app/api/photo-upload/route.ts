import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const filename = (form.get("filename") as string | null) || file?.name || `photo-${Date.now()}`

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Store in a photos/ prefix for organization
    const key = `photos/${Date.now()}-${filename}`

    // Upload to Vercel Blob. Ensure BLOB_READ_WRITE_TOKEN is set in env.
    const blob = await put(key, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || "application/octet-stream",
    })

    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    console.error("photo-upload error:", err)
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
