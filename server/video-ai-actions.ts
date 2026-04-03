"use server"

import { sql } from "@/server/db"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { put } from "@vercel/blob"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { randomUUID } from "crypto"

// -- Types --

export type VideoAiInsight = {
  summaryAr: string
  summaryEn: string
  keyPointsAr: string[]
  keyPointsEn: string[]
  questionsAr: { q: string; a: string }[]
  questionsEn: { q: string; a: string }[]
  notesAr: string
  notesEn: string
}

// -- Helpers --

async function getGeminiClient(teacherId: string) {
  const [user] = await sql`SELECT gemini_api_key FROM users WHERE id = ${teacherId} LIMIT 1` as any[]
  const apiKey = user?.gemini_api_key || process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error("Gemini API Key not configured. Please add it in Teacher Settings.")
  }
  
  return new GoogleGenerativeAI(apiKey)
}

/**
 * Fetches the transcript for a Bunny.net video.
 * Assumes the video has captions enabled.
 */
async function fetchBunnyTranscript(libraryId: string, videoId: string, apiKey: string): Promise<string> {
  try {
    // 1. Get captions list from Bunny API
    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: { accept: "application/json", AccessKey: apiKey },
    })
    
    if (!res.ok) throw new Error("Failed to fetch video metadata")
    
    const data = await res.json()
    const captions = data.captions || []
    
    if (captions.length === 0) {
      throw new Error("No captions found for this video. Please enable 'Auto-captions' in Bunny.net.")
    }
    
    // 2. Fetch the first available caption file (usually 'en' or 'ar')
    const caption = captions[0]
    const label = caption.label || "English"
    const srclang = caption.srclang || "en"
    
    // Construct VTT URL (standard Bunny pattern)
    const vttUrl = `https://vz-${libraryId}.b-cdn.net/${videoId}/captions/${srclang}.vtt`
    const vttRes = await fetch(vttUrl)
    
    if (!vttRes.ok) throw new Error(`Could not fetch VTT file: ${vttRes.status}`)
    
    const vttText = await vttRes.text()
    
    // 3. Simple VTT to Plain Text parser
    return vttText
      .replace(/WEBVTT/g, "")
      .replace(/\d\d:\d\d:\d\d\.\d\d\d --> \d\d:\d\d:\d\d\.\d\d\d/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim()
  } catch (error: any) {
    console.error("fetchBunnyTranscript error:", error)
    throw error
  }
}

// -- Main Actions --

