import { getQuizSubmission } from "@/server/quiz-queries"
import SiteHeader from "@/components/site-header"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Props = { params: { id: string } }

export default async function SubmissionPage({ params }: Props) {
  const submissionId = params.id
  const submission = await getQuizSubmission(submissionId)

  if (!submission) {
    return <div>لم يتم العثور على التسليم</div>
  }

  const isPassed = submission.quiz.passing_score ? submission.score >= submission.quiz.passing_score : false

  return (
    <main>
      <SiteHeader />
      <div dir="rtl" className="mx-auto max-w-4xl p-6">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-2xl font-semibold">{submission.quiz.title} - النتائج</h1>
                <p className="text-lg">نتيجتك: {submission.score}%</p>
            </div>
            {submission.quiz.passing_score != null && (
                <Badge variant={isPassed ? 'default' : 'destructive'}>
                    {isPassed ? 'ناجح' : 'راسب'}
                </Badge>
            )}
        </div>

        <div className="grid gap-6">
          {submission.questions.map((q, index) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle>{index + 1}. {q.question_text}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {q.options.map((opt, optIndex) => {
                  const isSelected = q.student_answer?.selected_option_index === optIndex
                  const isCorrectOption = opt.is_correct

                  let style = ""
                  let badgeText = ""
                  let badgeVariant: "default" | "destructive" | "outline" = "outline"

                  if (isSelected) {
                    if (isCorrectOption) {
                      style = "border-green-500 bg-green-500/10 font-bold"
                      badgeText = "إجابتك الصحيحة"
                      badgeVariant = "default"
                    } else {
                      style = "border-red-500 bg-red-500/10"
                      badgeText = "إجابتك الخاطئة"
                      badgeVariant = "destructive"
                    }
                  } else if (isCorrectOption) {
                    style = "border-green-500/50 bg-green-500/5"
                    badgeText = "الإجابة الصحيحة"
                    badgeVariant = "default"
                  }

                  return (
                    <div key={optIndex} className={`p-3 border rounded-md flex items-center justify-between ${style}`}>
                        <p>{opt.text}</p>
                        {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
                    </div>
                  )
                })}
                {q.feedback && (
                    <div className="p-3 bg-muted rounded-md text-sm mt-4">
                        <p className="font-semibold">ملاحظات</p>
                        <p>{q.feedback}</p>
                    </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}