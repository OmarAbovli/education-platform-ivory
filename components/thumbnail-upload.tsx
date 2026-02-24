"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  value?: string
  onChange?: (url: string) => void
  label?: string
  helperText?: string
}

export function ThumbnailUpload({
  value = "",
  onChange,
  label = "Upload Thumbnail",
  helperText = "16:9 recommended (e.g., 1280×720). JPG or PNG.",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string>(value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update preview when value changes externally (e.g. from AI)
  useEffect(() => {
    setPreview(value)
  }, [value])

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
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-md border bg-white">
        <div className="aspect-video w-full">
          <img
            src={preview || "/placeholder.svg?height=360&width=640&query=video%20thumbnail"}
            alt="Thumbnail preview"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
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
        <Button type="button" variant="outline" disabled={loading} onClick={() => inputRef.current?.click()}>
          {loading ? "Uploading..." : label}
        </Button>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  )
}
