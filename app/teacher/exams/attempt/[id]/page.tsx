"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { getStudentAttemptDetails, getStudentExamHistory } from "@/server/live-exam-actions"

export default function AttemptDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [studentHistory, setStudentHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const result = await getStudentAttemptDetails(resolvedParams.id)
    if (result.success) {
      setData(result)
      
      // Load student's full history
      if (result.attempt?.student_id) {
        const historyResult = await getStudentExamHistory(result.attempt.student_id)
        if (historyResult.success) {
          setStudentHistory(historyResult.history || [])
        }
      }
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

  if (!data || !data.attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-red-400">المحاولة غير موجودة</div>
      </div>
    )
  }

  const { attempt, answers, violations } = data

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">تفاصيل المحاولة</h1>
            <p className="text-slate-400">
              الطالب: {attempt.student_name} - محاولة #{attempt.attempt_number}
            </p>
          </div>
        </div>

        {/* Attempt Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">
                {attempt.percentage != null ? Number(attempt.percentage).toFixed(1) : '0.0'}%
              </div>
              <div className="text-sm text-slate-400">الدرجة النهائية</div>
              <div className="text-xs text-slate-500 mt-1">
                {attempt.score || 0} / {attempt.total_points || 0} نقطة
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">
                {attempt.status === 'submitted' ? '✓ مكتمل' : 
                 attempt.status === 'kicked_out' ? '✗ مطرود' :
                 attempt.status === 'in_progress' ? '⏳ يحل' : 'منتهي'}
              </div>
              <div className="text-sm text-slate-400">الحالة</div>
              {attempt.submitted_at && (
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(attempt.submitted_at).toLocaleString('ar-EG', { 
                    timeZone: 'Africa/Cairo' 
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`bg-slate-900 ${attempt.is_flagged ? 'border-red-400/20' : 'border-emerald-400/20'}`}>
            <CardContent className="p-6">
              <div className={`text-2xl font-bold ${attempt.is_flagged ? 'text-red-400' : 'text-white'}`}>
                {attempt.violation_count || 0}
              </div>
              <div className="text-sm text-slate-400">عدد المخالفات</div>
              {attempt.is_flagged && (
                <div className="text-xs text-red-400 mt-1">⚠️ مشتبه به</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Violations */}
        {violations && violations.length > 0 && (
          <Card className="bg-slate-900 border-red-400/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                المخالفات ({violations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {violations.map((violation: any, index: number) => (
                  <div key={violation.id || `violation-${index}`} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">
                          {violation.violation_type === 'tab_switch' && '🔄 تبديل التبويب'}
                          {violation.violation_type === 'window_blur' && '🪟 مغادرة النافذة'}
                          {violation.violation_type === 'context_menu' && '📋 القائمة السياقية'}
                          {violation.violation_type === 'copy_paste' && '📄 نسخ/لصق'}
                          {violation.violation_type === 'fullscreen_exit' && '🖥️ الخروج من وضع ملء الشاشة'}
                          {violation.violation_type === 'developer_tools' && '🛠️ أدوات المطور'}
                          {!['tab_switch', 'window_blur', 'context_menu', 'copy_paste', 'fullscreen_exit', 'developer_tools'].includes(violation.violation_type) && '⚠️ نشاط مشبوه'}
                        </div>
                        <div className="text-sm text-slate-400">
                          {new Date(violation.occurred_at).toLocaleString('ar-EG', { 
                            timeZone: 'Africa/Cairo' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Answers */}
        {answers && answers.length > 0 && (
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardHeader>
              <CardTitle className="text-white">الإجابات ({answers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {answers.map((answer: any, index: number) => (
                  <div 
                    key={answer.id || answer.question_id || `answer-${index}`} 
                    className={`p-4 rounded-lg border ${
                      answer.is_correct 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-white font-medium mb-2">
                          سؤال {index + 1}: {answer.question_text}
                        </div>
                        <div className="text-sm text-slate-400">
                          النقاط: {answer.points || 1}
                        </div>
                      </div>
                      {answer.is_correct ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {answer.choices?.map((choice: any, cIndex: number) => (
                        <div
                          key={`${answer.question_id || index}-choice-${choice.id || cIndex}`}
                          className={`p-2 rounded ${
                            choice.id === answer.selected_choice_id
                              ? answer.is_correct
                                ? 'bg-green-500/20 border border-green-500/30'
                                : 'bg-red-500/20 border border-red-500/30'
                              : choice.is_correct
                                ? 'bg-green-500/10 border border-green-500/20'
                                : 'bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {choice.id === answer.selected_choice_id && (
                              <span className="text-xs">👉</span>
                            )}
                            {choice.is_correct && (
                              <span className="text-xs">✓</span>
                            )}
                            <span className="text-white text-sm">{choice.choice_text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student History */}
        {studentHistory.length > 0 && (
          <Card className="bg-slate-900 border-blue-400/20">
            <CardHeader>
              <CardTitle className="text-white">سجل الطالب ({studentHistory.length} محاولة)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Current exam attempts */}
                {studentHistory.filter((h: any) => h.exam_id === attempt.exam_id).length > 1 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      المحاولات الأخرى في نفس الاختبار
                    </h3>
                    <div className="space-y-2">
                      {studentHistory
                        .filter((h: any) => h.exam_id === attempt.exam_id && h.id !== attempt.id)
                        .map((h: any) => (
                          <div
                            key={h.id}
                            onClick={() => router.push(`/teacher/exams/attempt/${h.id}`)}
                            className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-400/30 cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white font-medium">
                                  محاولة #{h.attempt_number}
                                </div>
                                <div className="text-sm text-slate-400">
                                  {new Date(h.started_at).toLocaleString('ar-EG', { 
                                    timeZone: 'Africa/Cairo' 
                                  })}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {h.status === 'submitted' && (
                                  <div className="text-white font-bold">
                                    {h.percentage != null ? Number(h.percentage).toFixed(1) : '0.0'}%
                                  </div>
                                )}
                                {h.is_flagged && (
                                  <div className="text-xs text-red-400">
                                    ⚠️ {h.violation_count} مخالفات
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* All exams history */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    جميع الاختبارات
                  </h3>
                  <div className="space-y-2">
                    {studentHistory
                      .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                      .map((h: any) => (
                        <div
                          key={h.id}
                          onClick={() => router.push(`/teacher/exams/attempt/${h.id}`)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            h.id === attempt.id
                              ? 'bg-blue-500/10 border-blue-400/30'
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-white font-medium">
                                  {h.exam_title}
                                </div>
                                {h.id === attempt.id && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                    الحالي
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-400">
                                محاولة #{h.attempt_number} - {new Date(h.started_at).toLocaleDateString('ar-EG', { 
                                  timeZone: 'Africa/Cairo' 
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {h.status === 'submitted' && (
                                <div className="text-right">
                                  <div className="text-white font-bold">
                                    {h.percentage != null ? Number(h.percentage).toFixed(1) : '0.0'}%
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {h.score || 0}/{h.total_points || 0}
                                  </div>
                                </div>
                              )}
                              {h.status === 'in_progress' && (
                                <div className="text-blue-400 text-sm">يحل الآن</div>
                              )}
                              {h.status === 'kicked_out' && (
                                <div className="text-red-400 text-sm">مطرود</div>
                              )}
                              {h.is_flagged && (
                                <div className="text-xs text-red-400">
                                  ⚠️ {h.violation_count}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">
                      {studentHistory.filter((h: any) => h.status === 'submitted').length}
                    </div>
                    <div className="text-sm text-slate-400">اختبار مكتمل</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white">
                      {studentHistory.filter((h: any) => h.status === 'submitted').length > 0
                        ? (studentHistory
                            .filter((h: any) => h.status === 'submitted')
                            .reduce((sum: number, h: any) => sum + (Number(h.percentage) || 0), 0) / 
                            studentHistory.filter((h: any) => h.status === 'submitted').length
                          ).toFixed(1)
                        : '0.0'
                      }%
                    </div>
                    <div className="text-sm text-slate-400">متوسط الدرجات</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {studentHistory.reduce((sum: number, h: any) => sum + (h.violation_count || 0), 0)}
                    </div>
                    <div className="text-sm text-slate-400">إجمالي المخالفات</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
