"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { normalizeGoogleDriveUrl, isGoogleDriveUrl } from "@/lib/gdrive"
import { normalizeBunnyInput, isBunnyIframePage, isBunnyUrl, extractBunnyEmbedSrc } from "@/lib/bunny"

type Source = { src: string; type?: "video/mp4" | "application/x-mpegURL" } | { hls: string } | { mp4: string }

type Props = {
  source: string | Source
  title?: string
  watermarkText?: string
  antiDownload?: boolean
  aspectRatio?: "16:9" | "4:3" | "1:1" | string
  onTimeUpdate?: () => void
  videoRef?: (ref: HTMLVideoElement | null) => void
}

function isHlsUrl(u: string) {
  return /\.m3u8(\?|#|$)/i.test(u)
}
function isMp4Url(u: string) {
  return /\.mp4(\?|#|$)/i.test(u)
}

function resolveSource(input: Props["source"]) {
  if (typeof input === "string") {
    const normalized = normalizeBunnyInput(input.trim())
    if (!normalized) return null
    if (isHlsUrl(normalized)) return { src: normalized, type: "application/x-mpegURL" as const }
    if (isMp4Url(normalized)) return { src: normalized, type: "video/mp4" as const }
    return { src: normalized, type: "video/mp4" as const }
  }
  if ("hls" in input) return { src: input.hls, type: "application/x-mpegURL" as const }
  if ("mp4" in input) return { src: input.mp4, type: "video/mp4" as const }
  const src = input.src
  if (isHlsUrl(src)) return { src, type: "application/x-mpegURL" as const }
  if (isMp4Url(src)) return { src, type: "video/mp4" as const }
  return { src, type: input.type ?? "video/mp4" }
}

function supportsNativeHls(video: HTMLVideoElement) {
  return Boolean(video.canPlayType("application/vnd.apple.mpegURL") || video.canPlayType("application/x-mpegURL"))
}

export default function SecureVideoPlayer({
  source,
  title = "Video",
  watermarkText = "",
  antiDownload = false,
  aspectRatio = "16:9",
  onTimeUpdate,
  videoRef: externalVideoRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<any>(null)
  const [wmPos, setWmPos] = useState<{ top: string; left: string }>({ top: "8%", left: "8%" })
  const [errorText, setErrorText] = useState<string | null>(null)
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)

  const computed = useMemo(() => {
    const r = resolveSource(source)
    if (!r) return { resolved: null as any, isHls: false, isBunny: false, isEmpty: true, isIframePage: false }

    // If someone passed iframe HTML, extract src; consider mediadelivery "play/embed" as iframe page
    const extracted = extractBunnyEmbedSrc(r.src)
    const maybeIframe = extracted ?? r.src
    const isIframePage = isBunnyIframePage(maybeIframe)

    return {
      resolved: { ...r, src: maybeIframe },
      isHls: r.type === "application/x-mpegURL" || isHlsUrl(r.src),
      isBunny: isBunnyUrl(maybeIframe),
      isEmpty: false,
      isIframePage,
    }
  }, [source])

  // Move watermark occasionally
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

  useEffect(() => {
    const video = videoRef.current
    if (!video || computed.isEmpty) return

    let finalSrc = computed.resolved.src as string

    // Render mediadelivery "embed" or "play" as <iframe>
    if (computed.isIframePage) {
      setIframeSrc(finalSrc)
      cleanupHls()
      setErrorText(null)
      return
    } else {
      setIframeSrc(null)
    }

    // Normalize Google Drive MP4 if needed
    if (isMp4Url(finalSrc) && isGoogleDriveUrl(finalSrc)) {
      finalSrc = normalizeGoogleDriveUrl(finalSrc)
    }

    // Anti-download friction (not bulletproof)
    if (antiDownload || computed.isBunny) {
      video.setAttribute("controlsList", "nodownload noplaybackrate")
      ;(video as any).disablePictureInPicture = true
    }

    const wrap = containerRef.current
    const onCtx = (e: Event) => (antiDownload || computed.isBunny) && e.preventDefault()
    const onDragStart = (e: Event) => (antiDownload || computed.isBunny) && e.preventDefault()
    wrap?.addEventListener("contextmenu", onCtx)
    video.addEventListener("dragstart", onDragStart)

    async function setup() {
      try {
        setErrorText(null)
        cleanupHls()

        if (computed.isHls) {
          // Prefer native HLS (Safari/iOS)
          if (video && supportsNativeHls(video)) {
            video.src = finalSrc
            await video.load?.()
            return
          }
          // hls.js fallback for other browsers
          const { default: Hls } = await import("hls.js")
          if (Hls.isSupported()) {
            const hls = new Hls({
              lowLatencyMode: true,
              backBufferLength: 60,
            })
            hlsRef.current = hls
            hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
              if (data?.fatal) {
                setErrorText("There was a problem loading the stream. Check the URL or use Bunny 'play'/'embed' URLs.")
              }
            })
            hls.loadSource(finalSrc)
            if (video) hls.attachMedia(video)
            return
          }
          // As last resort, try native element anyway
          if (video) {
            video.src = finalSrc
            await video.load?.()
          }
          return
        }

        // Non-HLS (MP4)
        if (video) {
          video.src = finalSrc
          await video.load?.()
        }
      } catch (err) {
        console.error("Player init error", err)
        setErrorText("Could not initialize the video.")
      }
    }

    const onError = () => {
      console.warn("Media element error for", finalSrc, video.error)
      setErrorText(
        isGoogleDriveUrl(finalSrc)
          ? "We could not load this Google Drive video. Ensure the file is shared as 'Anyone with the link can view'."
          : "We could not load the video. For Bunny, paste an iframe 'play'/'embed' URL, or an HLS .m3u8 link.",
      )
    }
    video.addEventListener("error", onError)
    
    // إضافة دعم التتبع
    if (onTimeUpdate) {
      video.addEventListener("timeupdate", onTimeUpdate)
    }
    
    const raf = requestAnimationFrame(() => void setup())

    return () => {
      cancelAnimationFrame(raf)
      wrap?.removeEventListener("contextmenu", onCtx)
      video.removeEventListener("dragstart", onDragStart)
      video.removeEventListener("error", onError)
      if (onTimeUpdate) {
        video.removeEventListener("timeupdate", onTimeUpdate)
      }
      cleanupHls()
    }
  }, [computed, antiDownload])

  function cleanupHls() {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy()
      } catch {}
      hlsRef.current = null
    }
  }

  const ratioClass = aspectRatio === "4:3" ? "aspect-[4/3]" : aspectRatio === "1:1" ? "aspect-square" : "aspect-video"

  if (computed.isEmpty) {
    return (
      <div className={`relative w-full ${ratioClass}`}>
        <div className="grid h-full w-full place-items-center rounded-md bg-black/5 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
          {"No video source was provided."}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative w-full ${ratioClass}`}>
      {iframeSrc ? (
        <iframe
          src={iframeSrc}
          title={title}
          className="h-full w-full rounded-md"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          ref={(el) => {
            videoRef.current = el
            if (externalVideoRef) externalVideoRef(el)
          }}
          className="h-full w-full rounded-md object-contain"
          controls
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          title={title}
        >
          {"Your browser does not support the video tag."}
        </video>
      )}

      {watermarkText && (antiDownload || computed.isBunny) ? (
        <div
          aria-hidden
          style={{ top: wmPos.top, left: wmPos.left }}
          className="pointer-events-none absolute select-none whitespace-nowrap rounded bg-black/10 px-2 py-0.5 text-[11px] font-medium text-black/50 shadow-sm backdrop-blur-sm"
        >
          {watermarkText}
        </div>
      ) : null}

      {errorText ? (
        <div className="absolute inset-0 grid place-items-center rounded-md bg-black/5 px-4 text-center">
          <p className="text-xs text-red-700 dark:text-red-400">{errorText}</p>
        </div>
      ) : null}
    </div>
  )
}
