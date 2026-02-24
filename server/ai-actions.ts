"use server"

import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

const GETIMG_API_KEY = process.env.GETIMG_API_KEY || "key-4khJ1gczZEMRW8cPfaJSRGYXGnYt7j030odCJfhqSQ5E3mNcmFnvYsb3SkjCSF7QamrG4ydnkU7sw87T5HfUsVJM0UUQ1QB"
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBwtWhxvgpDtPZkcmj6CZihGs500vLij_U"

export type AiModelType = "pollinations" | "getimg" | "gemini"

export async function generateProfessionalThumbnail(videoContext: string, modelType: AiModelType = "pollinations") {
    const cookieStore = await cookies()
    const me = await getCurrentUser(cookieStore.get("session_id")?.value)

    if (!me || me.role !== "teacher") {
        throw new Error("Unauthorized")
    }

    try {
        // 1. Prompt Engineering with Gemini for high-quality results
        let enhancedPrompt = videoContext

        // Always use Gemini to enhance the prompt if we have a key
        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
            const geminiResponse = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `
                You are a senior art director. Create a HIGH-IDENTITY AI image prompt for an educational platform.
                
                TOPIC: "${videoContext}"
                
                MANDATORY RULES:
                1. SUBJECT: Exactly ONE person. A charismatic, professional middle-eastern man (the teacher) in his 30s. Smart business attire (navy suit). High-end look.
                2. NO CHILDREN: NEVER draw children, kids, or students. Even if the topic is for primary school, focus ONLY on the adult teacher.
                3. BRANDING: The word "YourPlatform" MUST be written in huge, modern, bold 3D letters at the top. This is the platform identity.
                4. SECONDARY TEXT: Include bold floating English keywords from the topic (e.g., "LEARN", "EXCEL", "SUCCESS").
                5. ENVIRONMENT: A futuristic high-tech educational studio. Glowing blue and gold lighting. 
                6. STYLE: Highly detailed 4k, cinematic, photorealistic, YouTube Thumbnail style.
                
                Respond with the final prompt only. 
              `
                        }]
                    }]
                })
            })
            const geminiData = await geminiResponse.json()
            enhancedPrompt = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || videoContext
        } catch (e) {
            console.warn("Gemini prompt enhancement failed, using raw context", e)
        }

        // 2. Generation Logic based on selected model
        if (modelType === "getimg") {
            const response = await fetch("https://api.getimg.ai/v1/essential/text-to-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GETIMG_API_KEY}`,
                },
                body: JSON.stringify({
                    prompt: enhancedPrompt,
                    style: "photorealism",
                    aspect_ratio: "16:9",
                    output_format: "jpeg",
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                if (errData.error?.code === "insufficient_quota") {
                    throw new Error("QUOTA_EXCEEDED")
                }
                throw new Error(errData.error?.message || "Getimg API Failure")
            }

            const data = await response.json()
            return { ok: true, imageBase64: data.image }
        }

        // Default to Pollinations (Free/Unlimited)
        // FORCE 'flux' model for all free/gemini paths to get better text and quality
        const pollModel = "&model=flux"
        const seed = Math.floor(Math.random() * 1000000)
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1280&height=720&nologo=true&seed=${seed}${pollModel}`

        const imageResponse = await fetch(pollinationsUrl)
        if (!imageResponse.ok) throw new Error("Pollinations Service failed")

        const arrayBuffer = await imageResponse.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        return { ok: true, imageBase64: base64 }

    } catch (error: any) {
        console.error("AI Generation Error:", error)
        return { ok: false, error: error.message }
    }
}
