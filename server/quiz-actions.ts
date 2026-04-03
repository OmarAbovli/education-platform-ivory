'use server'

import { sql, pool } from '@/server/db'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

type QuizQuestion = {
  question_text: string
  order: number
  feedback?: string
  options: {
    text: string
    is_correct: boolean
  }[]
}

type QuizSettings = {
  description?: string
  time_limit_minutes?: number
  passing_score?: number
  max_attempts?: number
  shuffle_questions?: boolean
  shuffle_options?: boolean
}

export async function createQuiz(
  videoId: string,
  title: string,
  questions: QuizQuestion[],
  settings: QuizSettings
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    throw new Error('Unauthorized')
  }

  const quizId = "q_" + randomUUID()
  const [quiz] = await sql`
    INSERT INTO quizzes (id, teacher_id, video_id, title, quiz_type, description, time_limit_minutes, passing_score, max_attempts, shuffle_questions, shuffle_options)
    VALUES (${quizId}, ${user.id}, ${videoId}, ${title}, 'native', ${settings.description}, ${settings.time_limit_minutes}, ${settings.passing_score}, ${settings.max_attempts}, ${settings.shuffle_questions}, ${settings.shuffle_options})
    RETURNING id;
  `

  for (const q of questions) {
    const questionId = "qq_" + randomUUID()
    await sql`
      INSERT INTO questions (id, quiz_id, question_text, "order", options, feedback)
      VALUES (${questionId}, ${quiz.id}, ${q.question_text}, ${q.order}, ${JSON.stringify(q.options)}, ${q.feedback});
    `
  }

  return quiz
}

type StudentAnswer = {
  question_id: string
  selected_option_index: number
}

export async function submitQuiz(quizId: string, answers: StudentAnswer[]) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)
  if (!user || user.role !== 'student') {
    throw new Error('Unauthorized')
  }

  const [quizSettings] = await sql`SELECT max_attempts FROM quizzes WHERE id = ${quizId}`;
  const maxAttempts = quizSettings.max_attempts ?? 1;

  if (maxAttempts > 0) { // A maxAttempts value of 0 means infinite attempts
    const [{ count }] = await sql`
      SELECT count(*) FROM quiz_submissions WHERE quiz_id = ${quizId} AND student_id = ${user.id};
    `
    if (count >= maxAttempts) {
      throw new Error(`You have already submitted this quiz ${maxAttempts} time(s).`)
    }
  }

  const questions = await sql`
    SELECT id, options FROM questions WHERE quiz_id = ${quizId};
  `

  let correctAnswersCount = 0
  const studentAnswersToInsert = []

  for (const q of questions) {
    const studentAnswer = answers.find((a) => a.question_id === q.id)
    const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;

    let isCorrect = false;
    let selectedIndex = -1; // Default to -1 for unanswered or invalid index

    if (studentAnswer && studentAnswer.selected_option_index != null && studentAnswer.selected_option_index >= 0) {
      selectedIndex = studentAnswer.selected_option_index;
      const selectedOption = options[selectedIndex];

      if (selectedOption && selectedOption.is_correct == true) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      correctAnswersCount++;
    }

    studentAnswersToInsert.push({
      question_id: q.id,
      selected_option_index: selectedIndex,
      is_correct: isCorrect,
    });
  }

  const percentage = questions.length > 0 ? Math.round((correctAnswersCount / questions.length) * 100) : 0

  const submissionId = "qs_" + randomUUID()
  const [submission] = await sql`
    INSERT INTO quiz_submissions (id, student_id, quiz_id, score)
    VALUES (${submissionId}, ${user.id}, ${quizId}, ${percentage})
    RETURNING id;
  `

  for (const answer of studentAnswersToInsert) {
    const answerId = "qa_" + randomUUID()
    await sql`
      INSERT INTO student_answers (id, submission_id, question_id, selected_option_index, is_correct)
      VALUES (${answerId}, ${submission.id}, ${answer.question_id}, ${answer.selected_option_index}, ${answer.is_correct});
    `
  }
  return { submissionId: submission.id }
}

type UpdateQuizQuestion = {
  id?: string; // optional for new questions
  question_text: string;
  order: number;
  feedback?: string;
  options: {
    text: string;
    is_correct: boolean;
  }[];
}

