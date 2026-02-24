function sanitizeUrlCandidate(input: string): string {
  return input.trim().replace(/[)\]\s]+$/g, "")
}

export function isYouTubeUrl(input: string): boolean {
  try {
    const u = new URL(sanitizeUrlCandidate(input))
    const h = u.hostname.replace(/^www\./, "")
    return h === "youtube.com" || h === "youtu.be" || h === "m.youtube.com"
  } catch {
    return false
  }
}

export function toYouTubeEmbed(input: string): string {
  try {
    const raw = sanitizeUrlCandidate(input)
    const u = new URL(raw)
    const h = u.hostname.replace(/^www\./, "")

    // youtu.be/VIDEO_ID
    if (h === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] || ""
      const t = u.searchParams.get("t") || u.searchParams.get("time_continue")
      const start = t ? `?start=${parseYouTubeStartSeconds(t)}` : ""
      return `https://www.youtube.com/embed/${id}${start}`
    }

    // youtube.com/watch?v=VIDEO_ID or with extra params
    if (u.pathname === "/watch" && u.searchParams.get("v")) {
      const id = (u.searchParams.get("v") || "").trim()
      const t = u.searchParams.get("t") || u.searchParams.get("time_continue")
      const start = t ? `?start=${parseYouTubeStartSeconds(t)}` : ""
      return `https://www.youtube.com/embed/${id}${start}`
    }

    // youtube.com/embed/VIDEO_ID (already good)
    if (u.pathname.startsWith("/embed/")) return raw

    // Shorts -> embed
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/").filter(Boolean)[1] || ""
      return `https://www.youtube.com/embed/${id}`
    }

    // Fallback: return original
    return raw
  } catch {
    return input
  }
}

function parseYouTubeStartSeconds(t: string): number {
  // supports e.g., "90", "1m30s", "1h2m3s"
  const num = Number(t)
  if (!Number.isNaN(num)) return Math.max(0, Math.floor(num))
  const match = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i.exec(t)
  if (!match) return 0
  const h = Number.parseInt(match[1] || "0", 10)
  const m = Number.parseInt(match[2] || "0", 10)
  const s = Number.parseInt(match[3] || "0", 10)
  return h * 3600 + m * 60 + s
}
