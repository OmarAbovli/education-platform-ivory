"use client"

import { Heart } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function PhotoLikeButton({
  photoId,
  initialCount = 0,
  initialLiked = false,
}: {
  photoId: string
  initialCount?: number
  initialLiked?: boolean
}) {
  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(initialLiked)
  const [pending, setPending] = useState(false)

  async function onToggle() {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch(`/api/photos/${photoId}/like`, {
        method: "POST",
        headers: { Accept: "application/json" },
      })
      const contentType = res.headers.get("content-type") || ""
      if (!res.ok || !contentType.includes("application/json")) {
        const txt = await res.text()
        if (res.status === 401) alert("Please log in to like photos.")
        console.warn("Like failed", res.status, txt)
        return
      }
      const data = (await res.json()) as { count?: number }
      if (typeof data.count === "number") {
        setLiked((v) => !v)
        setCount(data.count)
      }
    } catch (e) {
      console.error("Like error", e)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={onToggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm",
        liked ? "text-red-600" : "text-muted-foreground hover:bg-muted",
      )}
      aria-pressed={liked}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-red-600")} />
      <span className="tabular-nums">{count}</span>
      <span>Like</span>
    </button>
  )
}
