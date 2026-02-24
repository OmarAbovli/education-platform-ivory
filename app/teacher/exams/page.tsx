"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Calendar, Users, Clock, BarChart, Eye, Edit, Trash2 } from "lucide-react"
import { getTeacherExams, deleteLiveExam } from "@/server/live-exam-actions"

export default function TeacherExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    const result = await getTeacherExams()
    if (result.success) {
      setExams(result.exams || [])
    }
    setLoading(false)
  }

  const getExamStatus = (exam: any) => {
    const now = new Date()
    const scheduledAt = new Date(exam.scheduled_at)
    const endsAt = new Date(exam.ends_at)

    if (now < scheduledAt) return { label: 'قادم', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
    if (now >= scheduledAt && now <= endsAt) return { label: 'نشط الآن', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
    return { label: 'انتهى', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  }

  const handleDelete = async (examId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف جميع البيانات المتعلقة به.')) {
      return
    }

    const result = await deleteLiveExam(examId)
    if (result.success) {
      alert('تم حذف الاختبار بنجاح')
      loadExams() // Reload the list
    } else {
      alert(result.error || 'فشل حذف الاختبار')
    }
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/teacher")}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Plus className="h-6 w-6 rotate-45" /> {/* Simple back arrow using rotated plus or import ArrowRight */}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">الاختبارات اللايف</h1>
              <p className="text-slate-400">إدارة ومتابعة الاختبارات المباشرة</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/teacher/exams/create")}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 gap-2"
          >
            <Plus className="h-5 w-5" />
            إنشاء اختبار جديد
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-10 w-10 text-emerald-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{exams.length}</div>
                  <div className="text-sm text-slate-400">إجمالي الاختبارات</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-10 w-10 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {exams.filter(e => {
                      const now = new Date()
                      return new Date(e.scheduled_at) > now
                    }).length}
                  </div>
                  <div className="text-sm text-slate-400">اختبارات قادمة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-10 w-10 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {exams.filter(e => {
                      const now = new Date()
                      return new Date(e.scheduled_at) <= now && new Date(e.ends_at) >= now
                    }).length}
                  </div>
                  <div className="text-sm text-slate-400">نشط الآن</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-400/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <BarChart className="h-10 w-10 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {exams.filter(e => new Date(e.ends_at) < new Date()).length}
                  </div>
                  <div className="text-sm text-slate-400">اختبارات منتهية</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exams List */}
        <div className="space-y-4">
          {exams.length === 0 ? (
            <Card className="bg-slate-900 border-emerald-400/20">
              <CardContent className="p-12 text-center">
                <Calendar className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">لا توجد اختبارات</h3>
                <p className="text-slate-400 mb-6">ابدأ بإنشاء اختبار لايف جديد</p>
                <Button
                  onClick={() => router.push("/teacher/exams/create")}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إنشاء اختبار
                </Button>
              </CardContent>
            </Card>
          ) : (
            exams.map((exam) => {
              const status = getExamStatus(exam)
              return (
                <Card key={exam.id} className="bg-slate-900 border-emerald-400/20 hover:border-emerald-400/40 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                          <span className={`px-3 py-1 rounded-full border text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        {exam.description && (
                          <p className="text-slate-400 mb-4">{exam.description}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">الصف:</span>
                            <span className="text-white font-medium mr-2">
                              {exam.grade === 1 ? 'الأول' : exam.grade === 2 ? 'الثاني' : 'الثالث'} الثانوي
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">المدة:</span>
                            <span className="text-white font-medium mr-2">{exam.duration_minutes} دقيقة</span>
                          </div>
                          <div>
                            <span className="text-slate-500">الموعد:</span>
                            <span className="text-white font-medium mr-2">
                              {new Date(exam.scheduled_at).toLocaleString('ar-EG', {
                                timeZone: 'Africa/Cairo',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">النجاح:</span>
                            <span className="text-white font-medium mr-2">{exam.passing_score}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => router.push(`/teacher/exams/${exam.id}`)}
                          variant="outline"
                          size="sm"
                          className="border-emerald-400/20 text-white hover:bg-emerald-500/10"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          متابعة
                        </Button>
                        <Button
                          onClick={() => router.push(`/teacher/exams/edit/${exam.id}`)}
                          variant="outline"
                          size="sm"
                          className="border-blue-400/20 text-blue-400 hover:bg-blue-500/10"
                          disabled={status.label !== 'قادم'}
                          title={status.label !== 'قادم' ? 'لا يمكن تعديل اختبار بدأ أو انتهى' : 'تعديل الاختبار'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(exam.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-400/20 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