export async function updateQuiz(
  quizId: string,
  data: {
    title: string;
    videoId: string;
    description: string;
    max_attempts: number;
    passing_score: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    time_limit_minutes: number;
    questions: UpdateQuizQuestion[];
  }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    throw new Error('Unauthorized')
  }

  const [quiz] = await sql`SELECT teacher_id FROM quizzes WHERE id = ${quizId}`;
  if (!quiz || (user.role === 'teacher' && quiz.teacher_id !== user.id)) {
    throw new Error('Forbidden');
  }

  if (!pool) throw new Error("Database pool not configured");
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update the quiz settings
    await client.query(`
      UPDATE quizzes
      SET
        title = $1,
        video_id = $2,
        description = $3,
        max_attempts = $4,
        passing_score = $5,
        shuffle_questions = $6,
        shuffle_options = $7,
        time_limit_minutes = $8
      WHERE id = $9
    `, [
      data.title, data.videoId, data.description, data.max_attempts, 
      data.passing_score, data.shuffle_questions, data.shuffle_options, 
      data.time_limit_minutes, quizId
    ]);

    // 2. Reconcile questions
    const { rows: existingQuestions } = await client.query('SELECT id FROM questions WHERE quiz_id = $1', [quizId]);
    const existingQuestionIds = new Set(existingQuestions.map((q: any) => q.id));
    const incomingQuestionIds = new Set(data.questions.map(q => q.id).filter(id => id));

    // 2a. Delete
    for (const existingId of Array.from(existingQuestionIds)) {
      if (!incomingQuestionIds.has(existingId)) {
        await client.query('DELETE FROM questions WHERE id = $1', [existingId]);
      }
    }

    // 2b. Update/Insert
    for (const q of data.questions) {
      if (q.id && existingQuestionIds.has(q.id)) {
        await client.query(`
          UPDATE questions
          SET question_text = $1, "order" = $2, options = $3, feedback = $4
          WHERE id = $5
        `, [q.question_text, q.order, JSON.stringify(q.options), q.feedback, q.id]);
      } else {
        const newQuestionId = "qq_" + randomUUID();
        await client.query(`
          INSERT INTO questions (id, quiz_id, question_text, "order", options, feedback)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [newQuestionId, quizId, q.question_text, q.order, JSON.stringify(q.options), q.feedback]);
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return { success: true };
}

export async function deleteQuiz(quizId: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    throw new Error('Unauthorized')
  }

  const [quiz] = await sql`SELECT teacher_id FROM quizzes WHERE id = ${quizId}`;
  if (!quiz || (user.role === 'teacher' && quiz.teacher_id !== user.id)) {
    throw new Error('Forbidden');
  }

  // The database schema uses ON DELETE CASCADE for all related tables (questions, submissions, answers).
  // Therefore, a single DELETE on the quiz is sufficient.
  await sql`DELETE FROM quizzes WHERE id = ${quizId};`;

  return { success: true };
}

export async function getQuizResults(quizId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session_id")?.value; // Await cookies().get()
  const user = await getCurrentUser(sessionCookie);
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    throw new Error('Unauthorized');
  }

  // Fetch quiz details and submissions
  const quiz = await sql`
    SELECT
      q.id,
      q.title,
      q.video_id,
      v.title as video_title,
      q.created_at
    FROM quizzes q
    LEFT JOIN videos v ON q.video_id = v.id
    WHERE q.id = ${quizId}
  `;

  if (!quiz || quiz.length === 0) {
    return null; // Quiz not found
  }

  // Fetch all submissions for this quiz
  const submissions = await sql`
    SELECT
      qs.id as submission_id,
      qs.student_id,
      u.name as student_name,
      qs.score,
      qs.submitted_at
    FROM quiz_submissions qs
    JOIN users u ON qs.student_id = u.id
    WHERE qs.quiz_id = ${quizId}
    ORDER BY qs.submitted_at DESC;
  `;

  // For each submission, fetch the answers
  const resultsWithAnswers = await Promise.all(submissions.map(async (submission) => {
    const answers = await sql`
      SELECT
        qa.question_id,
        qa.selected_option_index,
        qa.is_correct,
        q.question_text,
        q.options as question_options
      FROM student_answers qa
      JOIN questions q ON qa.question_id = q.id
      WHERE qa.submission_id = ${submission.submission_id}
      ORDER BY q.order ASC;
    `;
    return {
      ...submission,
      answers: answers.map(answer => ({
        ...answer,
        question_options: typeof answer.question_options === 'string' ? JSON.parse(answer.question_options) : answer.question_options
      }))
    };
  }));

  return {
    quiz: quiz[0],
    submissions: resultsWithAnswers,
  };
}

export async function getQuizSubmissionDetails(quizId: string, submissionId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session_id")?.value;
  const user = await getCurrentUser(sessionCookie);
  if (!user) throw new Error('Unauthorized');
  
  const [submissionCheck] = await sql`SELECT student_id FROM quiz_submissions WHERE id = ${submissionId} LIMIT 1` as any[];
  const isOwner = submissionCheck?.student_id === user.id;
  const isStaff = user.role === 'admin' || user.role === 'teacher';

  if (!isOwner && !isStaff) {
    throw new Error('Unauthorized access to this submission.');
  }

  // Fetch quiz details
  const [quiz] = await sql`
    SELECT id, title, video_id FROM quizzes WHERE id = ${quizId};
  `;
  if (!quiz) {
    return null;
  }

  // Fetch submission details
  const [submission] = await sql`
    SELECT id, student_id, score, submitted_at FROM quiz_submissions WHERE id = ${submissionId} AND quiz_id = ${quizId};
  `;
  if (!submission) {
    return null;
  }

  // Fetch student details
  const [student] = await sql`
    SELECT id, name FROM users WHERE id = ${submission.student_id};
  `;
  if (!student) {
    return null;
  }

  // Fetch all questions for the quiz
  const questions = await sql`
    SELECT id, question_text, "order", options, feedback FROM questions WHERE quiz_id = ${quizId} ORDER BY "order" ASC;
  `;

  // Fetch student's answers for this submission
  const studentAnswers = await sql`
    SELECT question_id, selected_option_index, is_correct FROM student_answers WHERE submission_id = ${submissionId};
  `;

  const studentAnswersMap = new Map(studentAnswers.map(sa => [sa.question_id, sa]));

  const questionsWithAnswers = questions.map(q => {
    const studentAnswer = studentAnswersMap.get(q.id) || {
      question_id: q.id,
      selected_option_index: -1, // Indicate no answer
      is_correct: false,
    };
    return {
      question: {
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      },
      studentAnswer,
    };
  });

  return {
    quiz,
    submission,
    student,
    questionsWithAnswers,
  };
}
