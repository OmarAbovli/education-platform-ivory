"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Clock, Target, TrendingUp, ArrowRight } from "lucide-react"
import {
  getPracticeExams,
  getMyExamHistory,
  getUpcomingExamsForStudent,
  getStudentVideoQuizzes
} from "@/server/student-exam-actions"
import { Calendar } from "lucide-react"
import { ExamCountdown } from "@/components/exam-countdown"

export default function TrainingPage() {
  const router = useRouter()
  const [practiceExams, setPracticeExams] = useState<any[]>([])
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [examsResult, historyResult, upcomingResult, quizzesResult] = await Promise.all([
      getPracticeExams(),
      getMyExamHistory(),
      getUpcomingExamsForStudent(),
      getStudentVideoQuizzes()
    ])

    if (examsResult.success) {
      setPracticeExams(examsResult.exams || [])
    }

    if (historyResult.success) {
      setHistory(historyResult.history || [])
    }

    setUpcomingExams(upcomingResult || [])
    setQuizzes(quizzesResult || [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-white">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-emerald-400" />
              صفحة التدريب
            </h1>
            <p className="text-slate-400">
              راجع الاختبارات السابقة وحسّن أداءك
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/student')}
            className="w-fit text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white gap-2 flex-row-reverse"
          >
            <span>العودة للرئيسية</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="h-10 w-10 text-emerald-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {history.filter(h => h.status === 'submitted').length}
                  </div>
                  <div className="text-sm text-slate-400">اختبار مكتمل</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-10 w-10 text-teal-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {history.length > 0
                      ? (history.reduce((sum, h) => sum + (Number(h.percentage) || 0), 0) / history.length).toFixed(1)
                      : 0
                    }%
                  </div>
                  <div className="text-sm text-slate-400">متوسط الدرجات</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-10 w-10 text-sky-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {practiceExams.length + quizzes.length}
                  </div>
                  <div className="text-sm text-slate-400">اختبار متاح للتدريب</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-emerald-400" />
              الاختبارات القادمة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingExams.map((exam) => (
                <Card key={exam.id} className="bg-slate-900 border-blue-400/20">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{exam.title}</CardTitle>
                    {exam.description && (
                      <p className="text-sm text-slate-400">{exam.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">المدرس:</span>
                      <span className="text-white">{exam.teacher_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">المدة:</span>
                      <span className="text-white">{exam.duration_minutes} دقيقة</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">النجاح:</span>
                      <span className="text-white">{exam.passing_score}%</span>
                    </div>

                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded space-y-2">
                      <ExamCountdown scheduledAt={exam.scheduled_at} />
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-1">الموعد</div>
                        <div className="text-sm font-semibold text-blue-400">
                          {new Date(exam.scheduled_at).toLocaleString('ar-EG', {
                            timeZone: 'Africa/Cairo',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Practice Exams */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">اختبارات لايف - التدريب</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {practiceExams.map((exam) => {
              const myAttempts = history.filter(h => h.exam_id === exam.id)
              const bestScore = myAttempts.length > 0
                ? Math.max(...myAttempts.map(a => Number(a.percentage) || 0))
                : null

              return (
                <Card key={exam.id} className="bg-slate-900 border-emerald-400/20 hover:border-emerald-400/40 transition-all">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{exam.title}</CardTitle>
                    {exam.description && (
                      <p className="text-sm text-slate-400">{exam.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">المدة:</span>
                      <span className="text-white">{exam.duration_minutes} دقيقة</span>
                    </div>

                    {bestScore !== null && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="text-sm text-slate-400 mb-1">أفضل درجة</div>
                        <div className="text-2xl font-bold text-emerald-400">
                          {bestScore.toFixed(1)}%
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => router.push(`/student/exam/${exam.id}`)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    >
                      {bestScore !== null ? 'إعادة التدريب' : 'ابدأ التدريب'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {practiceExams.length === 0 && (
            <p className="text-slate-400 text-center py-8">لا توجد اختبارات متاحة للتدريب</p>
          )}
        </div>

        {/* Video Quizzes */}
        {quizzes.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">اختبارات الفيديوهات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="bg-slate-900 border-purple-400/20 hover:border-purple-400/40 transition-all">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{quiz.title}</CardTitle>
                    <p className="text-sm text-slate-400">
                      📹 {quiz.video_title}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">المدرس:</span>
                      <span className="text-white">{quiz.teacher_name}</span>
                    </div>

                    {quiz.time_limit_minutes && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">المدة:</span>
                        <span className="text-white">{quiz.time_limit_minutes} دقيقة</span>
                      </div>
                    )}

                    {quiz.best_score !== null && (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <div className="text-sm text-slate-400 mb-1">أفضل درجة</div>
                        <div className="text-2xl font-bold text-purple-400">
                          {quiz.best_score}%
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-500">
                      {quiz.attempt_count > 0 ? `${quiz.attempt_count} محاولات` : 'لم تحل بعد'}
                    </div>

                    <Button
                      onClick={() => router.push(`/student/video/${quiz.video_id}#quiz-${quiz.id}`)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      {quiz.best_score !== null ? 'إعادة الحل' : 'ابدأ الاختبار'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">سجل محاولاتي</h2>
          <div className="space-y-2">
            {history.map((attempt) => (
              <Card key={attempt.id} className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{attempt.title}</div>
                      <div className="text-sm text-slate-400">
                        {new Date(attempt.started_at).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {attempt.status === 'submitted' && (
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {attempt.percentage != null ? Number(attempt.percentage).toFixed(1) : '0.0'}%
                          </div>
                          <div className="text-xs text-slate-400">
                            {attempt.score || 0} / {attempt.total_points || 0}
                          </div>
                        </div>
                      )}

                      {attempt.is_flagged && (
                        <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs text-red-400">
                          مخالفات: {attempt.violation_count}
                        </div>
                      )}

                      {attempt.status === 'kicked_out' && (
                        <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs text-red-400">
                          تم الطرد
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
