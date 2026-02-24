'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Control, UseFormSetValue, UseFormGetValues, Controller } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { updateQuiz } from '@/server/quiz-actions'
import { getAllVideosForQuizForm } from '@/server/video-access'
import { useToast } from '@/hooks/use-toast'

type QuizData = {
    id: string;
    title: string;
    video_id: string;
    description: string | null;
    time_limit_minutes: number | null;
    passing_score: number | null;
    max_attempts: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    teacher_id: string;
    questions: {
        id: string;
        question_text: string;
        order: number;
        options: any;
        feedback: string | null;
    }[];
}

type FormValues = {
  title: string
  videoId: string
  description: string
  time_limit_minutes: number
  passing_score: number
  max_attempts: number
  shuffle_questions: boolean
  shuffle_options: boolean
  questions: {
    id?: string
    question_text: string
    question_type: 'multiple-choice' | 'true-false'
    order: number
    feedback: string
    options: {
      text: string
      is_correct: boolean
    }[]
  }[]
}

function QuestionOptions({ questionIndex, control, register, questionType, setValue, getValues }: { questionIndex: number, control: Control<FormValues>, register: any, questionType: string, setValue: UseFormSetValue<FormValues>, getValues: UseFormGetValues<FormValues> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  // Effect to setup options for T/F questions or clear them when switching types
  useEffect(() => {
    const currentOptions = getValues(`questions.${questionIndex}.options`) || [];
    if (questionType === 'true-false') {
      if (currentOptions.length !== 2 || currentOptions[0].text !== 'صح') {
        setValue(`questions.${questionIndex}.options`, [
          { text: 'صح', is_correct: false },
          { text: 'خطأ', is_correct: false },
        ]);
      }
    } else {
      // If switching away from T/F, clear the options if they were T/F options
      if (currentOptions.length === 2 && currentOptions[0].text === 'صح') {
         setValue(`questions.${questionIndex}.options`, []);
      }
    }
  }, [questionType, questionIndex, setValue, getValues]);

  // For BOTH question types, use a RadioGroup to select the ONE correct answer.
  return (
    <div className="grid gap-4 pl-4 border-l-2">
      <Label>الخيارات والإجابة الصحيحة</Label>
      
      <Controller
        name={`questions.${questionIndex}.options`}
        control={control}
        render={({ field }) => (
          <RadioGroup
            onValueChange={(value) => {
              const newOptions = (field.value || []).map((opt, idx) => ({ ...opt, is_correct: idx === Number(value) }));
              setValue(`questions.${questionIndex}.options`, newOptions);
            }}
            value={String((field.value || []).findIndex(opt => opt.is_correct))}
          >
            {fields.map((item, optionIndex) => (
              <div key={item.id} className="grid gap-2">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <RadioGroupItem 
                    value={String(optionIndex)} 
                    id={`questions.${questionIndex}.options.${optionIndex}.is_correct`} 
                  />
                  <Input 
                    {...register(`questions.${questionIndex}.options.${optionIndex}.text`)} 
                    placeholder={`خيار ${optionIndex + 1}`} 
                    className="flex-1"
                    readOnly={questionType === 'true-false'}
                  />
                  {questionType === 'multiple-choice' && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(optionIndex)}>
                      إزالة
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        )}
      />

      {questionType === 'multiple-choice' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ text: '', is_correct: false })}
          className="mt-2 w-full"
        >
          إضافة خيار
        </Button>
      )}
    </div>
  );
}