export async function generateVideoInsights(videoId: string) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const me = await getCurrentUser(sessionId)
    if (!me || me.role !== "teacher") throw new Error("Unauthorized")

    // 1. Get Video Details
    const [video] = await sql`
      SELECT id, title, url, teacher_id 
      FROM videos 
      WHERE id = ${videoId} AND teacher_id = ${me.id} 
      LIMIT 1
    ` as any[]
    
    if (!video) throw new Error("Video not found")

    // 2. Get Bunny Config
    const [teacher] = await sql`
      SELECT bunny_api_key, bunny_library_id, gemini_api_key 
      FROM users WHERE id = ${me.id} 
      LIMIT 1
    ` as any[]
    
    const bunnyKey = teacher?.bunny_api_key || process.env.BUNNY_STREAM_API_KEY
    const libraryId = teacher?.bunny_library_id || process.env.BUNNY_STREAM_LIBRARY_ID
    
    if (!bunnyKey || !libraryId) throw new Error("Bunny.net not configured")

    // Extract Bunny ID from URL (e.g., .../{libraryId}/{videoId}/playlist.m3u8)
    const bunnyIdMatch = video.url.match(/([0-9a-fA-F-]{36})/)
    const bunnyVideoId = bunnyIdMatch ? bunnyIdMatch[1] : null
    
    if (!bunnyVideoId) throw new Error("Could not detect Bunny Video ID from URL")

    // 3. Get Transcript
    const transcript = await fetchBunnyTranscript(libraryId, bunnyVideoId, bunnyKey)
    
    // Save transcript to DB for future chatbot use
    await sql`
      INSERT INTO video_transcripts (video_id, content)
      VALUES (${videoId}, ${transcript})
      ON CONFLICT (video_id) DO UPDATE SET content = EXCLUDED.content
    `

    // 4. Generate AI Insights with Gemini
    const genAI = await getGeminiClient(me.id)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      As an expert educational assistant, analyze the following video transcript and provide a comprehensive learning guide in BOTH Arabic and English.
      
      Video Title: ${video.title}
      Transcript: ${transcript.substring(0, 50000)} // Safety limit for Flash
      
      Your response MUST be a valid JSON object with the following structure:
      {
        "summaryAr": "ملخص شامل للدرس...",
        "summaryEn": "Comprehensive lesson summary...",
        "keyPointsAr": ["النقطة الأولى", "النقطة الثانية"...],
        "keyPointsEn": ["First point", "Second point"...],
        "questionsAr": [{"q": "السؤال؟", "a": "الإجابة"}],
        "questionsEn": [{"q": "Question?", "a": "Answer"}],
        "notesAr": "ملاحظات إضافية هامة...",
        "notesEn": "Important additional notes..."
      }
      
      Focus on pedagogical value, clarity, and precision in both languages.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim()
    
    const insights = JSON.parse(text) as VideoAiInsight

    // 5. Save Insights to DB
    await sql`
      INSERT INTO video_ai_insights (
        video_id, summary_ar, summary_en, 
        key_points_ar, key_points_en, 
        questions_ar, questions_en, 
        notes_ar, notes_en
      )
      VALUES (
        ${videoId}, ${insights.summaryAr}, ${insights.summaryEn}, 
        ${JSON.stringify(insights.keyPointsAr)}, ${JSON.stringify(insights.keyPointsEn)}, 
        ${JSON.stringify(insights.questionsAr)}, ${JSON.stringify(insights.questionsEn)}, 
        ${insights.notesAr}, ${insights.notesEn}
      )
      ON CONFLICT (video_id) DO UPDATE SET
        summary_ar = EXCLUDED.summary_ar,
        summary_en = EXCLUDED.summary_en,
        key_points_ar = EXCLUDED.key_points_ar,
        key_points_en = EXCLUDED.key_points_en,
        questions_ar = EXCLUDED.questions_ar,
        questions_en = EXCLUDED.questions_en,
        notes_ar = EXCLUDED.notes_ar,
        notes_en = EXCLUDED.notes_en,
        created_at = NOW()
    `

    return { ok: true, insights }
  } catch (error: any) {
    console.error("generateVideoInsights error:", error)
    return { ok: false, error: error.message }
  }
}

/**
 * Generates a branded PDF and stores it in Vercel Blob
 */
export async function generateStudyGuidePDF(videoId: string, lang: 'ar' | 'en') {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const me = await getCurrentUser(sessionId)
    if (!me || me.role !== "teacher") throw new Error("Unauthorized")

    // 1. Get Insights
    const [insights] = await sql`SELECT * FROM video_ai_insights WHERE video_id = ${videoId} LIMIT 1` as any[]
    if (!insights) throw new Error("Insights not found. Generate them first.")

    const [video] = await sql`SELECT title FROM videos WHERE video_id = ${videoId} LIMIT 1` as any[]

    // 2. Create PDF
    const doc = new jsPDF()
    const isAr = lang === 'ar'
    
    // Header
    doc.setFillColor(16, 185, 129) // Emerald-500
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text("Ivory Learning Platform", 10, 20)
    
    doc.setFontSize(14)
    doc.text(isAr ? "دليل الدراسة الذكي" : "Smart Study Guide", 10, 30)

    // Content
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.text(video?.title || "Lesson Guide", 10, 55)

    doc.setFontSize(12)
    const summary = isAr ? insights.summary_ar : insights.summary_en
    const splitSummary = doc.splitTextToSize(summary || "", 180)
    doc.text(splitSummary, 10, 65)

    // Key Points
    let y = 65 + (splitSummary.length * 7) + 10
    doc.setFontSize(16)
    doc.text(isAr ? "النقاط الأساسية" : "Key Takeaways", 10, y)
    y += 10
    
    doc.setFontSize(11)
    const points = isAr ? insights.key_points_ar : insights.key_points_en
    points.forEach((p: string, i: number) => {
       doc.text(`• ${p}`, 15, y)
       y += 7
    })

    // Questions
    y += 10
    doc.setFontSize(16)
    doc.text(isAr ? "اختبر نفسك" : "Self-Assessment", 10, y)
    y += 10

    const questions = isAr ? insights.questions_ar : insights.questions_en
    questions.forEach((q: any) => {
       const splitQ = doc.splitTextToSize(`Q: ${q.q}`, 170)
       doc.text(splitQ, 10, y)
       y += (splitQ.length * 6) + 2
       doc.setTextColor(100, 100, 100)
       doc.text(`A: ${q.a}`, 15, y)
       doc.setTextColor(0, 0, 0)
       y += 10
    })

    // 3. Upload to Blob
    const pdfOutput = doc.output("arraybuffer")
    const fileName = `study_guide_${videoId}_${lang}.pdf`
    
    const { url } = await put(fileName, pdfOutput, {
      access: 'public',
      contentType: 'application/pdf',
    })

    // 4. Update DB
    if (isAr) {
      await sql`UPDATE video_ai_insights SET pdf_url_ar = ${url} WHERE video_id = ${videoId}`
    } else {
      await sql`UPDATE video_ai_insights SET pdf_url_en = ${url} WHERE video_id = ${videoId}`
    }

    return { ok: true, url }
  } catch (error: any) {
    console.error("generateStudyGuidePDF error:", error)
    return { ok: false, error: error.message }
  }
}

