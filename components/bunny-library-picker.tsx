"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { listBunnyVideos } from "@/server/bunny-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

type Choice = {
  id?: string
  title: string
  embedUrl?: string
  hlsUrl?: string
  thumbnailUrl?: string
  durationSeconds?: number
}

type Props = {
  onSelect: (choice: Choice) => void
  pageSize?: number
}

export default function BunnyLibraryPicker({ onSelect, pageSize = 12 }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Choice[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [isPending, startTransition] = useTransition()
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [totalItems, pageSize])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hasEnv = typeof window !== "undefined" && Boolean((window as any).ENV?.BUNNY_STREAM_LIBRARY_ID) // not set in this runtime by default
    setEnabled(Boolean(hasEnv))
  }, [])

  useEffect(() => {
    if (!enabled) return

    setError(null)
    startTransition(async () => {
      const res = await listBunnyVideos({ page, itemsPerPage: pageSize, search: query })
      if (!res.ok) {
        setError(res.error ?? "Failed to load Bunny library.")
        setItems([])
        setTotalItems(0)
        return
      }
      setItems(res.items)
      setTotalItems(res.totalItems)
    })
  }, [page, enabled])

  if (!enabled) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        {
          "Bunny Library API isn't configured. Paste a Bunny 'play' or 'embed' URL, or a CDN HLS .m3u8 in the field above."
        }
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your Bunny videos…"
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          onClick={() => {
            setPage(1)
          }}
          disabled={isPending}
        >
          {isPending ? "Searching…" : "Search"}
        </Button>
      </div>

      {error ? (
        <Card className="border-red-300 bg-red-50 text-red-800">
          <CardContent className="py-3 text-sm">
            {error} Ensure BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY are set.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isPending && items.length === 0
          ? Array.from({ length: pageSize }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-md" />
            ))
          : items.map((v) => (
              <Card key={v.id} className="overflow-hidden">
                <div className="relative aspect-video w-full bg-muted">
                  {v.thumbnailUrl ? (
                    <Image
                      src={v.thumbnailUrl || "/placeholder.svg"}
                      alt={v.title || "Video thumbnail"}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <CardHeader className="p-3">
                  <CardTitle className="line-clamp-1 text-sm">{v.title || "Untitled"}</CardTitle>
                  {v.durationSeconds ? (
                    <div className="text-xs text-muted-foreground">{formatDuration(v.durationSeconds)}</div>
                  ) : null}
                </CardHeader>
                <CardContent className="flex gap-2 p-3 pt-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSelect?.(v)}
                    className="flex-1"
                    title="Use Bunny Embed"
                  >
                    Use Embed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onSelect?.({
                        ...v,
                        // Prefer HLS explicitly when selecting this button
                        embedUrl: v.embedUrl,
                        hlsUrl: v.hlsUrl,
                      })
                    }
                    className="flex-1"
                    title="Use HLS"
                  >
                    Use HLS
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Page {page} of {totalPages}{" "}
          {totalItems ? (
            <Badge variant="secondary" className="ml-2">
              {totalItems} total
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page <= 1 || isPending}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page >= totalPages || isPending}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatDuration(totalSeconds?: number) {
  if (!totalSeconds || totalSeconds <= 0) return ""
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}
