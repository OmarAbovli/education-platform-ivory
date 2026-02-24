
import { getQuizForStudent } from "@/server/quiz-queries"
import { QuizPlayer } from "@/components/quiz-player"
import SiteHeader from "@/components/site-header"

type Props = { params: { id: string } }

export default async function QuizPage({ params }: Props) {
  const quizId = params.id
  const quiz = await getQuizForStudent(quizId)

  if (!quiz) {
    return <div>Quiz not found</div>
  }

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">{quiz.title}</h1>
        <QuizPlayer quiz={quiz} />
      </div>
    </main>
  )
}
