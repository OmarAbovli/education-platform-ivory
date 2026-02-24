"use server"

import { cookies } from "next/headers"
import { sql } from "./db"
import { getCurrentUser } from "@/lib/auth"
import { awardXP } from "./xp-actions"

// Helper: Require student authentication
async function requireStudentId() {
  const sessionId = (await cookies()).get("session_id")?.value
  if (!sessionId) throw new Error("Not authenticated")

  const user = await getCurrentUser(sessionId)
  if (!user || user.role !== "student") {
    throw new Error("Student access required")
  }
  return { id: user.id, grade: user.grade }
}

/**
 * Get available exams for student
 */
export async function getAvailableExams() {
  try {
    const { grade } = await requireStudentId()

    const now = new Date().toISOString()

    const exams = await sql`
      SELECT 
        e.id,
        e.title,
        e.description,
        e.duration_minutes,
        e.scheduled_at,
        e.ends_at,
        e.passing_score,
        e.allow_retry,
        e.max_attempts,
        CASE 
          WHEN e.scheduled_at <= ${now} AND e.ends_at >= ${now} THEN 'active'
          WHEN e.scheduled_at > ${now} THEN 'upcoming'
          ELSE 'ended'
        END AS status
      FROM live_exams e
      WHERE e.grade = ${grade}
      ORDER BY e.scheduled_at DESC
    `

    return { success: true, exams }
  } catch (error) {
    console.error("Error fetching available exams:", error)
    return { success: false, error: "Failed to fetch exams" }
  }
}

/**
 * Get student's exam attempts
 */
export async function getMyExamAttempts(examId: string) {
  try {
    const { id: studentId } = await requireStudentId()

    const attempts = await sql`
      SELECT * FROM exam_attempts
      WHERE exam_id = ${examId} AND student_id = ${studentId}
      ORDER BY attempt_number DESC
    `

    return { success: true, attempts }
  } catch (error) {
    console.error("Error fetching exam attempts:", error)
    return { success: false, error: "Failed to fetch attempts" }
  }
}

/**
 * Start a new exam attempt
 */
export async function startExamAttempt(examId: string) {
  try {
    const { id: studentId, grade } = await requireStudentId()

    // Get exam details
    const examResult = await sql`
      SELECT * FROM live_exams 
      WHERE id = ${examId} AND grade = ${grade}
    `
    const exam = examResult[0]

    if (!exam) {
      return { success: false, error: "Exam not found" }
    }

    // Check if exam is active
    const now = new Date()
    const scheduledAt = new Date(exam.scheduled_at)
    const endsAt = new Date(exam.ends_at)

    if (now < scheduledAt) {
      return { success: false, error: "Exam has not started yet" }
    }

    if (now > endsAt) {
      return { success: false, error: "Exam has ended" }
    }

    // Check previous attempts
    const previousAttempts = await sql`
      SELECT * FROM exam_attempts
      WHERE exam_id = ${examId} AND student_id = ${studentId}
      ORDER BY attempt_number DESC
    `

    // Check if retry is allowed
    if (previousAttempts.length > 0) {
      if (!exam.allow_retry) {
        return { success: false, error: "Retries not allowed for this exam" }
      }

      if (exam.max_attempts && previousAttempts.length >= exam.max_attempts) {
        return { success: false, error: "Maximum attempts reached" }
      }

      // Check if there's an in-progress attempt - return it instead of error
      const inProgress = previousAttempts.find((a: any) => a.status === 'in_progress')
      if (inProgress) {
        return { success: true, attemptId: inProgress.id, resumed: true }
      }
    }

    const attemptNumber = previousAttempts.length + 1

    // Get questions
    const questions = await sql`
      SELECT id, question_order FROM exam_questions
      WHERE exam_id = ${examId}
      ORDER BY question_order
    `

    if (questions.length === 0) {
      return { success: false, error: "هذا الاختبار لا يحتوي على أسئلة. يرجى التواصل مع المدرس." }
    }

    // Shuffle questions if needed
    let questionOrder = questions.map((q: any) => q.id)
    if (exam.shuffle_questions) {
      questionOrder = shuffleArray(questionOrder)
    }

    // Calculate total points
    const totalPointsResult = await sql`
      SELECT SUM(points) AS total FROM exam_questions WHERE exam_id = ${examId}
    `
    const totalPoints = parseInt(totalPointsResult[0].total) || 0

    // Create attempt - store as JSONB
    const questionOrderJson = JSON.stringify(questionOrder)
    const result = await sql`
      INSERT INTO exam_attempts (
        exam_id, student_id, attempt_number, 
        questions_shuffled_order, total_points, status
      )
      VALUES (
        ${examId}, ${studentId}, ${attemptNumber},
        ${questionOrderJson}::jsonb, ${totalPoints}, 'in_progress'
      )
      RETURNING *
    `
    const attempt = result[0]

    return { success: true, attemptId: attempt.id }
  } catch (error) {
    console.error("Error starting exam attempt:", error)
    return { success: false, error: "Failed to start exam" }
  }
}

/**
 * Get exam questions for an attempt (with shuffled order)
 */
