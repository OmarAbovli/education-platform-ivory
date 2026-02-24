import { getQuizResults } from '@/server/quiz-actions';
import { notFound } from 'next/navigation';
import { QuizResultsTableWrapper } from '@/components/quiz-results-table-wrapper'; // Import the wrapper

export default async function QuizResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const id = await params.id; // Await params.id
  const data = await getQuizResults(id);

  if (!data) {
    notFound();
  }

  const formattedResults = data.submissions.map(submission => ({
    submission_id: submission.submission_id,
    score: submission.score,
    submitted_at: submission.submitted_at,
    student_id: submission.student_id,
    student_name: submission.student_name,
    video_id: data.quiz.video_id,
    video_title: data.quiz.video_title,
    month: new Date(submission.submitted_at).getMonth() + 1,
    quiz_id: data.quiz.id,
    quiz_title: data.quiz.title,
  }));

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Quiz Results for Quiz ID: {id}</h1>
      <QuizResultsTableWrapper results={formattedResults} /> {/* Use the wrapper */}
    </div>
  );
}