"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  value?: string
  onChange?: (url: string) => void
  label?: string
}

export function AvatarUpload({ value = "", onChange, label = "Upload Photo" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string>(value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error || "Upload failed")
        return
      }
      onChange?.(data.url)
      setPreview(data.url)
    } catch (e) {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 overflow-hidden rounded-md border bg-white">
        <img
          src={preview || "/placeholder.svg?height=64&width=64&query=teacher%20avatar"}
          alt="Avatar preview"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => {
            inputRef.current?.click()
          }}
        >
          {loading ? "Uploading..." : label}
        </Button>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  )
}
