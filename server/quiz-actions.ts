'use server'

import { sql } from '@/server/db'
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

  await sql.transaction(async tx => {
    // 1. Update the quiz settings
    await tx`
      UPDATE quizzes
      SET
        title = ${data.title},
        video_id = ${data.videoId},
        description = ${data.description},
        max_attempts = ${data.max_attempts},
        passing_score = ${data.passing_score},
        shuffle_questions = ${data.shuffle_questions},
        shuffle_options = ${data.shuffle_options},
        time_limit_minutes = ${data.time_limit_minutes}
      WHERE id = ${quizId};
    `;

    // 2. Reconcile questions
    const existingQuestions = await tx`SELECT id FROM questions WHERE quiz_id = ${quizId}`;
    const existingQuestionIds = new Set(existingQuestions.map(q => q.id));
    const incomingQuestionIds = new Set(data.questions.map(q => q.id).filter(id => id)); // Get IDs of incoming questions that have one

    // 2a. Delete questions that are no longer present
    for (const existingId of existingQuestionIds) {
      if (!incomingQuestionIds.has(existingId)) {
        await tx`DELETE FROM questions WHERE id = ${existingId}`;
      }
    }

    // 2b. Update existing questions and insert new ones
    for (const q of data.questions) {
      if (q.id && existingQuestionIds.has(q.id)) {
        // Update existing question
        await tx`
          UPDATE questions
          SET
            question_text = ${q.question_text},
            "order" = ${q.order},
            options = ${JSON.stringify(q.options)},
            feedback = ${q.feedback}
          WHERE id = ${q.id};
        `;
      } else {
        // Insert new question
        const newQuestionId = "qq_" + randomUUID();
        await tx`
          INSERT INTO questions (id, quiz_id, question_text, "order", options, feedback)
          VALUES (${newQuestionId}, ${quizId}, ${q.question_text}, ${q.order}, ${JSON.stringify(q.options)}, ${q.feedback});
        `;
      }
    }
  });

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
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    throw new Error('Unauthorized');
  }

  // Fetch quiz details
  const [quiz] = await sql`
    SELECT id, title FROM quizzes WHERE id = ${quizId};
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
