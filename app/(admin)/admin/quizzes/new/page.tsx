
import SiteHeader from "@/components/site-header"
import { CreateQuizForm } from "@/components/create-quiz-form"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function NewQuizPage() {
  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Create New Quiz</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new quiz for a video.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
            <CardDescription>
              Select a video and add questions to your quiz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateQuizForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
