"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function PhotoCommentForm({
  photoId,
  onAdded,
}: {
  photoId: string
  onAdded: (c: any) => void
}) {
  const [value, setValue] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = value.trim()
    if (!text) return
    setPending(true)
    try {
      const res = await fetch(`/api/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ body: text }),
      })
      const contentType = res.headers.get("content-type") || ""
      if (!res.ok || !contentType.includes("application/json")) {
        if (res.status === 401) {
          alert("Please log in to comment.")
        } else {
          console.warn("Comment failed", res.status, await res.text())
        }
        return
      }
      const data = (await res.json()) as { comment?: any }
      if (data.comment) {
        onAdded(data.comment)
        setValue("")
      }
    } catch (e) {
      console.error("Comment error", e)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        placeholder="Write a comment..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
      />
      <Button type="submit" disabled={pending || value.trim().length === 0}>
        {pending ? "Posting..." : "Post"}
      </Button>
    </form>
  )
}
