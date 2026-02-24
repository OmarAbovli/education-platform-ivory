"use server"

import { cookies } from "next/headers"
import { sql } from "./db"
import { getCurrentUser } from "@/lib/auth"

// Types
export type ExamQuestion = {
  id?: string
  question_text: string
  question_order: number
  points: number
  choices: {
    choice_text: string
    is_correct: boolean
    choice_order: number
  }[]
}

export type CreateExamInput = {
  title: string
  description?: string
  grade: 1 | 2 | 3
  duration_minutes: number
  scheduled_at: string // ISO string
  passing_score: number
  shuffle_questions?: boolean
  shuffle_choices?: boolean
  allow_retry?: boolean
  max_attempts?: number | null
  show_correct_answers?: boolean
  questions: ExamQuestion[]
}

export type LiveExam = {
  id: string
  teacher_id: string
  title: string
  description: string | null
  grade: number
  duration_minutes: number
  scheduled_at: string
  ends_at: string
  passing_score: number
  shuffle_questions: boolean
  shuffle_choices: boolean
  allow_retry: boolean
  max_attempts: number | null
  show_correct_answers: boolean
  created_at: string
  updated_at: string
}

// Helper: Require teacher authentication
async function requireTeacherId() {
  const sessionId = (await cookies()).get("session_id")?.value
  if (!sessionId) throw new Error("Not authenticated")
  
  const user = await getCurrentUser(sessionId)
  if (!user || user.role !== "teacher") {
    throw new Error("Teacher access required")
  }
  return user.id
}

/**
 * Create a new live exam
 */
