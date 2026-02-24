'use server'

import { sql } from './db'
import * as fs from 'fs'
import * as path from 'path'

// Load .env and .env.local manually for Server Actions in Next.js 15
function loadEnvLocal() {
  try {
    // Load .env first
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').trim()
          if (key && value) {
            process.env[key.trim()] = value
          }
        }
      }
      console.log('✅ Loaded .env manually')
    }

    // Then load .env.local (overrides .env)
    const envLocalPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8')
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').trim()
          if (key && value) {
            process.env[key.trim()] = value
          }
        }
      }
      console.log('✅ Loaded .env.local manually')
    }
  } catch (error) {
    console.error('Failed to load environment files:', error)
  }
}

loadEnvLocal()

// ====================================
// Groq AI Integration
// ====================================

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

async function callGroqAI(messages: GroqMessage[]): Promise<string> {
  // قراءة المفتاح من متغيرات البيئة وإزالة أي مسافات
  const apiKey = process.env.GROQ_API_KEY?.trim()

  if (!apiKey) {
    console.error('❌ [API] GROQ_API_KEY is not configured in environment variables')
    throw new Error('GROQ_API_KEY is not configured. Please add it to .env file')
  }

  console.log('✅ [API] Using GROQ_API_KEY from environment variables')
  console.log('🔑 [API] Key length:', apiKey.length)
  console.log('🔑 [API] Key starts with:', apiKey.substring(0, 10) + '...')
  console.log('🔑 [API] Key ends with:', '...' + apiKey.substring(apiKey.length - 10))

  try {
    console.log('📡 [API] Calling Groq API...')
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // أحدث نموذج مجاني
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      }),
    })

    console.log('📡 [API] Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Groq API error:', errorText)
      throw new Error(`Groq API error: ${response.statusText} - ${errorText}`)
    }

    const data: GroqResponse = await response.json()
    console.log('✅ [API] Groq response received successfully')
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
  } catch (error) {
    console.error('❌ [API] Groq AI Error:', error)
    throw error
  }
}

// ====================================
// Session Management
// ====================================

export async function startPracticeSession(
  studentId: string,
  topic?: string,
  mode: 'chat' | 'voice' = 'chat'
) {
  console.log('🔧 [Server] Starting practice session for student:', studentId)
  console.log('🔧 [Server] Topic:', topic, 'Mode:', mode)

  try {
    console.log('📊 [Server] Inserting session into database...')
    const [session] = await sql`
      INSERT INTO practice_sessions (student_id, topic, mode)
      VALUES (${studentId}, ${topic || null}, ${mode})
      RETURNING id, topic, mode, started_at
    `
    console.log('✅ [Server] Session created:', session.id)

    // رسالة ترحيبية من AI
    const systemPrompt = `You are an English language tutor helping Arabic-speaking students practice English. 
Your role is to:
- Have natural conversations about ${topic || 'various topics'}
- Correct grammar mistakes gently
- Suggest better vocabulary
- Encourage the student
- Be supportive and patient

Respond in a friendly, conversational way. Start by greeting the student warmly.`

    console.log('🤖 [Server] Calling Groq AI for welcome message...')
    const welcomeMessage = await callGroqAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Hello! I want to practice English.' },
    ])
    console.log('✅ [Server] AI response received:', welcomeMessage.substring(0, 50) + '...')

    // حفظ رسالة الترحيب
    console.log('💾 [Server] Saving welcome message...')
    await sql`
      INSERT INTO practice_messages (session_id, role, content)
      VALUES (${session.id}, 'ai', ${welcomeMessage})
    `
    console.log('✅ [Server] Welcome message saved')

    return {
      success: true,
      session: {
        id: session.id,
        topic: session.topic,
        mode: session.mode,
        startedAt: session.started_at,
      },
      welcomeMessage,
    }
  } catch (error) {
    console.error('❌ [Server] Error starting practice session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start practice session',
    }
  }
}

