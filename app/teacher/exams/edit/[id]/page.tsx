"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react"
import { 
  getExamDetails, 
  updateLiveExam, 
  type CreateExamInput, 
  type ExamQuestion 
} from "@/server/live-exam-actions"

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [grade, setGrade] = useState<1 | 2 | 3>(1)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [scheduledAt, setScheduledAt] = useState("")
  const [passingScore, setPassingScore] = useState(50)
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [shuffleChoices, setShuffleChoices] = useState(true)
  const [allowRetry, setAllowRetry] = useState(true)
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false)
  
  const [questions, setQuestions] = useState<ExamQuestion[]>([])

  useEffect(() => {
    loadExamData()
  }, [])

  const loadExamData = async () => {
    const result = await getExamDetails(resolvedParams.id)
    
    if (!result.success || !result.exam) {
      setError("فشل تحميل بيانات الاختبار")
      setLoading(false)
      return
    }

    const exam = result.exam
    setTitle(exam.title)
    setDescription(exam.description || "")
    setGrade(exam.grade as 1 | 2 | 3)
    setDurationMinutes(exam.duration_minutes)
    
    // Convert ISO date to datetime-local format
    const scheduledDate = new Date(exam.scheduled_at)
    const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setScheduledAt(localDateTime)
    
    setPassingScore(exam.passing_score)
    setShuffleQuestions(exam.shuffle_questions)
    setShuffleChoices(exam.shuffle_choices)
    setAllowRetry(exam.allow_retry)
    setMaxAttempts(exam.max_attempts)
    setShowCorrectAnswers(exam.show_correct_answers)
    
    // Load questions with choices
    if (result.questions) {
      setQuestions(result.questions as ExamQuestion[])
    }

    setLoading(false)
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        question_order: questions.length + 1,
        points: 1,
        choices: [
          { choice_text: "", is_correct: false, choice_order: 1 },
          { choice_text: "", is_correct: false, choice_order: 2 }
        ]
      }
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof ExamQuestion, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const addChoice = (questionIndex: number) => {
    const updated = [...questions]
    const question = updated[questionIndex]
    question.choices.push({
      choice_text: "",
      is_correct: false,
      choice_order: question.choices.length + 1
    })
    setQuestions(updated)
  }

  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].choices = updated[questionIndex].choices.filter((_, i) => i !== choiceIndex)
    setQuestions(updated)
  }

  const updateChoice = (questionIndex: number, choiceIndex: number, field: string, value: any) => {
    const updated = [...questions]
    updated[questionIndex].choices[choiceIndex] = {
      ...updated[questionIndex].choices[choiceIndex],
      [field]: value
    }
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Convert datetime-local to Cairo timezone
      const scheduledAtWithSeconds = scheduledAt.includes(':') && scheduledAt.split(':').length === 2 
        ? scheduledAt + ':00' 
        : scheduledAt
      const cairoDateTime = scheduledAtWithSeconds + '+02:00'
      const utcDate = new Date(cairoDateTime)
      
      const input: Partial<CreateExamInput> = {
        title,
        description,
        grade,
        duration_minutes: durationMinutes,
        scheduled_at: utcDate.toISOString(),
        passing_score: passingScore,
        shuffle_questions: shuffleQuestions,
        shuffle_choices: shuffleChoices,
        allow_retry: allowRetry,
        max_attempts: maxAttempts,
        show_correct_answers: showCorrectAnswers,
        questions
      }

      const result = await updateLiveExam(resolvedParams.id, input)

      if (result.success) {
        router.push("/teacher/exams")
      } else {
        setError(result.error || "فشل تحديث الاختبار")
      }
    } catch (err) {
      setError("حدث خطأ غير متوقع")
    } finally {
      setSaving(false)
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
      <div className="max-w-4xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-bold text-white">تعديل الاختبار</h1>
            <p className="text-slate-400">قم بتعديل بيانات الاختبار</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardHeader>
              <CardTitle className="text-white">المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">عنوان الاختبار *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">الوصف</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">الصف *</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(parseInt(e.target.value) as 1 | 2 | 3)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value={1}>الصف الأول الثانوي</option>
                    <option value={2}>الصف الثاني الثانوي</option>
                    <option value={3}>الصف الثالث الثانوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">المدة (بالدقائق) *</label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                    required
                    min={1}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">موعد الاختبار *</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">درجة النجاح (%) *</label>
                  <Input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value))}
                    required
                    min={0}
                    max={100}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700"
                  />
                  <span className="text-sm text-slate-300">خلط ترتيب الأسئلة</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shuffleChoices}
                    onChange={(e) => setShuffleChoices(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700"
                  />
                  <span className="text-sm text-slate-300">خلط ترتيب الاختيارات</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowRetry}
                    onChange={(e) => setAllowRetry(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700"
                  />
                  <span className="text-sm text-slate-300">السماح بإعادة المحاولة</span>
                </label>

                {allowRetry && (
                  <div className="mr-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      عدد المحاولات (اتركه فارغاً لعدد غير محدود)
                    </label>
                    <Input
                      type="number"
                      value={maxAttempts || ""}
                      onChange={(e) => setMaxAttempts(e.target.value ? parseInt(e.target.value) : null)}
                      min={1}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700"
                  />
                  <span className="text-sm text-slate-300">إظهار الإجابات الصحيحة بعد الانتهاء</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="bg-slate-900 border-emerald-400/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">الأسئلة ({questions.length})</CardTitle>
                <Button
                  type="button"
                  onClick={addQuestion}
                  variant="outline"
                  className="border-emerald-400/20 text-emerald-400"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة سؤال
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                  <div className="flex items-start justify-between">
                    <h4 className="text-white font-medium">سؤال {qIndex + 1}</h4>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">نص السؤال *</label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">النقاط *</label>
                    <Input
                      type="number"
                      value={question.points}
                      onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                      required
                      min={1}
                      className="bg-slate-800 border-slate-700 text-white w-32"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">الاختيارات *</label>
                      <Button
                        type="button"
                        onClick={() => addChoice(qIndex)}
                        variant="outline"
                        size="sm"
                        className="border-slate-700 text-slate-400"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        إضافة اختيار
                      </Button>
                    </div>

                    {question.choices.map((choice, cIndex) => (
                      <div key={cIndex} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={choice.is_correct}
                          onChange={(e) => updateChoice(qIndex, cIndex, 'is_correct', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700"
                        />
                        <Input
                          value={choice.choice_text}
                          onChange={(e) => updateChoice(qIndex, cIndex, 'choice_text', e.target.value)}
                          required
                          className="bg-slate-800 border-slate-700 text-white flex-1"
                        />
                        {question.choices.length > 2 && (
                          <Button
                            type="button"
                            onClick={() => removeChoice(qIndex, cIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/teacher/exams")}
              variant="outline"
              className="border-slate-400/20 text-white"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
