import { getQuizSubmissionDetails } from '@/server/quiz-actions';
import { notFound } from 'next/navigation';

export default async function QuizSubmissionDetailsPage({
  params,
}: {
  params: { id: string; submissionId: string };
}) {
  const quizId = await params.id;
  const submissionId = await params.submissionId;

  const submissionDetails = await getQuizSubmissionDetails(quizId, submissionId);

  if (!submissionDetails) {
    notFound();
  }

  const { quiz, submission, student, questionsWithAnswers } = submissionDetails;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        مراجعة اختبار الطالب: {student.name} - {quiz.title}
      </h1>
      <p className="text-lg mb-4 text-gray-900 dark:text-gray-100">الدرجة: {submission.score}%</p>
      <p className="text-lg mb-8 text-gray-900 dark:text-gray-100">
        تاريخ التقديم: {new Date(submission.submitted_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
      </p>

      <div className="space-y-8">
        {questionsWithAnswers.map((qa, index) => (
          <div key={qa.question.id} className="border p-4 rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              السؤال {index + 1}: {qa.question.question_text}
            </h2>
            <ul className="space-y-2">
              {qa.question.options.map((option, optIndex) => (
                <li
                  key={optIndex}
                  className={`p-2 rounded-md ${
                    qa.studentAnswer.selected_option_index === optIndex && qa.studentAnswer.is_correct
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' // Correctly selected
                      : qa.studentAnswer.selected_option_index === optIndex && !qa.studentAnswer.is_correct
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' // Incorrectly selected
                      : option.is_correct
                      ? 'bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-300' // Correct option (if not selected by student)
                      : 'bg-gray-50 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {String.fromCharCode(65 + optIndex)}. {option.text}
                  {qa.studentAnswer.selected_option_index === optIndex && (
                    <span className="ml-2 font-medium">
                      {qa.studentAnswer.is_correct ? '(إجابتك صحيحة)' : '(إجابتك خاطئة)'}
                    </span>
                  )}
                  {option.is_correct && qa.studentAnswer.selected_option_index !== optIndex && (
                    <span className="ml-2 font-medium text-green-700 dark:text-green-300">(الإجابة الصحيحة)</span>
                  )}
                </li>
              ))}
            </ul>
            {qa.question.feedback && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">ملاحظات: {qa.question.feedback}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}