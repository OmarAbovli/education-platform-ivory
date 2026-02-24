'use client';

import { QuizResultsTable } from './quiz-results-table'; // Assuming named export

// Define the props that QuizResultsTable expects
type QuizResult = {
  submission_id: string;
  score: number;
  submitted_at: Date;
  student_id: string;
  student_name: string;
  video_id: string;
  video_title: string;
  month: number;
  quiz_id: string;
  quiz_title: string;
};

interface QuizResultsTableWrapperProps {
  results: QuizResult[];
}

export function QuizResultsTableWrapper({ results }: QuizResultsTableWrapperProps) {
  return <QuizResultsTable results={results} />;
}