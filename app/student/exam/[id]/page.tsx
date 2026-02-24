"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, Clock, Shield, XCircle } from "lucide-react"
import { useAntiCheating } from "@/hooks/use-anti-cheating"
import { 
  startExamAttempt, 
  getExamQuestions, 
  submitAnswer, 
  submitExam 
} from "@/server/student-exam-actions"

type Question = {
  id: string
  question_text: string
  points: number
  choices: {
    id: string
    choice_text: string
  }[]
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [violations, setViolations] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [kickedOut, setKickedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Anti-cheating
  const { requestFullscreen } = useAntiCheating({
    attemptId: attemptId || "",
    enabled: !!attemptId && !submitted && !kickedOut,
    onViolation: (type, count) => {
      setViolations(count)
      if (count >= 3) {
        alert(`تم طردك من الامتحان بسبب ${count} مخالفات للقواعد`)
      } else {
        alert(`تحذير! مخالفة ${count}/3: ${getViolationMessage(type)}`)
      }
    },
    onKickOut: () => {
      setKickedOut(true)
      alert("تم طردك من الامتحان بسبب كثرة المخالفات")
      router.push("/student")
    }
  })

  // Timer
  useEffect(() => {
    if (timeRemaining > 0 && !submitted && !kickedOut) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitExam()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeRemaining, submitted, kickedOut])

  // Start exam
  const handleStartExam = async () => {
    setStarting(true)
    setError(null)

    try {
      const result = await startExamAttempt(resolvedParams.id)
      
      if (!result.success) {
        setError(result.error || "فشل بدء الامتحان")
        setStarting(false)
        return
      }

      setAttemptId(result.attemptId!)

      // Get questions
      const questionsResult = await getExamQuestions(result.attemptId!)
      
      if (!questionsResult.success) {
        setError(questionsResult.error || "فشل تحميل الأسئلة")
        setStarting(false)
        return
      }

      if (!questionsResult.attempt) {
        setError("بيانات الامتحان غير متوفرة")
        setStarting(false)
        return
      }

      setQuestions(questionsResult.questions!)
      
      // Calculate time remaining based on attempt start time
      const attemptStartTime = new Date(questionsResult.attempt.started_at).getTime()
      const now = new Date().getTime()
      const elapsedSeconds = Math.floor((now - attemptStartTime) / 1000)
      const totalDurationSeconds = questionsResult.attempt.duration_minutes * 60
      const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds)
      
      setDuration(totalDurationSeconds)
      setTimeRemaining(remainingSeconds)

      // Request fullscreen
      await requestFullscreen()

      setLoading(false)
      setStarting(false)
    } catch (err) {
      setError("حدث خطأ غير متوقع")
      setStarting(false)
    }
  }

  // Handle answer selection
  const handleSelectAnswer = async (questionId: string, choiceId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }))
    
    // Auto-save answer
    if (attemptId) {
      await submitAnswer(attemptId, questionId, choiceId)
    }
  }

  // Submit exam
  const handleSubmitExam = async () => {
    if (!attemptId) return

    const confirmed = confirm("هل أنت متأكد من تسليم الامتحان؟")
    if (!confirmed) return

    try {
      const result = await submitExam(attemptId)
      
      if (result.success) {
        setSubmitted(true)
        setResult(result)
      } else {
        alert(result.error || "فشل تسليم الامتحان")
      }
    } catch (err) {
      alert("حدث خطأ أثناء تسليم الامتحان")
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Card className="w-full max-w-md bg-slate-900 border-emerald-400/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">جاري بدء الامتحان...</h2>
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400">{error}</p>
              </div>
            )}
            <Button 
              onClick={handleStartExam}
              disabled={starting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              {starting ? "جاري البدء..." : "ابدأ الامتحان"}
            </Button>
            <Button 
              onClick={() => router.push("/student")}
              variant="ghost"
              className="w-full mt-2 text-slate-400"
            >
              إلغاء
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Result screen
  if (submitted && result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-2xl bg-slate-900 border-emerald-400/20">
          <CardHeader>
            <CardTitle className="text-center text-white flex items-center justify-center gap-2">
              {result.passed ? (
                <><CheckCircle className="h-8 w-8 text-green-500" /> نجحت!</>
              ) : (
                <><XCircle className="h-8 w-8 text-red-500" /> لم تنجح</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2">
                {result.percentage.toFixed(1)}%
              </div>
              <p className="text-slate-400">
                {result.score} / {result.totalPoints} نقطة
              </p>
            </div>

            {violations > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span>عدد المخالفات: {violations}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={() => router.push("/student/training")}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                راجع إجاباتك
              </Button>
              <Button 
                onClick={() => router.push("/student")}
                variant="outline"
                className="flex-1 border-emerald-400/20 text-white"
              >
                العودة للرئيسية
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Exam interface
  return (
    <div className="min-h-screen bg-slate-950 p-4">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-b border-emerald-400/20 z-50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Clock className="h-5 w-5 text-emerald-400" />
            <span className="text-white font-mono text-lg">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {violations > 0 && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{violations}/3</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-emerald-400">
              <Shield className="h-5 w-5" />
              <span className="text-sm">محمي</span>
            </div>
          </div>

          <Button 
            onClick={handleSubmitExam}
            className="bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            تسليم الامتحان
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-24 pb-8 max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>سؤال {currentQuestionIndex + 1} من {questions.length}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        {currentQuestion && (
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardHeader>
              <CardTitle className="text-white text-xl">
                {currentQuestion.question_text}
              </CardTitle>
              <p className="text-sm text-slate-400">
                {currentQuestion.points} {currentQuestion.points === 1 ? 'نقطة' : 'نقاط'}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentQuestion.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleSelectAnswer(currentQuestion.id, choice.id)}
                  className={`w-full p-4 text-right rounded-lg border transition-all ${
                    answers[currentQuestion.id] === choice.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {choice.choice_text}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="border-emerald-400/20 text-white"
          >
            السابق
          </Button>
          <Button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            التالي
          </Button>
        </div>

        {/* Question overview */}
        <div className="mt-6 grid grid-cols-10 gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                idx === currentQuestionIndex
                  ? 'bg-emerald-500 text-white'
                  : answers[q.id]
                  ? 'bg-teal-500/50 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function getViolationMessage(type: string): string {
  const messages: Record<string, string> = {
    tab_switch: 'محاولة تبديل النافذة',
    window_blur: 'فقدان التركيز على النافذة',
    context_menu: 'محاولة فتح قائمة السياق',
    copy_paste: 'محاولة النسخ أو اللصق',
    fullscreen_exit: 'الخروج من وضع ملء الشاشة',
    developer_tools: 'محاولة فتح أدوات المطور',
    suspicious_activity: 'نشاط مشبوه'
  }
  return messages[type] || 'مخالفة غير محددة'
}
