/**
 * Bunny Stream utilities for recognizing and normalizing inputs so they "just work".
 *
 * Supported inputs:
 * - Bunny Direct Play page: https://iframe.mediadelivery.net/play/{LIBRARY_ID}/{VIDEO_ID}
 * - Bunny Embed page:      https://iframe.mediadelivery.net/embed/{LIBRARY_ID}/{VIDEO_ID}
 * - Bunny CDN HLS/MP4:     https://{your-cdn-host}/{VIDEO_ID}/playlist.m3u8 (or .mp4)
 *
 * Strategy:
 * - Render "play" and "embed" as iframes (they are HTML pages).
 * - Render CDN HLS or MP4 via <video> (with hls.js for HLS on non-Safari browsers).
 */

const CUSTOM_CDN =
  typeof process !== "undefined" && typeof process.env !== "undefined" ? process.env.BUNNY_CDN_HOSTNAME : undefined

function safeURL(u?: string) {
  try {
    return u ? new URL(u) : null
  } catch {
    return null
  }
}

export function isBunnyHost(host?: string) {
  if (!host) return false
  const h = host.toLowerCase()
  return (
    h.includes("mediadelivery.net") ||
    h.includes("bunnycdn.com") ||
    h.endsWith(".b-cdn.net") ||
    (!!CUSTOM_CDN && h.includes(CUSTOM_CDN.toLowerCase()))
  )
}

/** True for any URL on Bunny domains. */
export function isBunnyUrl(u: string) {
  const url = safeURL(u)
  return !!url && isBunnyHost(url.host)
}

/** True when the URL is an iframe-able mediadelivery page ("embed" or "play"). */
export function isBunnyIframePage(u: string) {
  const url = safeURL(u)
  if (!url) return false
  if (!/(^|\.)mediadelivery\.net$/i.test(url.host)) return false
  return url.pathname.startsWith("/embed/") || url.pathname.startsWith("/play/")
}

/** True for "embed" specifically. */
export function isBunnyEmbedUrl(u: string) {
  const url = safeURL(u)
  return !!url && /(^|\.)mediadelivery\.net$/i.test(url.host) && url.pathname.startsWith("/embed/")
}

/** Convert a mediadelivery "play" page to "embed" (better for iframing). */
export function normalizeBunnyPlayableToEmbed(u: string) {
  const url = safeURL(u)
  if (!url) return u
  if (/(^|\.)mediadelivery\.net$/i.test(url.host) && url.pathname.startsWith("/play/")) {
    url.pathname = url.pathname.replace(/^\/play\//, "/embed/")
    return url.toString()
  }
  return u
}

/** Extract the src attribute if provided a full <iframe ...> snippet; otherwise return the string. */
export function extractEmbedSrc(htmlOrUrl: string) {
  const trimmed = (htmlOrUrl || "").trim()
  if (trimmed.startsWith("<")) {
    const m = trimmed.match(/src=["']([^"']+)["']/i)
    if (m?.[1]) return m[1]
  }
  return trimmed
}

/**
 * Get the src from a Bunny <iframe> HTML. Returns a normalized URL (play → embed), or null if not Bunny iframe HTML.
 */
export function extractBunnyEmbedSrc(html: string): string | null {
  const input = (html || "").trim()
  if (!input.toLowerCase().includes("<iframe")) return null
  const m = input.match(/src=["']([^"']+)["']/i)
  if (!m) return null
  const src = m[1]
  const u = safeURL(src)
  if (!u || !isBunnyHost(u.host)) return null
  return normalizeBunnyPlayableToEmbed(u.toString())
}

/**
 * Normalize any Bunny input:
 * - If it's an iframe HTML, extract src and normalize play → embed.
 * - If it's a mediadelivery "play" or "embed" URL, normalize play → embed.
 * - If it's CDN HLS/MP4, keep as-is.
 */
export function normalizeBunnyInput(input: string) {
  const candidate = extractEmbedSrc(input)
  if (!candidate) return candidate
  const u = safeURL(candidate)
  if (!u) return candidate

  if (isBunnyIframePage(candidate)) return normalizeBunnyPlayableToEmbed(candidate)
  if (isBunnyHost(u.host) && /\.(m3u8|mp4)(\?|#|$)/i.test(u.pathname + u.search)) {
    return candidate
  }
  return candidate
}

/** Build the official Bunny iframe embed URL from Library and Video IDs. */
export function buildBunnyEmbedUrl(libraryId: string, videoId: string) {
  const lib = (libraryId || "").trim()
  const vid = (videoId || "").trim()
  return `https://iframe.mediadelivery.net/embed/${lib}/${vid}`
}

/** Heuristic HLS URL builder (prefer Bunny-provided Direct Play URLs in production). */
export function buildBunnyHlsUrl(libraryId: string, videoId: string): string {
  const host =
    typeof process !== "undefined" && (process as any).env ? (process as any).env.BUNNY_CDN_HOSTNAME : undefined
  if (host) return `https://${host}/${videoId}/playlist.m3u8`
  return `https://vz-${libraryId}-${videoId}.b-cdn.net/playlist.m3u8`
}

/** Normalize a direct play URL (HLS/MP4). If relative and a custom CDN is configured, prefix it. */
export function normalizeBunnyDirectPlayUrl(url: string) {
  const trimmed = (url || "").trim()
  const u = safeURL(trimmed)
  if (u) return trimmed
  if (CUSTOM_CDN) {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
    return `https://${CUSTOM_CDN}${path}`
  }
  return trimmed
}
