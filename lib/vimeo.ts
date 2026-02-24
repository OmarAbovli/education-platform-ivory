// Vimeo helpers: detect, normalize, and extract embed src

function sanitizeUrlCandidate(input: string): string {
  return input.trim().replace(/[)\]\s]+$/g, "")
}

export function isVimeoUrl(input: string): boolean {
  try {
    const u = new URL(sanitizeUrlCandidate(input))
    const h = u.hostname.replace(/^www\./, "")
    return h === "vimeo.com" || h === "player.vimeo.com"
  } catch {
    return false
  }
}

function extractVimeoIdFromPath(pathname: string): string | null {
  // Handles:
  // - /VIDEO_ID
  // - /channels/staffpicks/VIDEO_ID
  // - /video/VIDEO_ID (player.vimeo.com)
  const parts = pathname.split("/").filter(Boolean)
  // Prefer explicit /video/ID
  const idxVideo = parts.findIndex((p) => p === "video")
  if (idxVideo >= 0 && parts[idxVideo + 1] && /^\d+$/.test(parts[idxVideo + 1])) return parts[idxVideo + 1]
  // Fallback to last numeric segment
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i])) return parts[i]
  }
  return null
}

/**
 * Convert a Vimeo URL (page or player) to player.vimeo.com embed URL.
 * Preserves h=... (hash) and adds dnt=1.
 */
export function toVimeoEmbed(input: string): string {
  try {
    const raw = sanitizeUrlCandidate(input)
    const u = new URL(raw)
    const id = extractVimeoIdFromPath(u.pathname)
    if (!id) return raw

    const params = new URLSearchParams(u.search)
    const keep = new URLSearchParams()
    if (params.has("h")) keep.set("h", String(params.get("h")))
    // Do Not Track is safe; won’t affect playback
    keep.set("dnt", "1")

    const query = keep.toString()
    const hash = u.hash
    return `https://player.vimeo.com/video/${id}${query ? `?${query}` : ""}${hash || ""}`
  } catch {
    return input
  }
}

/**
 * Try to extract a Vimeo embed src from pasted HTML <iframe>.
 */
export function extractVimeoEmbedSrc(html: string): string | null {
  if (!html || !html.toLowerCase().includes("<iframe")) return null
  // Lightweight src extraction (avoid full HTML parser)
  const match = html.match(/src=["']([^"']+)["']/i)
  if (!match) return null
  const src = match[1]
  if (!/vimeo\.com/i.test(src)) return null
  try {
    // Ensure it’s absolute and normalized
    const u = new URL(src)
    if (u.hostname.replace(/^www\./, "") !== "player.vimeo.com") {
      // Not player domain; convert via toVimeoEmbed
      return toVimeoEmbed(u.toString())
    }
    // Ensure dnt=1 preserved/appended
    const params = u.searchParams
    if (!params.has("dnt")) params.set("dnt", "1")
    const normalized = `${u.origin}${u.pathname}?${params.toString()}${u.hash || ""}`
    return normalized
  } catch {
    return null
  }
}

/**
 * Normalize any Vimeo input: either a page/player URL or an <iframe> embed HTML.
 * Returns a player.vimeo.com URL suitable for iframes.
 */
export function normalizeVimeoInput(input: string): string {
  if (!input) return input
  if (input.toLowerCase().includes("<iframe")) {
    const src = extractVimeoEmbedSrc(input)
    return src ?? input
  }
  if (isVimeoUrl(input)) {
    return toVimeoEmbed(input)
  }
  return input
}
