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
    <div className="min-h-[600px] flex flex-col items-center justify-center relative py-12 px-4 bg-white dark:bg-black/20 rounded-[2.5rem] overflow-hidden">
      {/* Immersive Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 via-emerald-500/5 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full animate-pulse" />

      <div className="w-full max-w-3xl relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Header & Progress */}
        <div className="space-y-4 px-2">
          <div className="flex items-center justify-between">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-500/20">
                <Brain className="h-3 w-3" />
                Question {currentIndex + 1} of {quiz.questions.length}
             </div>
             <span className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-tighter">
                PROGRESS: {Math.round(progress)}%
             </span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border dark:border-slate-700 shadow-inner">
             <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500 bg-[length:200%_100%] animate-gradient rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                style={{ width: `${progress}%` }}
             />
          </div>
        </div>

        <Card className="border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl dark:shadow-black/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 pb-6 px-10 text-center">
            <CardTitle className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
               {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="px-6 pb-8 md:px-10 space-y-6">
            <RadioGroup 
              value={selectedIndex?.toString()} 
              onValueChange={(v) => handleSelect(parseInt(v))}
              className="grid gap-4"
            >
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selectedIndex === i
                const isCorrect = opt.is_correct
                
                let variantClasses = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5"
                if (showFeedback) {
                  if (isCorrect) variantClasses = "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                  else if (isSelected) variantClasses = "border-red-500 bg-red-50 dark:bg-red-500/10 ring-2 ring-red-500/50 text-red-700 dark:text-red-400"
                  else variantClasses = "opacity-40 grayscale-[0.2] border-slate-200 dark:border-slate-800"
                } else if (isSelected) {
                  variantClasses = "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 ring-2 ring-indigo-500/50"
                }

                return (
                  <Label
                    key={i}
                    htmlFor={`q-${i}`}
                    className={cn(
                      "flex items-center justify-between p-5 md:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ease-out group",
                      variantClasses
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <RadioGroupItem value={i.toString()} id={`q-${i}`} className="hidden" />
                      <div className={cn(
                         "flex h-10 w-10 items-center justify-center rounded-xl border-2 text-xs font-black shrink-0 transition-all shadow-sm",
                         isSelected ? "bg-indigo-600 text-white border-indigo-600 scale-110" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 group-hover:border-emerald-500",
                         showFeedback && isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "",
                         showFeedback && isSelected && !isCorrect ? "bg-red-500 border-red-500 text-white" : ""
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-base md:text-lg font-bold leading-relaxed">{opt.text}</span>
                    </div>
                    {showFeedback && isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-in zoom-in" />}
                    {showFeedback && isSelected && !isCorrect && <XCircle className="h-6 w-6 text-red-500 animate-in zoom-in" />}
                  </Label>
                )
              })}
            </RadioGroup>

            {/* AI Explanation bubble */}
            {showFeedback && (
              <div className="mt-8 relative animate-in fade-in slide-in-from-top-4 duration-500">
                 <div className="absolute -top-3 left-8 w-4 h-4 bg-indigo-100 dark:bg-slate-800 rotate-45 border-t border-l dark:border-slate-700" />
                 <div className="p-6 rounded-[2rem] bg-indigo-50/50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700 flex flex-col md:flex-row items-start gap-5">
                    <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20 shrink-0">
                       <Lightbulb className="h-6 w-6 text-white" />
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="h-3 w-3" /> التفسير الذكي (AI Analysis)
                       </h4>
                       <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic">
                          {currentQuestion.feedback || "استخدم الذكاء الاصطناعي مهاراته لتحليل هذه النقطة، يبدو أن الإجابة المختارة تعكس فهمك لمحتوى الفيديو."}
                       </p>
                    </div>
                 </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 p-8">
            <Button
              variant="ghost"
              className="h-12 px-6 font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex(prev => prev - 1)
                  setShowFeedback(false)
                }
              }}
              disabled={currentIndex === 0 || isPending}
            >
              <ArrowLeft className="mr-2 h-5 w-5" /> Previous
            </Button>

            {!showFeedback ? (
              <Button
                className="h-14 px-10 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 min-w-[200px]"
                disabled={!hasAnswered}
                onClick={() => setShowFeedback(true)}
              >
                <Lightbulb className="mr-2 h-6 w-6" /> التحقق من الإجابة
              </Button>
            ) : (
              <Button
                className="h-14 px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 min-w-[200px]"
                onClick={handleNext}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isLast ? (
                  <>إنهاء الاختبار <Trophy className="ml-2 h-6 w-6" /></>
                ) : (
                  <>السؤال التالي <ArrowRight className="ml-2 h-6 w-6" /></>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