export async function sendMessage(sessionId: string, studentMessage: string) {
  try {
    // حفظ رسالة الطالب
    await sql`
      INSERT INTO practice_messages (session_id, role, content)
      VALUES (${sessionId}, 'student', ${studentMessage})
    `

    // جلب آخر 10 رسائل للسياق
    const previousMessages = await sql`
      SELECT role, content
      FROM practice_messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT 10
    `

    // جلب معلومات الجلسة
    const [session] = await sql`
      SELECT topic FROM practice_sessions WHERE id = ${sessionId}
    `

    // بناء سياق المحادثة
    const systemPrompt = `You are an English language tutor helping Arabic-speaking students practice English.

Your tasks:
1. Continue the conversation naturally about ${session?.topic || 'the current topic'}
2. If you notice grammar mistakes, gently correct them
3. If you see vocabulary that could be improved, suggest better words
4. Keep responses concise (2-3 sentences)
5. Be encouraging and supportive

Format your response naturally - don't label corrections explicitly in the conversation, but weave them in naturally.`

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.reverse().map((msg: any) => ({
        role: msg.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: msg.content,
      })),
    ]

    // الحصول على رد AI
    const aiResponse = await callGroqAI(messages)

    // تحليل رسالة الطالب للأخطاء
    const analysisPrompt = `Analyze this English sentence for grammar errors and vocabulary improvements:
"${studentMessage}"

Respond ONLY in valid JSON format (no markdown, no extra text):
{
  "hasErrors": boolean,
  "grammarCorrections": [{"error": "string", "correction": "string"}],
  "vocabularySuggestions": [{"word": "string", "betterWord": "string", "context": "string"}]
}`

    let analysis = {
      hasErrors: false,
      grammarCorrections: [],
      vocabularySuggestions: [],
    }

    try {
      const analysisResponse = await callGroqAI([
        { role: 'system', content: 'You are a grammar and vocabulary analyzer. Respond only with valid JSON.' },
        { role: 'user', content: analysisPrompt },
      ])

      // تنظيف الاستجابة من markdown
      const cleanedResponse = analysisResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      analysis = JSON.parse(cleanedResponse)
    } catch (error) {
      console.error('Error analyzing message:', error)
    }

    // حفظ رد AI مع التحليل
    await sql`
      INSERT INTO practice_messages (
        session_id, role, content, 
        has_grammar_errors, grammar_corrections, vocabulary_suggestions
      )
      VALUES (
        ${sessionId}, 'ai', ${aiResponse},
        ${analysis.hasErrors},
        ${JSON.stringify(analysis.grammarCorrections)},
        ${JSON.stringify(analysis.vocabularySuggestions)}
      )
    `

    // تحديث عدد الرسائل في الجلسة
    await sql`
      UPDATE practice_sessions
      SET total_messages = total_messages + 1
      WHERE id = ${sessionId}
    `

    return {
      success: true,
      aiResponse,
      analysis,
    }
  } catch (error) {
    console.error('Error sending message:', error)
    return {
      success: false,
      error: 'Failed to send message',
    }
  }
}

