
import Link from "next/link"
import SiteHeader from "@/components/site-header"
import { getQuizResults } from "@/server/quiz-queries"
import { getAllVideosForQuizForm } from "@/server/video-access"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { QuizResultsTable } from "@/components/quiz-results-table"
import { Button } from "@/components/ui/button"
import { QuizFilters } from "@/components/quiz-filters"

export default async function AdminQuizPage({ searchParams }: { searchParams?: { grade?: string, month?: string, videoId?: string } }) {
  const grade = searchParams?.grade ? parseInt(searchParams.grade) : undefined
  const month = searchParams?.month ? parseInt(searchParams.month) : undefined
  const videoId = searchParams?.videoId

  const [results, videos] = await Promise.all([
    getQuizResults({ grade, month, videoId }),
    getAllVideosForQuizForm(),
  ])

  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Quiz Results</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View student quiz attempts and scores.
            </p>
          </div>
          <Link href="/admin/quizzes/new">
            <Button>Create New Quiz</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter results by grade, month, or video.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuizFilters videos={videos} />
          </CardContent>
        </Card>

        <div className="mt-8">
          <QuizResultsTable results={results} />
        </div>
      </div>
    </main>
  )
}
