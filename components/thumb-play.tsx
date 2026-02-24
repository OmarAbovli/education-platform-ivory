"use client"

import { useState, useMemo } from "react"
import SecureVideoPlayer from "@/components/secure-video-player"
import { Play } from "lucide-react"
import { isYouTubeUrl, toYouTubeEmbed } from "@/lib/youtube"
import { isVimeoUrl, normalizeVimeoInput, extractVimeoEmbedSrc } from "@/lib/vimeo"
import { isBunnyUrl, normalizeBunnyInput, isBunnyEmbedUrl, extractBunnyEmbedSrc } from "@/lib/bunny"

type Props = {
  title?: string
  source?: string
  thumbnailUrl?: string
  antiDownload?: boolean
  watermarkText?: string
}

export default function ThumbPlay({
  title = "Video",
  source = "",
  thumbnailUrl = "/course-thumbnail.png",
  antiDownload = false,
  watermarkText = "",
}: Props) {
  const [playing, setPlaying] = useState(false)

  const { kind, embedSrc } = useMemo(() => {
    const raw = (source || "").trim()
    if (!raw) return { kind: "none" as const, embedSrc: "" }
    const lower = raw.toLowerCase()
    const hasIframe = lower.includes("<iframe")

    // If it's an iframe, try to classify by src host.
    if (hasIframe) {
      const bunnySrc = extractBunnyEmbedSrc(raw)
      if (bunnySrc) return { kind: "bunny-embed" as const, embedSrc: normalizeBunnyInput(bunnySrc) }

      const vimeoSrc = extractVimeoEmbedSrc(raw)
      if (vimeoSrc) return { kind: "vimeo" as const, embedSrc: normalizeVimeoInput(vimeoSrc) }

      // Generic iframe fallback: try to extract src and render it.
      const m = raw.match(/src=["']([^"']+)["']/i)
      if (m) return { kind: "iframe-generic" as const, embedSrc: m[1] }
      return { kind: "iframe-generic" as const, embedSrc: raw }
    }

    // Non-iframe inputs.
    if (isYouTubeUrl(raw)) return { kind: "yt" as const, embedSrc: toYouTubeEmbed(raw) }
    if (isBunnyUrl(raw)) {
      // Bunny HLS or direct file; Bunny embed URLs are handled by iframe branch above.
      return {
        kind: isBunnyEmbedUrl(raw) ? ("bunny-embed" as const) : ("file" as const),
        embedSrc: normalizeBunnyInput(raw),
      }
    }
    if (isVimeoUrl(raw)) return { kind: "vimeo" as const, embedSrc: normalizeVimeoInput(raw) }

    // Direct MP4/HLS (.m3u8) or other file
    return { kind: "file" as const, embedSrc: raw }
  }, [source])

  if (!source) {
    return (
      <img
        src={thumbnailUrl || "/placeholder.svg?height=360&width=640&query=video%20thumbnail"}
        alt={`${title} thumbnail`}
        className="aspect-video w-full rounded-md object-cover"
      />
    )
  }

  return playing ? (
    kind === "yt" || kind === "vimeo" || kind === "bunny-embed" || kind === "iframe-generic" ? (
      <div className="aspect-video w-full overflow-hidden rounded-md">
        <iframe
          className="h-full w-full"
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    ) : (
      <SecureVideoPlayer
        source={embedSrc}
        title={title}
        antiDownload={antiDownload}
        watermarkText={watermarkText}
        aspectRatio="16:9"
      />
    )
  ) : (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="relative w-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`Play ${title}`}
    >
      <div className="aspect-video w-full">
        <img
          src={thumbnailUrl || "/placeholder.svg?height=360&width=640&query=video%20thumbnail"}
          alt={`${title} thumbnail`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 grid place-items-center bg-black/20 transition-colors hover:bg-black/30">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-emerald-700 shadow">
          <Play className="h-4 w-4" />
          {kind === "yt"
            ? "Play (YouTube)"
            : kind === "vimeo"
              ? "Play (Vimeo)"
              : kind === "bunny-embed"
                ? "Play (Bunny)"
                : kind === "iframe-generic"
                  ? "Play (Embed)"
                  : "Play"}
        </span>
      </div>
    </button>
  )
}