/**
 * Interactive Student Chatbot logic
 */
export async function askVideoAI(videoId: string, question: string, history: {role: string, parts: {text: string}[]}[]) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const me = await getCurrentUser(sessionId)
    if (!me) throw new Error("Unauthorized")

    // 1. Get Transcript
    const [trans] = await sql`SELECT content FROM video_transcripts WHERE video_id = ${videoId} LIMIT 1` as any[]
    if (!trans) throw new Error("Transcript not found for this video.")

    // 2. Get AI Client (Search for any teacher key or use default)
    const [video] = await sql`SELECT teacher_id FROM videos WHERE id = ${videoId} LIMIT 1` as any[]
    const genAI = await getGeminiClient(video.teacher_id)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `You are a helpful assistant for this educational video. Use the following context to answer student questions. Context (Video Transcript): ${trans.content.substring(0, 40000)}` }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I will answer all questions based on the video transcript provided." }],
        },
        ...history
      ],
    })

    const result = await chat.sendMessage(question)
    const response = await result.response
    return { ok: true, text: response.text() }
  } catch (error: any) {
    console.error("askVideoAI error:", error)
    return { ok: false, error: error.message }
  }
}

/**
 * Generates an AI MCQ Quiz for a specific lesson and stores it in the DB.
 */
export async function generateLessonAiQuiz(videoId: string, difficulty: 'easy' | 'medium' | 'hard') {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const me = await getCurrentUser(sessionId)
    if (!me) throw new Error("Unauthorized")

    // 1. Check if a quiz of this type/difficulty already exists for this video
    const titleHash = `AI Quiz - ${difficulty.toUpperCase()}`
    const [existing] = await sql`
      SELECT id FROM quizzes 
      WHERE video_id = ${videoId} AND title = ${titleHash} AND quiz_type = 'ai_lesson'
      LIMIT 1
    ` as any[]
    
    if (existing) return { ok: true, quizId: existing.id }

    // 2. Fetch Transcript
    const [trans] = await sql`SELECT content FROM video_transcripts WHERE video_id = ${videoId} LIMIT 1` as any[]
    if (!trans) throw new Error("No transcript found. Generate insights first.")

    // 3. Get Video Title
    const [video] = await sql`SELECT title, teacher_id FROM videos WHERE id = ${videoId} LIMIT 1` as any[]
    
    // 4. Generate with Gemini
    const genAI = await getGeminiClient(video.teacher_id)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      As an expert educator, create a high-quality MCQ quiz for the lesson titled: "${video.title}".
      Use the following transcript as context: ${trans.content.substring(0, 150000)}
      
      Difficulty Level: ${difficulty.toUpperCase()}
      
      Your response MUST be a valid JSON array of 10 objects. Each object MUST have this structure:
      {
        "question": "The question text...",
        "options": [
          {"text": "Option 1", "is_correct": true},
          {"text": "Option 2", "is_correct": false},
          {"text": "Option 3", "is_correct": false},
          {"text": "Option 4", "is_correct": false}
        ],
        "feedback": "Detailed explanation of why the correct answer is right and common pitfalls..."
      }
      
      The questions must be pedagogically sound and match the difficulty level. Use the same language as the transcript (primarily Arabic if it is an Arabic lesson).
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim()
    const questions = JSON.parse(text) as any[]

    // 5. Store in DB (Standard Quiz Table)
    const quizId = "q_ai_" + randomUUID()
    await sql`
      INSERT INTO quizzes (id, teacher_id, video_id, title, quiz_type, description, time_limit_minutes, passing_score, max_attempts)
      VALUES (
        ${quizId}, ${video.teacher_id}, ${videoId}, ${titleHash}, 'ai_lesson', 
        ${`AI Generated ${difficulty} quiz for: ${video.title}`}, 15, 60, 0
      )
    `

    for (let i = 0; i < questions.length; i++) {
       const q = questions[i]
       const qId = "qq_ai_" + randomUUID()
       await sql`
         INSERT INTO questions (id, quiz_id, question_text, "order", options, feedback)
         VALUES (${qId}, ${quizId}, ${q.question}, ${i + 1}, ${JSON.stringify(q.options)}, ${q.feedback})
       `
    }

    return { ok: true, quizId }
  } catch (error: any) {
    console.error("generateLessonAiQuiz error:", error)
    return { ok: false, error: error.message }
  }
}

