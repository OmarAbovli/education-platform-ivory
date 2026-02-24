"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Users, AlertTriangle, CheckCircle, XCircle, Clock, Eye } from "lucide-react"
import { getExamOverview } from "@/server/live-exam-actions"

export default function ExamOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // Refresh every 5 seconds for live updates
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    const result = await getExamOverview(resolvedParams.id)
    if (result.success) {
      setData(result)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-white">جاري التحميل...</div>
      </div>
    )
  }

  if (!data || !data.exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-red-400">الاختبار غير موجود</div>
      </div>
    )
  }

  const { exam, stats, attempts, notStarted } = data
  const now = new Date()
  const isActive = new Date(exam.scheduled_at) <= now && new Date(exam.ends_at) >= now

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/teacher/exams")}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">{exam.title}</h1>
            <p className="text-slate-400">متابعة الاختبار</p>
          </div>
          {isActive && (
            <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
              <span className="text-green-400 font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                نشط الآن
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-10 w-10 text-emerald-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.students_started || 0}</div>
                  <div className="text-sm text-slate-400">بدأوا الاختبار</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-10 w-10 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.students_completed || 0}</div>
                  <div className="text-sm text-slate-400">أكملوا الاختبار</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-10 w-10 text-red-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.students_flagged || 0}</div>
                  <div className="text-sm text-slate-400">مشتبه بهم</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-10 w-10 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.avg_score != null ? Number(stats.avg_score).toFixed(1) : '0.0'}%</div>
                  <div className="text-sm text-slate-400">متوسط الدرجات</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students who started */}
        <Card className="bg-slate-900 border-emerald-400/20">
          <CardHeader>
            <CardTitle className="text-white">الطلاب الذين بدأوا الاختبار ({attempts?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attempts && attempts.length > 0 ? (
                attempts.map((attempt: any) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          {attempt.student_name}
                          {attempt.is_flagged && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="مشتبه به"></span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          محاولة #{attempt.attempt_number} - 
                          بدأ: {new Date(attempt.started_at).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo' })}
                        </div>
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

                      {attempt.status === 'in_progress' && (
                        <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-400">
                          يحل الآن
                        </div>
                      )}

                      {attempt.status === 'kicked_out' && (
                        <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs text-red-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          تم طرده
                        </div>
                      )}

                      {attempt.violation_count > 0 && (
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">{attempt.violation_count}</span>
                        </div>
                      )}

                      <Button
                        onClick={() => router.push(`/teacher/exams/attempt/${attempt.id}`)}
                        variant="outline"
                        size="sm"
                        className="border-emerald-400/20 text-white"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        تفاصيل
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  لم يبدأ أي طالب الاختبار بعد
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students who didn't start */}
        {notStarted && notStarted.length > 0 && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">الطلاب الذين لم يبدأوا ({notStarted.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {notStarted.map((student: any) => (
                  <div
                    key={student.id}
                    className="p-3 bg-slate-800/30 rounded-lg border border-slate-700 text-slate-400 text-sm"
                  >
                    {student.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
