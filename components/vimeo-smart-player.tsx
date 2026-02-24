"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { isVimeoUrl, toVimeoEmbed } from "@/lib/vimeo"

type Props = {
  videoUrl?: string
  studentName?: string
  title?: string
  aspect?: "16:9" | "4:3" | "1:1"
}

function isHls(url: string) {
  return /\.m3u8(\?|$)/i.test(url)
}

export default function VimeoSmartPlayer({ videoUrl = "", studentName = "", title = "Video", aspect = "16:9" }: Props) {
  const isVimeo = useMemo(() => isVimeoUrl(videoUrl), [videoUrl])
  const embedSrc = useMemo(() => (isVimeo ? toVimeoEmbed(videoUrl) : videoUrl), [isVimeo, videoUrl])
  const isHlsSource = useMemo(() => !isVimeo && isHls(embedSrc), [isVimeo, embedSrc])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<any>(null)

  // Watermark position
  const [wmPos, setWmPos] = useState<{ top: string; left: string }>({ top: "10%", left: "10%" })
  useEffect(() => {
    const move = () => {
      const top = 10 + Math.floor(Math.random() * 70)
      const left = 10 + Math.floor(Math.random() * 70)
      setWmPos({ top: `${top}%`, left: `${left}%` })
    }
    move()
    const id = window.setInterval(move, 30_000)
    return () => window.clearInterval(id)
  }, [])

  // Right-click disable on container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onCtx = (e: Event) => e.preventDefault()
    el.addEventListener("contextmenu", onCtx)
    return () => el.removeEventListener("contextmenu", onCtx)
  }, [])

  // HTML5 video + HLS.js when needed
  useEffect(() => {
    if (isVimeo) return // iframe path; nothing to setup

    const video = videoRef.current
    if (!video || !embedSrc) return

    let cancelled = false

    // Hide download buttons where possible and disable PiP.
    video.setAttribute("controlsList", "nodownload")
    ;(video as any).disablePictureInPicture = true

    // Prevent drag-to-download on the <video> element
    const onDragStart = (e: Event) => e.preventDefault()
    video.addEventListener("dragstart", onDragStart)

    async function setup() {
      // Clean up prior hls instance if any
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch {}
        hlsRef.current = null
      }

      // HLS.m3u8
      if (isHlsSource) {
        // Native HLS?
        if (video.canPlayType("application/vnd.apple.mpegURL") || video.canPlayType("application/x-mpegURL")) {
          video.src = embedSrc
          await video.load?.()
          return
        }
        // Hls.js polyfill
        const { default: Hls } = await import("hls.js")
        if (cancelled) return
        if (Hls.isSupported()) {
          const hls = new Hls({ lowLatencyMode: true })
          hlsRef.current = hls
          hls.loadSource(embedSrc)
          hls.attachMedia(video)
          return
        }
        // Fallback to direct src if not supported
        video.src = embedSrc
        await video.load?.()
        return
      }

      // MP4 or other direct file
      video.src = embedSrc
      await video.load?.()
    }

    void setup()

    return () => {
      cancelled = true
      video.removeEventListener("dragstart", onDragStart)
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch {}
        hlsRef.current = null
      }
    }
  }, [isVimeo, isHlsSource, embedSrc])

  const ratioClass = aspect === "4:3" ? "aspect-[4/3]" : aspect === "1:1" ? "aspect-square" : "aspect-video"

  return (
    <div ref={containerRef} className={`relative w-full ${ratioClass}`}>
      {isVimeo ? (
        <iframe
          className="h-full w-full rounded-md"
          src={embedSrc}
          title={title}
          allow="fullscreen; picture-in-picture; accelerometer; autoplay; encrypted-media; gyroscope"
          allowFullScreen
        />
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full rounded-md object-contain"
          controls
          preload="metadata"
          playsInline
          title={title}
        >
          {"Your browser does not support the video tag."}
        </video>
      )}

      {/* Watermark overlay (outside the player surface so it shows for Vimeo and HTML5) */}
      {studentName ? (
        <div
          aria-hidden
          style={{ top: wmPos.top, left: wmPos.left }}
          className="pointer-events-none absolute select-none whitespace-nowrap rounded bg-black/12 px-2 py-0.5 text-[11px] font-medium text-black/60 shadow-sm backdrop-blur-sm"
        >
          {studentName}
        </div>
      ) : null}
    </div>
  )
}