/**
 * Custom Multi-Lesson Exam Generator
 */
export async function generateCustomAiExam(videoIds: string[], params: { count: number, difficulty: string, focus: string }) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("session_id")?.value
    const me = await getCurrentUser(sessionId)
    if (!me) throw new Error("Unauthorized")

    // 1. Fetch Transcripts
    const transcriptsResult = await sql`
      SELECT vt.content, v.title FROM video_transcripts vt
      JOIN videos v ON vt.video_id = v.id
      WHERE vt.video_id IN (${videoIds})
    ` as any[]
    
    if (transcriptsResult.length === 0) throw new Error("No transcripts found for selected lessons.")
    
    const combinedTranscript = transcriptsResult.map(t => `--- LESSON: ${t.title} ---\n${t.content}`).join("\n\n")
    const teacherId = (await sql`SELECT teacher_id FROM videos WHERE id = ${videoIds[0]} LIMIT 1` as any[])[0]?.teacher_id

    // 2. Get Student Info (to store grade/creator)
    const [student] = await sql`SELECT name, grade FROM users WHERE id = ${me.id} LIMIT 1` as any[]
    const studentGrade = student?.grade || 0
    const studentName = student?.name || "Student"

    // 2. Generate with Gemini
    const genAI = await getGeminiClient(teacherId)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      Create a COMPREHENSIVE custom exam for the student.
      Selected Lessons: ${transcriptsResult.map(t => t.title).join(", ")}
      Custom Focus: ${params.focus || "General assessment of all topics"}
      Difficulty: ${params.difficulty}
      Target Question Count: ${params.count || 20}
      
      Combined Context: ${combinedTranscript.substring(0, 150000)}
      
      Response MUST be a JSON array of objects:
      {
        "question": "Question text...",
        "options": [{"text": "A", "is_correct": true}, ...],
        "feedback": "Why it's correct..."
      }
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim()
    const questions = JSON.parse(text) as any[]

    // 3. Store as a 'Custom AI Exam'
    const quizId = "q_cust_" + randomUUID()
    const examTitle = `Custom AI Exam by ${studentName} - ${new Date().toLocaleDateString()}`
    
    await sql`
      INSERT INTO quizzes (
        id, teacher_id, title, quiz_type, description, 
        time_limit_minutes, passing_score, max_attempts,
        student_creator_id, grade
      )
      VALUES (
        ${quizId}, ${teacherId}, ${examTitle}, 'ai_custom', 
        ${`Custom exam covering ${transcriptsResult.length} lessons. Focus: ${params.focus}`}, 
        ${Math.max(15, (params.count || 20) * 1.5)}, 50, 1,
        ${me.id}, ${studentGrade}
      )
    `

    for (let i = 0; i < questions.length; i++) {
       const q = questions[i]
       const qId = "qq_ai_" + randomUUID()
       await sql`
         INSERT INTO questions (id, quiz_id, question_text, "order", options, feedback)
         VALUES (${qId}, ${quizId}, ${q.question}, ${i + 1}, ${JSON.stringify(q.options)}, ${q.feedback})
       `
    }

    return { ok: true, quizId }
  } catch (error: any) {
    console.error("generateCustomAiExam error:", error)
    return { ok: false, error: error.message }
  }
}
