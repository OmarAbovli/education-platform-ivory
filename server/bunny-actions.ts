"use server"

import { buildBunnyEmbedUrl, buildBunnyHlsUrl } from "@/lib/bunny"
import { sql } from "@/server/db"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

type BunnyVideoApiItem = {
  guid: string
  title: string
  length: number // seconds
  thumbnailFileName?: string | null
  status?: number
}

type BunnyListResponse = {
  items: BunnyVideoApiItem[]
  totalItems: number
  currentPage: number
  itemsPerPage: number
}

type MetaResult =
  | { ok: true; title?: string; durationSeconds?: number; thumbnailUrl?: string }
  | { ok: false; error: string }

// -- Config Management --

async function requireTeacherId() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)
  if (!me || me.role !== "teacher") {
    throw new Error("Not authorized")
  }
  return me.id
}

export async function saveBunnyAccountKey(accountKey: string) {
  try {
    const teacherId = await requireTeacherId()
    await sql`
      UPDATE users 
      SET bunny_main_api_key = ${accountKey}
      WHERE id = ${teacherId}
    `
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function getBunnyAccountKey() {
  try {
    const teacherId = await requireTeacherId()
    const [user] = await sql`SELECT bunny_main_api_key FROM users WHERE id = ${teacherId}` as any[]
    return user?.bunny_main_api_key || null
  } catch {
    return null
  }
}

export async function listBunnyLibraries(accountKey?: string) {
  // If not provided, try to get from DB
  let key = accountKey
  if (!key) key = await getBunnyAccountKey()

  if (!key) return { ok: false, error: "Missing Account API Key" }

  try {
    const res = await fetch("https://api.bunny.net/videolibrary", {
      headers: {
        accept: "application/json",
        AccessKey: key
      }
    })

    if (!res.ok) {
      // Validation check
      if (res.status === 401) return { ok: false, error: "Invalid Account API Key" }
      return { ok: false, error: `Failed to fetch libraries: ${res.status}` }
    }

    const data = await res.json() as any[]
    // Map to simpler structure
    const libraries = data.map(lib => ({
      id: lib.Id,
      name: lib.Name,
      apiKey: lib.ApiKey // This is the READ-WRITE key for this specific library
    }))

    return { ok: true, libraries }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function saveBunnyConfig(apiKey: string, libraryId: string) {
  try {
    const teacherId = await requireTeacherId()
    await sql`
      UPDATE users 
      SET bunny_api_key = ${apiKey}, bunny_library_id = ${libraryId}
      WHERE id = ${teacherId}
    `
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function getBunnyConfig(): Promise<{ apiKey: string | null; libraryId: string | null; mainKey: string | null } | null> {
  try {
    const teacherId = await requireTeacherId()
    const [user] = await sql`SELECT bunny_api_key, bunny_library_id, bunny_main_api_key FROM users WHERE id = ${teacherId}` as any[]

    // Fallback to env if not in DB (for backward compatibility/admin usage)
    const apiKey = user?.bunny_api_key || process.env.BUNNY_STREAM_API_KEY
    const libraryId = user?.bunny_library_id || process.env.BUNNY_STREAM_LIBRARY_ID
    const mainKey = user?.bunny_main_api_key

    if (!apiKey || !libraryId) return { apiKey: null, libraryId: null, mainKey }
    return { apiKey, libraryId, mainKey }
  } catch {
    return null
  }
}

function buildThumbUrl(libraryId: string, item: BunnyVideoApiItem) {
  if (item.thumbnailFileName) {
    return `https://vz-${libraryId}.b-cdn.net${item.thumbnailFileName.startsWith("/") ? "" : "/"}${item.thumbnailFileName}`
  }
  return `https://vz-${libraryId}.b-cdn.net/${item.guid}/thumbnail.jpg`
}

// -- Actions --

export async function createBunnyVideo(title: string, targetLibraryId?: string) {
  const config = await getBunnyConfig()
  if (!config) return { ok: false, error: "Bunny.net not configured" }

  const apiKey = config.apiKey
  const libraryId = targetLibraryId || config.libraryId

  if (!apiKey || !libraryId) return { ok: false, error: "Missing Bunny API Key or Library ID" }

  try {
    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        AccessKey: apiKey
      },
      body: JSON.stringify({ title })
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Create failed: ${res.status} ${text}` }
    }

    const data = await res.json()
    return { ok: true, guid: data.guid, libraryId, apiKey }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function listBunnyVideos(params?: {
  page?: number
  itemsPerPage?: number
  search?: string
}) {
  const config = await getBunnyConfig()
  if (!config) {
    return { ok: false as const, error: "Bunny.net credentials missing. Please configure them in Settings." }
  }
  const { libraryId, apiKey } = config

  const page = params?.page ?? 1
  const itemsPerPage = params?.itemsPerPage ?? 12
  const search = params?.search?.trim() ?? ""

  const url = new URL(`https://video.bunnycdn.com/library/${libraryId}/videos`)
  url.searchParams.set("page", String(page))
  url.searchParams.set("itemsPerPage", String(itemsPerPage))
  if (search) url.searchParams.set("search", search)

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json", AccessKey: apiKey! },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false as const, error: `Bunny list failed: ${res.status} ${text}` }
  }

  const data = (await res.json()) as BunnyListResponse

  const items = data.items.map((it) => {
    const embedUrl = buildBunnyEmbedUrl(libraryId!, it.guid)
    const hlsUrl = buildBunnyHlsUrl(libraryId!, it.guid)
    const thumbnailUrl = buildThumbUrl(libraryId!, it)
    return {
      id: it.guid,
      title: it.title,
      durationSeconds: Math.round(it.length ?? 0),
      embedUrl,
      hlsUrl,
      thumbnailUrl,
      status: it.status ?? 0,
    }
  })

  return {
    ok: true as const,
    items,
    totalItems: data.totalItems,
    currentPage: data.currentPage,
    itemsPerPage: data.itemsPerPage,
  }
}

export async function getBunnyVideoMetadata(videoId: string): Promise<MetaResult> {
  const config = await getBunnyConfig()
  if (!config || !config.apiKey || !config.libraryId) {
    return { ok: false, error: "Bunny API credentials are not configured." }
  }
  const { libraryId, apiKey } = config

  try {
    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: { accept: "application/json", AccessKey: apiKey },
      cache: "no-store",
    })
    if (!res.ok) {
      return { ok: false, error: `Bunny API error: ${res.status}` }
    }
    const data = (await res.json()) as any
    return {
      ok: true,
      title: data?.title ?? undefined,
      durationSeconds: typeof data?.length === "number" ? Math.round(data.length) : undefined,
      thumbnailUrl: data?.thumbnailUrl ?? data?.thumbnail ?? undefined,
    }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error" }
  }
}