export async function getExamQuestions(attemptId: string) {
  try {
    const { id: studentId } = await requireStudentId()

    console.log('Getting questions for attempt:', attemptId, 'student:', studentId)

    // Get attempt with exam duration
    const attemptResult = await sql`
      SELECT a.*, e.shuffle_choices, e.duration_minutes
      FROM exam_attempts a
      JOIN live_exams e ON a.exam_id = e.id
      WHERE a.id = ${attemptId} AND a.student_id = ${studentId}
    `
    const attempt = attemptResult[0]

    console.log('Attempt found:', attempt ? 'yes' : 'no', attempt?.id)

    if (!attempt) {
      return { success: false, error: "Attempt not found" }
    }

    if (attempt.status !== 'in_progress') {
      return { success: false, error: "Attempt is not in progress" }
    }

    // Get questions in shuffled order
    console.log('Raw questions_shuffled_order:', attempt.questions_shuffled_order)
    console.log('Type:', typeof attempt.questions_shuffled_order)

    let questionOrder: string[]
    if (typeof attempt.questions_shuffled_order === 'string') {
      questionOrder = JSON.parse(attempt.questions_shuffled_order)
    } else {
      // Already parsed as object (JSONB type)
      questionOrder = attempt.questions_shuffled_order
    }
    console.log('Question order:', questionOrder)

    // Get all questions for this attempt
    const allQuestions = await sql`
      SELECT 
        q.id,
        q.question_text,
        q.points
      FROM exam_questions q
      WHERE q.exam_id = ${attempt.exam_id}
    `
    console.log('Questions fetched:', allQuestions.length)

    if (allQuestions.length === 0) {
      return { success: false, error: "هذا الاختبار لا يحتوي على أسئلة. يرجى مراجعة المدرس." }
    }

    // Get all choices
    const allChoices = await sql`
      SELECT 
        c.id,
        c.question_id,
        c.choice_text,
        c.choice_order
      FROM question_choices c
      JOIN exam_questions q ON c.question_id = q.id
      WHERE q.exam_id = ${attempt.exam_id}
      ORDER BY c.choice_order
    `
    console.log('Choices fetched:', allChoices.length)

    // Group choices by question
    const questions = allQuestions.map((q: any) => ({
      ...q,
      choices: allChoices.filter((c: any) => c.question_id === q.id)
    }))

    // Sort questions according to shuffled order
    const sortedQuestions = questionOrder.map((qId: string) =>
      questions.find((q: any) => q.id === qId)
    )

    // Shuffle choices if needed
    const finalQuestions = sortedQuestions.map((q: any) => {
      if (attempt.shuffle_choices) {
        return {
          ...q,
          choices: shuffleArray(q.choices)
        }
      }
      return q
    })

    console.log('Final questions prepared:', finalQuestions.length)

    return { success: true, questions: finalQuestions, attempt }
  } catch (error) {
    console.error("Error fetching exam questions:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    return { success: false, error: `Failed to fetch questions: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Submit an answer
 */
export async function submitAnswer(attemptId: string, questionId: string, choiceId: string) {
  try {
    const { id: studentId } = await requireStudentId()

    // Verify attempt belongs to student
    const attemptResult = await sql`
      SELECT * FROM exam_attempts
      WHERE id = ${attemptId} AND student_id = ${studentId} AND status = 'in_progress'
    `
    const attempt = attemptResult[0]

    if (!attempt) {
      return { success: false, error: "Invalid attempt" }
    }

    // Check if choice is correct
    const choiceResult = await sql`
      SELECT is_correct FROM question_choices
      WHERE id = ${choiceId} AND question_id = ${questionId}
    `
    const choice = choiceResult[0]

    if (!choice) {
      return { success: false, error: "Invalid choice" }
    }

    // Save answer (upsert)
    await sql`
      INSERT INTO exam_answers (attempt_id, question_id, choice_id, is_correct)
      VALUES (${attemptId}, ${questionId}, ${choiceId}, ${choice.is_correct})
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET 
        choice_id = ${choiceId},
        is_correct = ${choice.is_correct},
        answered_at = NOW()
    `

    return { success: true }
  } catch (error) {
    console.error("Error submitting answer:", error)
    return { success: false, error: "Failed to submit answer" }
  }
}

/**
 * Submit the entire exam
 */
export async function submitExam(attemptId: string) {
  try {
    const { id: studentId } = await requireStudentId()

    // Verify attempt
    const attemptResult = await sql`
      SELECT a.*, e.passing_score
      FROM exam_attempts a
      JOIN live_exams e ON a.exam_id = e.id
      WHERE a.id = ${attemptId} AND a.student_id = ${studentId} AND a.status = 'in_progress'
    `
    const attempt = attemptResult[0]

    if (!attempt) {
      return { success: false, error: "Invalid attempt" }
    }

    // Calculate score
    const scoreResult = await sql`
      SELECT 
        SUM(CASE WHEN ans.is_correct THEN q.points ELSE 0 END) AS score
      FROM exam_answers ans
      JOIN exam_questions q ON ans.question_id = q.id
      WHERE ans.attempt_id = ${attemptId}
    `
    const score = parseInt(scoreResult[0].score) || 0
    const percentage = (score / attempt.total_points) * 100

    // Update attempt
    await sql`
      UPDATE exam_attempts
      SET 
        submitted_at = NOW(),
        ended_at = NOW(),
        score = ${score},
        percentage = ${percentage},
        status = 'submitted'
      WHERE id = ${attemptId}
    `

    // 🏆 Award XP for Exam Submission
    const baseXP = 50
    const scoreBonus = Math.floor(score * 2) // 2 XP per point
    const perfectBonus = percentage >= 100 ? 100 : 0
    const totalAward = baseXP + scoreBonus + perfectBonus

    await awardXP({
      userId: studentId,
      amount: totalAward,
      source: 'exam',
      sourceId: attempt.exam_id,
      description: `Exam Submitted: ${attempt.exam_id} (Score: ${Math.round(percentage)}%)`
    })

    return {
      success: true,
      score,
      totalPoints: attempt.total_points,
      percentage,
      passed: percentage >= attempt.passing_score
    }
  } catch (error) {
    console.error("Error submitting exam:", error)
    return { success: false, error: "Failed to submit exam" }
  }
}

/**
 * Record a violation
 */
export async function recordViolation(
  attemptId: string,
  violationType: 'tab_switch' | 'window_blur' | 'context_menu' | 'copy_paste' | 'fullscreen_exit' | 'developer_tools' | 'suspicious_activity',
  details?: any
) {
  try {
    const { id: studentId } = await requireStudentId()

    // Verify attempt
    const attemptResult = await sql`
      SELECT * FROM exam_attempts
      WHERE id = ${attemptId} AND student_id = ${studentId} AND status = 'in_progress'
    `

    if (attemptResult.length === 0) {
      return { success: false, error: "Invalid attempt" }
    }

    // Record violation
    await sql`
      INSERT INTO exam_violations (attempt_id, violation_type, violation_details)
      VALUES (${attemptId}, ${violationType}, ${JSON.stringify(details || {})})
    `

    // Increment violation count
    await sql`
      UPDATE exam_attempts
      SET violation_count = violation_count + 1
      WHERE id = ${attemptId}
    `

    // Get updated count
    const countResult = await sql`
      SELECT violation_count FROM exam_attempts WHERE id = ${attemptId}
    `
    const violationCount = countResult[0].violation_count

    // Kick out if too many violations (threshold: 3)
    if (violationCount >= 3) {
      await sql`
        UPDATE exam_attempts
        SET 
          status = 'kicked_out',
          ended_at = NOW(),
          is_flagged = TRUE
        WHERE id = ${attemptId}
      `
      return { success: true, kickedOut: true }
    }

    return { success: true, violationCount, kickedOut: false }
  } catch (error) {
    console.error("Error recording violation:", error)
    return { success: false, error: "Failed to record violation" }
  }
}

/**
 * Get practice exams (completed exams for training)
 */
export async function getPracticeExams() {
  try {
    const { id: studentId, grade } = await requireStudentId()

    const now = new Date().toISOString()

    // Get exams that have ended
    const exams = await sql`
      SELECT DISTINCT
        e.id,
        e.title,
        e.description,
        e.duration_minutes,
        e.scheduled_at,
        e.passing_score,
        e.show_correct_answers
      FROM live_exams e
      WHERE e.grade = ${grade} 
        AND e.ends_at < ${now}
      ORDER BY e.scheduled_at DESC
    `

    return { success: true, exams }
  } catch (error) {
    console.error("Error fetching practice exams:", error)
    return { success: false, error: "Failed to fetch practice exams" }
  }
}

/**
 * Get student's exam history
 */
export async function getMyExamHistory() {
  try {
    const { id: studentId } = await requireStudentId()

    const history = await sql`
      SELECT 
        a.id,
        a.exam_id,
        e.title,
        a.attempt_number,
        a.started_at,
        a.submitted_at,
        a.score,
        a.total_points,
        a.percentage,
        a.status,
        a.is_flagged,
        a.violation_count,
        e.passing_score
      FROM exam_attempts a
      JOIN live_exams e ON a.exam_id = e.id
      WHERE a.student_id = ${studentId}
      ORDER BY a.started_at DESC
    `

    return { success: true, history }
  } catch (error) {
    console.error("Error fetching exam history:", error)
    return { success: false, error: "Failed to fetch history" }
  }
}

/**
 * Get upcoming live exams for current student (wrapper)
 */
export async function getUpcomingExamsForStudent() {
  try {
    const { id: studentId } = await requireStudentId()
    const { getUpcomingLiveExams } = await import('@/server/student-queries')
    return await getUpcomingLiveExams(studentId)
  } catch (error) {
    console.error("Error fetching upcoming exams:", error)
    return []
  }
}

/**
 * Get student quizzes (wrapper)
 */
export async function getStudentVideoQuizzes() {
  try {
    const { id: studentId } = await requireStudentId()
    const { getStudentQuizzes } = await import('@/server/student-queries')
    return await getStudentQuizzes(studentId)
  } catch (error) {
    console.error("Error fetching quizzes:", error)
    return []
  }
}

// Utility: Shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