export function EditQuizForm({ quiz }: { quiz: QuizData }) {
  const router = useRouter()
  const { toast } = useToast()
  const [videos, setVideos] = useState<{ id: string; title: string }[]>([])
  const { register, control, handleSubmit, watch, setValue, getValues } = useForm<FormValues>({
    defaultValues: {
      title: quiz.title,
      videoId: quiz.video_id,
      description: quiz.description || '',
      time_limit_minutes: quiz.time_limit_minutes || 0,
      passing_score: quiz.passing_score || 50,
      max_attempts: quiz.max_attempts || 1,
      shuffle_questions: quiz.shuffle_questions || false,
      shuffle_options: quiz.shuffle_options || false,
      questions: quiz.questions.map(q => ({
        ...q,
        question_type: q.options.length === 2 && q.options.every((opt: any) => ['صح', 'خطأ', 'true', 'false'].includes(opt.text.toLowerCase())) ? 'true-false' : 'multiple-choice',
        feedback: q.feedback || ''
      }))
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  })

  useEffect(() => {
    async function fetchVideos() {
      const allVideos = await getAllVideosForQuizForm()
      setVideos(allVideos)
    }
    fetchVideos()
  }, [])

  const onSubmit = async (data: FormValues) => {
    try {
        await updateQuiz(quiz.id, data as any)
        toast({ title: "نجاح", description: "تم تحديث الاختبار بنجاح." })
        router.push('/teacher/quizzes')
        router.refresh()
    } catch (error) {
        toast({ title: "خطأ", description: "فشل تحديث الاختبار.", variant: "destructive" })
    }
  }

  return (
    <form dir="rtl" onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
        {/* Form fields are the same as CreateQuizForm, just pre-filled */}
        <div className="grid gap-2">
            <Label htmlFor="title">عنوان الاختبار</Label>
            <Input id="title" {...register('title')} />
        </div>

        <div className="grid gap-2">
            <Label htmlFor="video">الفيديو</Label>
            <Select defaultValue={quiz.video_id} onValueChange={(value) => setValue('videoId', value)}>
            <SelectTrigger>
                <SelectValue placeholder="اختر فيديو" />
            </SelectTrigger>
            <SelectContent>
                {videos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                    {video.title}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>

        <div className="grid gap-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea id="description" {...register('description')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="time_limit_minutes">الوقت المحدد (بالدقائق)</Label>
                <Input id="time_limit_minutes" type="number" {...register('time_limit_minutes', { valueAsNumber: true })} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="passing_score">درجة النجاح (%)</Label>
                <Input id="passing_score" type="number" {...register('passing_score', { valueAsNumber: true })} />
            </div>
        </div>

        <div className="grid gap-2">
            <Label htmlFor="max_attempts">الحد الأقصى للمحاولات</Label>
            <Input id="max_attempts" type="number" {...register('max_attempts', { valueAsNumber: true, min: 0 })} />
            <p className="text-sm text-muted-foreground">ادخل 0 لمحاولات لا نهائية.</p>
        </div>

        <div className="flex items-center space-x-2">
            <Controller name="shuffle_questions" control={control} render={({ field }) => <Checkbox id="shuffle_questions" checked={field.value} onCheckedChange={field.onChange} />} />
            <Label htmlFor="shuffle_questions">خلط الأسئلة</Label>
        </div>
        <div className="flex items-center space-x-2">
            <Controller name="shuffle_options" control={control} render={({ field }) => <Checkbox id="shuffle_options" checked={field.value} onCheckedChange={field.onChange} />} />
            <Label htmlFor="shuffle_options">خلط الخيارات</Label>
        </div>

        <div>
            <h3 className="text-lg font-medium">الأسئلة</h3>
            {fields.map((field, index) => (
            <div key={field.id} className="mt-4 grid gap-4 rounded-md border p-4">
                <Input type="hidden" {...register(`questions.${index}.id`)} />
                <div className="grid gap-2">
                <Label htmlFor={`questions.${index}.question_text`}>نص السؤال</Label>
                <Input
                    id={`questions.${index}.question_text`}
                    {...register(`questions.${index}.question_text`)}
                />
                </div>

                <div className="grid gap-2">
                <Label>نوع السؤال</Label>
                <Select 
                    defaultValue={watch(`questions.${index}.question_type`)} 
                    onValueChange={(value) => setValue(`questions.${index}.question_type`, value as 'multiple-choice' | 'true-false')}>
                    <SelectTrigger>
                    <SelectValue placeholder="اختر نوعًا" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="multiple-choice">اختيار من متعدد</SelectItem>
                    <SelectItem value="true-false">صح / خطأ</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <QuestionOptions questionIndex={index} control={control} register={register} questionType={watch(`questions.${index}.question_type`)} setValue={setValue} getValues={getValues} />

                <div className="grid gap-2">
                    <Label htmlFor={`questions.${index}.feedback`}>ملاحظات (تظهر بعد الإجابة)</Label>
                    <Textarea id={`questions.${index}.feedback`} {...register(`questions.${index}.feedback`)} />
                </div>

                <Button type="button" variant="destructive" onClick={() => remove(index)}>
                إزالة السؤال
                </Button>
            </div>
            ))}
            <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() =>
                append({ question_text: '', question_type: 'multiple-choice', order: fields.length, options: [], feedback: '' })
            }
            >
            إضافة سؤال
            </Button>
        </div>

        <Button type="submit">تحديث الاختبار</Button>
    </form>
  )
}
