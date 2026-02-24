function sanitizeUrlCandidate(input: string): string {
  // Trim whitespace and common trailing punctuation accidentally copied with the URL
  return input.trim().replace(/[)\]\s]+$/g, "")
}

export function extractDriveFileId(input: string): string | null {
  try {
    const raw = sanitizeUrlCandidate(input)
    const url = new URL(raw)
    if (!url.hostname.includes("drive.google.com")) return null

    // /file/d/{id}/view or /file/d/{id}/preview
    const parts = url.pathname.split("/").filter(Boolean)
    const idx = parts.findIndex((p) => p === "d")
    if (idx >= 0 && parts[idx + 1]) {
      const candidate = parts[idx + 1]
      // Basic guard: IDs are base64url-like; strip obvious bad chars
      return candidate.replace(/[^a-zA-Z0-9\-_]/g, "")
    }

    // /open?id=... or /uc?id=...
    const id = url.searchParams.get("id")
    if (id) return id.replace(/[^a-zA-Z0-9\-_]/g, "")

    return null
  } catch {
    return null
  }
}

/**
 * Normalize any Google Drive "view/open/preview" URL into a direct-download URL
 * that <video> can load. Requires the file to be shared with "Anyone with the link".
 * Note: Very large files may still be gated by Drive's virus-scan interstitial.
 */
export function normalizeGoogleDriveUrl(input: string): string {
  const id = extractDriveFileId(input)
  if (!id) return input
  return `https://drive.google.com/uc?export=download&id=${id}`
}

export function isGoogleDriveUrl(input: string): boolean {
  try {
    const u = new URL(sanitizeUrlCandidate(input))
    return u.hostname.includes("drive.google.com")
  } catch {
    return false
  }
}
