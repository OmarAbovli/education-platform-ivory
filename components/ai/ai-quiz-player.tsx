"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  Lightbulb, 
  Trophy,
  Loader2
} from "lucide-react"
import { submitQuiz } from "@/server/quiz-actions"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type Question = {
  id: string
  question_text: string
  options: { text: string; is_correct?: boolean }[]
  feedback?: string
}

type Props = {
  quiz: {
    id: string
    title: string
    description: string
    questions: Question[]
  }
  onComplete?: (submissionId: string) => void
}

export function AiQuizPlayer({ quiz, onComplete }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [isPending, startTransition] = useTransition()

  const currentQuestion = quiz.questions[currentIndex]
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100
  const isLast = currentIndex === quiz.questions.length - 1

  const handleSelect = (index: number) => {
    if (showFeedback) return // Lock selection once feedback is shown
    setAnswers({ ...answers, [currentQuestion.id]: index })
  }

  const handleNext = () => {
    if (isLast) {
      handleFinalSubmit()
    } else {
      setShowFeedback(false)
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleFinalSubmit = () => {
    startTransition(async () => {
      const formattedAnswers = Object.entries(answers).map(([id, idx]) => ({
        question_id: id,
        selected_option_index: idx
      }))
      
      try {
        const res = await submitQuiz(quiz.id, formattedAnswers)
        toast({ title: "Quiz Submitted!", description: "Check your results now." })
        if (onComplete) onComplete(res.submissionId)
        else router.push(`/quiz/submission/${res.submissionId}`)
      } catch (e: any) {
        toast({ title: "Submission Failed", description: e.message, variant: "destructive" })
      }
    })
  }

  const selectedIndex = answers[currentQuestion.id]
  const hasAnswered = selectedIndex !== undefined

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Question {currentIndex + 1} of {quiz.questions.length}
          </Badge>
          <span className="font-medium text-slate-500">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2 bg-slate-100" />
      </div>

      <Card className="border-emerald-100 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl leading-snug">{currentQuestion.question_text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup 
            value={selectedIndex?.toString()} 
            onValueChange={(v) => handleSelect(parseInt(v))}
            className="grid gap-3"
          >
            {currentQuestion.options.map((opt, i) => {
              const isSelected = selectedIndex === i
              const isCorrect = opt.is_correct
              
              let variantClasses = "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30"
              if (showFeedback) {
                if (isCorrect) variantClasses = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                else if (isSelected) variantClasses = "border-red-500 bg-red-50 ring-1 ring-red-500"
                else variantClasses = "opacity-50 grayscale-[0.5]"
              } else if (isSelected) {
                variantClasses = "border-emerald-600 bg-emerald-50/50"
              }

              return (
                <Label
                  key={i}
                  htmlFor={`q-${i}`}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    variantClasses
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={i.toString()} id={`q-${i}`} className="hidden" />
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm font-medium">{opt.text}</span>
                  </div>
                  {showFeedback && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {showFeedback && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                </Label>
              )
            })}
          </RadioGroup>

          {/* AI Explanation Section */}
          {showFeedback && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Explanation</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{currentQuestion.feedback || "No explanation provided."}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50/50 p-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex(prev => prev - 1)
                setShowFeedback(false)
              }
            }}
            disabled={currentIndex === 0 || isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>

          {!showFeedback && (
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!hasAnswered}
              onClick={() => setShowFeedback(true)}
            >
              <Lightbulb className="mr-2 h-4 w-4" /> Check Answer
            </Button>
          )}

          {showFeedback && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
              onClick={handleNext}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLast ? (
                <>Finish Quiz <Trophy className="ml-2 h-4 w-4" /></>
              ) : (
                <>Next Question <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