export async function createLiveExam(input: CreateExamInput) {
  try {
    const teacherId = await requireTeacherId()

    // Validate
    if (!input.title || input.title.trim() === "") {
      return { success: false, error: "Title is required" }
    }
    if (input.questions.length === 0) {
      return { success: false, error: "At least one question is required" }
    }
    if (input.passing_score < 0 || input.passing_score > 100) {
      return { success: false, error: "Passing score must be between 0 and 100" }
    }

    // Validate each question has at least one correct answer
    for (const q of input.questions) {
      const hasCorrect = q.choices.some(c => c.is_correct)
      if (!hasCorrect) {
        return { success: false, error: `Question "${q.question_text}" must have at least one correct answer` }
      }
    }

    // Calculate ends_at
    const scheduledAt = new Date(input.scheduled_at)
    const endsAt = new Date(scheduledAt.getTime() + input.duration_minutes * 60 * 1000)

    // Create exam
    const result = await sql`
      INSERT INTO live_exams (
        teacher_id, title, description, grade, duration_minutes, 
        scheduled_at, ends_at, passing_score, shuffle_questions, shuffle_choices,
        allow_retry, max_attempts, show_correct_answers
      )
      VALUES (
        ${teacherId}, ${input.title}, ${input.description || null}, 
        ${input.grade}, ${input.duration_minutes}, ${input.scheduled_at},
        ${endsAt.toISOString()}, ${input.passing_score}, ${input.shuffle_questions ?? true}, 
        ${input.shuffle_choices ?? true}, ${input.allow_retry ?? true},
        ${input.max_attempts ?? null}, ${input.show_correct_answers ?? false}
      )
      RETURNING *
    `
    const exam = result[0] as LiveExam

    // Insert questions and choices
    for (const question of input.questions) {
      const [q] = await sql`
        INSERT INTO exam_questions (exam_id, question_text, question_order, points)
        VALUES (${exam.id}, ${question.question_text}, ${question.question_order}, ${question.points})
        RETURNING id
      `

      for (const choice of question.choices) {
        await sql`
          INSERT INTO question_choices (question_id, choice_text, is_correct, choice_order)
          VALUES (${q.id}, ${choice.choice_text}, ${choice.is_correct}, ${choice.choice_order})
        `
      }
    }

    // Send notifications to students of this grade
    try {
      const studentRows = await sql`
        SELECT id AS student_id
        FROM users
        WHERE role = 'student' AND grade = ${input.grade}
      `

      if (studentRows.length > 0) {
        const { randomUUID } = await import('crypto')
        const message = `اختبار جديد: ${input.title}`
        const url = `/student/exam/${exam.id}`
        const scheduledDate = new Date(input.scheduled_at).toLocaleString('ar-EG', {
          timeZone: 'Africa/Cairo',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        for (const row of studentRows) {
          await sql`
            INSERT INTO notifications (id, user_id, message, url)
            VALUES (${'notif_' + randomUUID()}, ${row.student_id}, ${message + ' - الموعد: ' + scheduledDate}, ${url})
          `
        }
      }
    } catch (e) {
      console.error("Failed to create notifications for new exam:", e)
    }

    return { success: true, examId: exam.id }
  } catch (error) {
    console.error("Error creating live exam:", error)
    return { success: false, error: "Failed to create exam" }
  }
}

/**
 * Get all exams for a teacher
 */
export async function getTeacherExams() {
  try {
    const teacherId = await requireTeacherId()

    const exams = await sql`
      SELECT * FROM live_exams
      WHERE teacher_id = ${teacherId}
      ORDER BY scheduled_at DESC
    ` as LiveExam[]

    return { success: true, exams }
  } catch (error) {
    console.error("Error fetching teacher exams:", error)
    return { success: false, error: "Failed to fetch exams" }
  }
}

/**
 * Get exam details with questions and choices
 */
export async function getExamDetails(examId: string) {
  try {
    const teacherId = await requireTeacherId()

    const result = await sql`
      SELECT * FROM live_exams
      WHERE id = ${examId} AND teacher_id = ${teacherId}
    `
    const exam = result[0] as LiveExam | undefined

    if (!exam) {
      return { success: false, error: "Exam not found" }
    }

    const questions = await sql`
      SELECT 
        q.id, q.question_text, q.question_order, q.points,
        json_agg(
          json_build_object(
            'id', c.id,
            'choice_text', c.choice_text,
            'is_correct', c.is_correct,
            'choice_order', c.choice_order
          ) ORDER BY c.choice_order
        ) as choices
      FROM exam_questions q
      LEFT JOIN question_choices c ON q.id = c.question_id
      WHERE q.exam_id = ${examId}
      GROUP BY q.id
      ORDER BY q.question_order
    `

    return { success: true, exam, questions }
  } catch (error) {
    console.error("Error fetching exam details:", error)
    return { success: false, error: "Failed to fetch exam details" }
  }
}

/**
 * Update an existing exam
 */
export async function updateLiveExam(examId: string, input: Partial<CreateExamInput>) {
  try {
    const teacherId = await requireTeacherId()

    // Check ownership
    const result = await sql`
      SELECT * FROM live_exams WHERE id = ${examId} AND teacher_id = ${teacherId}
    `
    const existing = result[0] as LiveExam | undefined

    if (!existing) {
      return { success: false, error: "Exam not found" }
    }

    // Check if exam has already started
    const now = new Date()
    const scheduledAt = new Date(existing.scheduled_at)
    if (scheduledAt <= now) {
      return { success: false, error: "Cannot update exam that has already started" }
    }

    // Calculate new ends_at if scheduled_at or duration changed
    let endsAt: string | null = null
    if (input.scheduled_at || input.duration_minutes) {
      const scheduledAt = new Date(input.scheduled_at || existing.scheduled_at)
      const duration = input.duration_minutes || existing.duration_minutes
      endsAt = new Date(scheduledAt.getTime() + duration * 60 * 1000).toISOString()
    }

    // Update exam
    await sql`
      UPDATE live_exams
      SET 
        title = COALESCE(${input.title}, title),
        description = COALESCE(${input.description}, description),
        grade = COALESCE(${input.grade}, grade),
        duration_minutes = COALESCE(${input.duration_minutes}, duration_minutes),
        scheduled_at = COALESCE(${input.scheduled_at}, scheduled_at),
        ends_at = COALESCE(${endsAt}, ends_at),
        passing_score = COALESCE(${input.passing_score}, passing_score),
        shuffle_questions = COALESCE(${input.shuffle_questions}, shuffle_questions),
        shuffle_choices = COALESCE(${input.shuffle_choices}, shuffle_choices),
        allow_retry = COALESCE(${input.allow_retry}, allow_retry),
        max_attempts = COALESCE(${input.max_attempts}, max_attempts),
        show_correct_answers = COALESCE(${input.show_correct_answers}, show_correct_answers),
        updated_at = NOW()
      WHERE id = ${examId}
    `

    // If questions are provided, update them
    if (input.questions && input.questions.length > 0) {
      // Delete old questions (cascade will delete choices)
      await sql`DELETE FROM exam_questions WHERE exam_id = ${examId}`

      // Insert new questions
      for (const question of input.questions) {
        const [q] = await sql`
          INSERT INTO exam_questions (exam_id, question_text, question_order, points)
          VALUES (${examId}, ${question.question_text}, ${question.question_order}, ${question.points})
          RETURNING id
        `

        for (const choice of question.choices) {
          await sql`
            INSERT INTO question_choices (question_id, choice_text, is_correct, choice_order)
            VALUES (${q.id}, ${choice.choice_text}, ${choice.is_correct}, ${choice.choice_order})
          `
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating live exam:", error)
    return { success: false, error: "Failed to update exam" }
  }
}

/**
 * Delete an exam
 */
export async function deleteLiveExam(examId: string) {
  try {
    const teacherId = await requireTeacherId()

    const result = await sql`
      DELETE FROM live_exams
      WHERE id = ${examId} AND teacher_id = ${teacherId}
      RETURNING id
    `

    if (result.length === 0) {
      return { success: false, error: "Exam not found" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting live exam:", error)
    return { success: false, error: "Failed to delete exam" }
  }
}

/**
 * Get exam overview for teacher dashboard
 */
export async function getExamOverview(examId: string) {
  try {
    const teacherId = await requireTeacherId()

    // Check ownership
    const examResult = await sql`
      SELECT * FROM live_exams WHERE id = ${examId} AND teacher_id = ${teacherId}
    `
    const exam = examResult[0] as LiveExam | undefined

    if (!exam) {
      return { success: false, error: "Exam not found" }
    }

    // Get overview stats
    const [stats] = await sql`
      SELECT 
        COUNT(DISTINCT student_id) FILTER (WHERE started_at IS NOT NULL) AS students_started,
        COUNT(DISTINCT student_id) FILTER (WHERE status = 'submitted') AS students_completed,
        COUNT(DISTINCT student_id) FILTER (WHERE is_flagged = TRUE) AS students_flagged,
        AVG(percentage) FILTER (WHERE status = 'submitted') AS avg_score
      FROM exam_attempts
      WHERE exam_id = ${examId}
    `

    // Get student attempts with violations
    const attempts = await sql`
      SELECT 
        a.id,
        a.student_id,
        u.name AS student_name,
        a.attempt_number,
        a.started_at,
        a.submitted_at,
        a.ended_at,
        a.score,
        a.total_points,
        a.percentage,
        a.status,
        a.is_flagged,
        a.violation_count,
        COUNT(v.id) AS total_violations
      FROM exam_attempts a
      JOIN users u ON a.student_id = u.id
      LEFT JOIN exam_violations v ON a.id = v.attempt_id
      WHERE a.exam_id = ${examId}
      GROUP BY a.id, u.name
      ORDER BY a.started_at DESC
    `

    // Get students who didn't start
    const notStarted = await sql`
      SELECT u.id, u.name
      FROM users u
      WHERE u.role = 'student' 
        AND u.grade = ${exam.grade}
        AND u.id NOT IN (
          SELECT DISTINCT student_id 
          FROM exam_attempts 
          WHERE exam_id = ${examId}
        )
    `

    return { 
      success: true, 
      exam,
      stats: {
        students_started: parseInt(stats.students_started) || 0,
        students_completed: parseInt(stats.students_completed) || 0,
        students_flagged: parseInt(stats.students_flagged) || 0,
        avg_score: parseFloat(stats.avg_score) || 0
      },
      attempts,
      notStarted
    }
  } catch (error) {
    console.error("Error fetching exam overview:", error)
    return { success: false, error: "Failed to fetch exam overview" }
  }
}

/**
 * Get student exam history
 */
export async function getStudentExamHistory(studentId: string) {
  try {
    await requireTeacherId()

    const history = await sql`
      SELECT * FROM student_exam_history
      WHERE student_id = ${studentId}
      ORDER BY scheduled_at DESC
    `

    return { success: true, history }
  } catch (error) {
    console.error("Error fetching student history:", error)
    return { success: false, error: "Failed to fetch student history" }
  }
}

/**
 * Get student answers for a specific attempt
 */
export async function getStudentAttemptDetails(attemptId: string) {
  try {
    await requireTeacherId()

    const [attempt] = await sql`
      SELECT 
        a.*,
        u.name AS student_name,
        e.title AS exam_title
      FROM exam_attempts a
      JOIN users u ON a.student_id = u.id
      JOIN live_exams e ON a.exam_id = e.id
      WHERE a.id = ${attemptId}
    `

    if (!attempt) {
      return { success: false, error: "Attempt not found" }
    }

    // Get answers with question and choice details
    const answers = await sql`
      SELECT 
        ans.id,
        ans.answered_at,
        ans.is_correct,
        q.question_text,
        q.points,
        c.choice_text AS selected_choice,
        (
          SELECT choice_text 
          FROM question_choices 
          WHERE question_id = q.id AND is_correct = TRUE 
          LIMIT 1
        ) AS correct_choice
      FROM exam_answers ans
      JOIN exam_questions q ON ans.question_id = q.id
      LEFT JOIN question_choices c ON ans.choice_id = c.id
      WHERE ans.attempt_id = ${attemptId}
      ORDER BY q.question_order
    `

    // Get violations
    const violations = await sql`
      SELECT * FROM exam_violations
      WHERE attempt_id = ${attemptId}
      ORDER BY occurred_at
    `

    return { 
      success: true, 
      attempt,
      answers,
      violations
    }
  } catch (error) {
    console.error("Error fetching attempt details:", error)
    return { success: false, error: "Failed to fetch attempt details" }
  }
}
