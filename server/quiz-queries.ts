'use server'

import { sql, pool } from '@/server/db'

// Fisher-Yates shuffle algorithm
function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function getQuizForStudent(quizId: string) {
  const [quiz] = await sql`
    SELECT id, title, video_id, description, time_limit_minutes, shuffle_questions, shuffle_options, quiz_type
    FROM quizzes WHERE id = ${quizId};
  `
  if (!quiz) return null
 
  let questions = await sql`
    SELECT id, question_text, "order", options, feedback
    FROM questions
    WHERE quiz_id = ${quizId}
    ORDER BY "order" ASC;
  `

  if (quiz.shuffle_questions) {
    questions = shuffle(questions)
  }

  // If it's an AI quiz, we can include the is_correct flag for "Instant Feedback" learning mode
  // Otherwise, we sanitize it for formal exams.
  const isAi = quiz.quiz_type?.startsWith('ai_');
  
  const sanitizedQuestions = questions.map((q: any) => ({
    ...q,
    options: q.options.map((o: any) => {
      const opt: any = { text: o.text };
      if (isAi) opt.is_correct = o.is_correct;
      return opt;
    }),
  }))

  return { ...quiz, questions: sanitizedQuestions }
}

export async function getQuizResults(
  filters: {
    grade?: number
    month?: number
    videoId?: string
  } = {}
) {
  if (!pool) throw new Error("Database pool not configured");

  let whereClauses = []
  let params = []
  
  if (filters.grade) {
    whereClauses.push(`s.grade = $${params.length + 1}`)
    params.push(filters.grade)
  }
  if (filters.month) {
    whereClauses.push(`v.month = $${params.length + 1}`)
    params.push(filters.month)
  }
  if (filters.videoId) {
    whereClauses.push(`v.id = $${params.length + 1}`)
    params.push(filters.videoId)
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const { rows: results } = await pool.query(`
    SELECT
      qs.id AS submission_id,
      qs.score,
      qs.submitted_at,
      s.id AS student_id,
      s.name AS student_name,
      v.id AS video_id,
      v.title AS video_title,
      v.month,
      q.id AS quiz_id,
      q.title AS quiz_title
    FROM quiz_submissions qs
    JOIN users s ON s.id = qs.student_id
    JOIN quizzes q ON q.id = qs.quiz_id
    LEFT JOIN videos v ON v.id = q.video_id
    ${whereStr}
    ORDER BY qs.submitted_at DESC
  `, params);

  return results
}

import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function getQuizzesByTeacher() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionCookie)
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new Error('Unauthorized')
    }

    const quizzes = await sql`
        SELECT 
            q.id,
            q.title,
            v.title as video_title,
            q.created_at,
            (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
        FROM quizzes q
        LEFT JOIN videos v ON q.video_id = v.id
        WHERE q.teacher_id = ${user.id}
        ORDER BY q.created_at DESC;
    `
    return quizzes;
}

export async function getQuizForEditing(quizId: string) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session_id")?.value
    const user = await getCurrentUser(sessionCookie)
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      throw new Error('Unauthorized')
    }

    const [quiz] = await sql`
        SELECT id, title, video_id, description, time_limit_minutes, passing_score, max_attempts, shuffle_questions, shuffle_options, teacher_id
        FROM quizzes WHERE id = ${quizId};
    `
    if (!quiz) return null;

    if (user.role === 'teacher' && quiz.teacher_id !== user.id) {
        throw new Error('Forbidden');
    }

    const questions = await sql`
        SELECT id, question_text, "order", options, feedback
        FROM questions
        WHERE quiz_id = ${quizId}
        ORDER BY "order" ASC;
    `

    return { ...quiz, questions };
}

export async function getQuizSubmission(submissionId: string) {
  const [submission] = await sql`
    SELECT id, quiz_id, student_id, score, submitted_at
    FROM quiz_submissions
    WHERE id = ${submissionId};
  `
  if (!submission) return null

  const [quiz] = await sql`
    SELECT id, title, passing_score FROM quizzes WHERE id = ${submission.quiz_id};
  `

  const questions = await sql`
    SELECT id, question_text, options, feedback
    FROM questions
    WHERE quiz_id = ${submission.quiz_id}
    ORDER BY "order" ASC;
  `

  const studentAnswers = await sql`
    SELECT question_id, selected_option_index, is_correct
    FROM student_answers
    WHERE submission_id = ${submissionId};
  `

  const detailedQuestions = questions.map(q => {
    const studentAnswer = studentAnswers.find(sa => sa.question_id === q.id)
    return {
      ...q,
      student_answer: studentAnswer,
    }
  })

  return { ...submission, quiz, questions: detailedQuestions }
}

/**
 * 🌍 Get Community Shared AI Exams (Grade-Specific)
 */
export async function getCommunityQuizzes() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionId)
  if (!user) return []

  const quizzes = await sql`
    SELECT 
      q.id,
      q.title,
      q.description,
      q.time_limit_minutes,
      q.passing_score,
      q.created_at,
      u.name as creator_name,
      (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count,
      (SELECT COUNT(*) FROM quiz_submissions WHERE quiz_id = q.id) as total_enrollment
    FROM quizzes q
    JOIN users u ON u.id = q.student_creator_id
    WHERE q.quiz_type = 'ai_custom'
      AND q.grade = ${user.grade}
    ORDER BY q.created_at DESC
    LIMIT 50;
  `
  return quizzes
}
