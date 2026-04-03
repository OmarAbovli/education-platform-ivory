"use server"

import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

const GETIMG_API_KEY = process.env.GETIMG_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export type AiModelType = "pollinations" | "getimg" | "gemini"

async function requireTeacher() {
    const cookieStore = await cookies()
    const me = await getCurrentUser(cookieStore.get("session_id")?.value)
    if (!me || me.role !== "teacher") throw new Error("Unauthorized")
    return me
}

/** Use Gemini text API to enhance description into a richer thumbnail context */
async function enhanceDescription(topic: string): Promise<string> {
    if (!GEMINI_API_KEY) return topic
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Summarize this educational video topic in one punchy line (max 8 words): "${topic}"` }] }],
            }),
            signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
            const data = await res.json()
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (text && text.length > 3) return text
        }
    } catch { /* fallback to original */ }
    return topic
}

/**
 * Generate thumbnail using getimg.ai Essential API (paid, high quality).
 */
async function generateWithGetimg(prompt: string): Promise<{ ok: true; imageBase64: string } | { ok: false; error: string }> {
    if (!GETIMG_API_KEY) {
        return { ok: false, error: "GETIMG_API_KEY is not set in .env. Get a free key at getimg.ai" }
    }
    try {
        const res = await fetch("https://api.getimg.ai/v1/essential/text-to-image", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${GETIMG_API_KEY}` },
            body: JSON.stringify({ prompt, style: "photorealism", aspect_ratio: "16:9", output_format: "jpeg" }),
            signal: AbortSignal.timeout(40000),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as any
            if (err?.error?.code === "insufficient_quota") return { ok: false, error: "QUOTA_EXCEEDED" }
            return { ok: false, error: err?.error?.message ?? `getimg error ${res.status}` }
        }
        const data = await res.json()
        return { ok: true, imageBase64: data.image }
    } catch (e: any) {
        return { ok: false, error: e.message ?? "getimg request failed" }
    }
}

/**
 * Main export: generate thumbnail.
 *
 * For pollinations/gemini: returns a localThumbnailUrl (built from /api/generate-thumbnail)
 *   so the browser fetches it directly — no external APIs needed.
 * For getimg: returns imageBase64 from getimg.ai.
 */
export async function generateProfessionalThumbnail(
    videoContext: string,
    modelType: AiModelType = "gemini",
    category?: string
) {
    await requireTeacher()

    if (modelType === "pollinations" || modelType === "gemini") {
        // Optionally enhance the title with Gemini text
        const enhancedTitle = await enhanceDescription(videoContext)
        // Return a local URL — the browser will call /api/generate-thumbnail
        const params = new URLSearchParams({
            title: enhancedTitle,
            description: videoContext.slice(0, 100),
            category: category ?? "Education",
        })
        const localThumbnailUrl = `/api/generate-thumbnail?${params.toString()}`
        return { ok: true as const, localThumbnailUrl, imageBase64: null, pollinationsUrl: null }
    }

    if (modelType === "getimg") {
        const prompt = `Educational YouTube thumbnail, topic: "${videoContext}". Professional male teacher, futuristic studio, bold "YourPlatform" branding, 4K cinematic style.`
        const result = await generateWithGetimg(prompt)
        if (!result.ok) return { ok: false as const, error: result.error }
        return { ok: true as const, imageBase64: result.imageBase64, localThumbnailUrl: null, pollinationsUrl: null }
    }

    return { ok: false as const, error: "Unknown model type" }
}

export type { AiModelType as AiProviderType }
