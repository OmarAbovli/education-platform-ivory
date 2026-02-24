'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller, Control, UseFormRegister, UseFormSetValue, UseFormGetValues } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createQuiz } from '@/server/quiz-actions'
import { getAllVideosForQuizForm } from '@/server/public-queries'

type FormValues = {
  title: string;
  videoId: string;
  description?: string;
  time_limit_minutes?: number;
  passing_score?: number;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;

  questions: {
    question_text: string;
    question_type: 'multiple-choice' | 'true-false';
    order: number;
    feedback?: string;
    options: {
      text: string;
      is_correct: boolean;
    }[];
  }[];
};


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
              const newOptions = field.value.map((opt, idx) => ({ ...opt, is_correct: idx === Number(value) }));
              setValue(`questions.${questionIndex}.options`, newOptions);
            }}
            value={String(field.value.findIndex(opt => opt.is_correct))}
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

export function CreateQuizForm() {
  const [videos, setVideos] = useState<{ id: string; title: string }[]>([])
  const { register, control, handleSubmit, reset, watch, setValue, getValues } = useForm<FormValues>({
    defaultValues: {
      title: '',
      videoId: '',
      questions: [],
      max_attempts: 1,
      shuffle_questions: false,
      shuffle_options: false,
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
    const { title, videoId, questions, ...settings } = data
    await createQuiz(videoId, title, questions, settings)
    reset()
  }

  return (
    <form dir="rtl" onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="title">عنوان الاختبار</Label>
        <Input id="title" {...register('title')} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="video">الفيديو</Label>
        <Select onValueChange={(value) => setValue('videoId', value)}>
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
            <Checkbox id="shuffle_questions" {...register('shuffle_questions')} />
            <Label htmlFor="shuffle_questions">خلط الأسئلة</Label>
        </div>
        <div className="flex items-center space-x-2">
            <Checkbox id="shuffle_options" {...register('shuffle_options')} />
            <Label htmlFor="shuffle_options">خلط الخيارات</Label>
        </div>

      <div>
        <h3 className="text-lg font-medium">الأسئلة</h3>
        {fields.map((field, index) => (
          <div key={field.id} className="mt-4 grid gap-4 rounded-md border p-4">
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
                onValueChange={(value) => {
                  setValue(`questions.${index}.question_type`, value as 'multiple-choice' | 'true-false')
                }}
              >
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

      <Button type="submit">إنشاء اختبار</Button>
    </form>
  )
}
