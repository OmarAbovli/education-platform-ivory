
'use client'

import Link from 'next/link'

type QuizResult = {
  submission_id: string
  score: number
  submitted_at: Date
  student_id: string
  student_name: string
  video_id: string
  video_title: string
  month: number
  quiz_id: string
  quiz_title: string
}

export function QuizResultsTable({ results }: { results: QuizResult[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-3">Student</th>
            <th className="py-2 pr-3">Quiz</th>
            <th className="py-2 pr-3">Video</th>
            <th className="py-2 pr-3">Month</th>
            <th className="py-2 pr-3">Score</th>
            <th className="py-2 pr-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.submission_id} className="border-t">
              <td className="py-2 pr-3">
                <Link href={`/teacher/quizzes/${r.quiz_id}/results/${r.submission_id}`} className="text-blue-600 hover:underline">
                  {r.student_name}
                </Link>
              </td>
              <td className="py-2 pr-3">{r.quiz_title}</td>
              <td className="py-2 pr-3">{r.video_title}</td>
              <td className="py-2 pr-3">{r.month}</td>
              <td className="py-2 pr-3">{r.score}%</td>
              <td className="py-2 pr-3">{(new Date(r.submitted_at)).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
