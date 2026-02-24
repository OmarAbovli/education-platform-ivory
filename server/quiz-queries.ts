'use server'

import { sql } from '@/server/db'

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
    SELECT id, title, video_id, description, time_limit_minutes, shuffle_questions, shuffle_options
    FROM quizzes WHERE id = ${quizId} AND quiz_type = 'native';
  `
  if (!quiz) return null

  let questions = await sql`
    SELECT id, question_text, "order", options
    FROM questions
    WHERE quiz_id = ${quizId}
    ORDER BY "order" ASC;
  `

  if (quiz.shuffle_questions) {
    questions = shuffle(questions)
  }

  // Remove the is_correct flag from the options before sending to the client
  const sanitizedQuestions = questions.map((q) => ({
    ...q,
    // TODO: Fix shuffling. The index of the shuffled option on the client doesn't match the server index.
    // For now, we disable shuffling to ensure grading is correct.
    options: q.options.map((o: any) => ({ text: o.text })),
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
  let query = sql`
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
  `

  const whereClauses = []
  if (filters.grade) {
    whereClauses.push(sql`s.grade = ${filters.grade}`)
  }
  if (filters.month) {
    whereClauses.push(sql`v.month = ${filters.month}`)
  }
  if (filters.videoId) {
    whereClauses.push(sql`v.id = ${filters.videoId}`)
  }

  if (whereClauses.length > 0) {
    query = sql`${query} WHERE ${sql.join(whereClauses, sql` AND `)}`
  }

  query = sql`${query} ORDER BY qs.submitted_at DESC`

  const results = await query

  return results
}

import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function getQuizzesByTeacher() {
    const cookieStore = cookies()
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
    const cookieStore = cookies()
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