export async function endPracticeSession(sessionId: string) {
  try {
    // جلب معلومات الجلسة
    const [session] = await sql`
      SELECT started_at, total_messages, student_id
      FROM practice_sessions
      WHERE id = ${sessionId}
    `

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // حساب مدة الجلسة
    const duration = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    )

    // جلب جميع رسائل الطالب للتحليل
    const studentMessages = await sql`
      SELECT content, has_grammar_errors, grammar_corrections, vocabulary_suggestions
      FROM practice_messages
      WHERE session_id = ${sessionId} AND role = 'student'
    `

    // حساب الدرجات
    const totalMessages = studentMessages.length
    const messagesWithErrors = studentMessages.filter((m: any) => m.has_grammar_errors).length
    const grammarScore = Math.max(0, Math.round(((totalMessages - messagesWithErrors) / totalMessages) * 100))

    // جمع كل الأخطاء والاقتراحات
    const allGrammarErrors: any[] = []
    const allVocabSuggestions: any[] = []

    studentMessages.forEach((msg: any) => {
      if (msg.grammar_corrections) {
        allGrammarErrors.push(...msg.grammar_corrections)
      }
      if (msg.vocabulary_suggestions) {
        allVocabSuggestions.push(...msg.vocabulary_suggestions)
      }
    })

    const vocabularyScore = Math.max(60, Math.min(100, 100 - (allVocabSuggestions.length * 5)))
    const fluencyScore = Math.round((totalMessages / Math.max(1, duration / 60)) * 10) // رسائل في الدقيقة
    const overallScore = Math.round((grammarScore * 0.4) + (vocabularyScore * 0.3) + (fluencyScore * 0.3))

    // توليد نقاط القوة والضعف
    const strengths: string[] = []
    const weaknesses: string[] = []
    const suggestions: string[] = []

    if (grammarScore >= 80) strengths.push('Good grammar accuracy')
    else weaknesses.push('Grammar needs improvement')

    if (vocabularyScore >= 80) strengths.push('Good vocabulary usage')
    else suggestions.push('Try to use more varied vocabulary')

    if (fluencyScore >= 70) strengths.push('Good conversation flow')
    else suggestions.push('Practice more to improve fluency')

    if (totalMessages < 5) {
      suggestions.push('Try to have longer conversations for better practice')
    }

    // تحديث الجلسة
    await sql`
      UPDATE practice_sessions
      SET 
        status = 'completed',
        ended_at = NOW(),
        duration_seconds = ${duration},
        grammar_score = ${grammarScore},
        vocabulary_score = ${vocabularyScore},
        fluency_score = ${fluencyScore},
        overall_score = ${overallScore},
        strengths = ${strengths},
        weaknesses = ${weaknesses},
        suggestions = ${suggestions},
        common_mistakes = ${JSON.stringify(allGrammarErrors.slice(0, 5))}
      WHERE id = ${sessionId}
    `

    return {
      success: true,
      report: {
        duration,
        totalMessages,
        scores: {
          grammar: grammarScore,
          vocabulary: vocabularyScore,
          fluency: fluencyScore,
          overall: overallScore,
        },
        strengths,
        weaknesses,
        suggestions,
        commonMistakes: allGrammarErrors.slice(0, 5),
      },
    }
  } catch (error) {
    console.error('Error ending practice session:', error)
    return {
      success: false,
      error: 'Failed to end session',
    }
  }
}

export async function getPracticeSessions(studentId: string, limit = 10) {
  try {
    const sessions = await sql`
      SELECT 
        id, topic, mode, started_at, ended_at, duration_seconds,
        total_messages, grammar_score, vocabulary_score, fluency_score, overall_score,
        status
      FROM practice_sessions
      WHERE student_id = ${studentId}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `

    return { success: true, sessions }
  } catch (error) {
    console.error('Error fetching practice sessions:', error)
    return { success: false, error: 'Failed to fetch sessions' }
  }
}

export async function getSessionDetails(sessionId: string) {
  try {
    const [session] = await sql`
      SELECT * FROM practice_sessions WHERE id = ${sessionId}
    `

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    const messages = await sql`
      SELECT role, content, has_grammar_errors, grammar_corrections, vocabulary_suggestions, created_at
      FROM practice_messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `

    return { success: true, session, messages }
  } catch (error) {
    console.error('Error fetching session details:', error)
    return { success: false, error: 'Failed to fetch session details' }
  }
}

export async function getPracticeStats(studentId: string) {
  try {
    const [stats] = await sql`
      SELECT * FROM practice_stats WHERE student_id = ${studentId}
    `

    if (!stats) {
      return {
        success: true,
        stats: {
          totalSessions: 0,
          totalMessages: 0,
          totalDurationMinutes: 0,
          avgGrammarScore: 0,
          avgVocabularyScore: 0,
          avgFluencyScore: 0,
          avgOverallScore: 0,
          streakDays: 0,
        },
      }
    }

    return {
      success: true,
      stats: {
        totalSessions: stats.total_sessions,
        totalMessages: stats.total_messages,
        totalDurationMinutes: stats.total_duration_minutes,
        avgGrammarScore: parseFloat(stats.avg_grammar_score) || 0,
        avgVocabularyScore: parseFloat(stats.avg_vocabulary_score) || 0,
        avgFluencyScore: parseFloat(stats.avg_fluency_score) || 0,
        avgOverallScore: parseFloat(stats.avg_overall_score) || 0,
        streakDays: stats.streak_days,
        lastPracticeDate: stats.last_practice_date,
      },
    }
  } catch (error) {
    console.error('Error fetching practice stats:', error)
    return { success: false, error: 'Failed to fetch stats' }
  }
}
