'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { submitQuiz } from '@/server/quiz-actions'

type Quiz = {
  id: string
  title: string
  description: string
  video_id: string
  time_limit_minutes?: number
  questions: {
    id: string
    question_text: string
    order: number
    options: {
      text: string
    }[]
  }[]
}

type FormValues = {
  answers: {
    question_id: string
    selected_option_index: number
  }[]
}

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
}

export function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const router = useRouter()
  const { control, handleSubmit, setValue, reset } = useForm<FormValues>({
    defaultValues: {
        answers: quiz.questions.map(q => ({ question_id: q.id, selected_option_index: -1 }))
    },
    shouldUnregister: false,
  })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState((quiz.time_limit_minutes || 0) * 60)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // Reset the form, timer, and question index whenever the quiz prop changes.
    // This is crucial for quiz retakes to ensure a fresh start.
    reset({
        answers: quiz.questions.map(q => ({ question_id: q.id, selected_option_index: -1 }))
    });
    setCurrentQuestionIndex(0);
    setTimeLeft((quiz.time_limit_minutes || 0) * 60);
  }, [quiz, reset]);

  useEffect(() => {
    if (!quiz.time_limit_minutes) return

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer)
          formRef.current?.requestSubmit()
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [quiz.time_limit_minutes])

  const onSubmit = async (data: FormValues) => {
    const { submissionId } = await submitQuiz(quiz.id, data.answers)
    router.push(`/quiz/submission/${submissionId}`)
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="grid gap-6 mt-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-xl font-semibold">{quiz.title}</h2>
                <p className="text-muted-foreground">{quiz.description}</p>
            </div>
            {quiz.time_limit_minutes && (
                <div className="text-lg font-semibold p-2 border rounded-lg">
                    <span>الوقت المتبقي: {formatTime(timeLeft)}</span>
                </div>
            )}
        </div>

        <div key={currentQuestion.id} className="p-4 border rounded-lg">
            <p className="font-medium">{currentQuestionIndex + 1}. {currentQuestion.question_text}</p>
            <Controller
                name={`answers.${currentQuestionIndex}.selected_option_index`}
                control={control}
                render={({ field }) => (
                    <RadioGroup 
                        onValueChange={(value) => field.onChange(parseInt(value, 10))}
                        value={field.value.toString()}
                    >
                        {currentQuestion.options.map((o, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2 mt-2">
                            <RadioGroupItem value={optionIndex.toString()} id={`${currentQuestion.id}-${optionIndex}`} />
                            <Label htmlFor={`${currentQuestion.id}-${optionIndex}`}>{o.text}</Label>
                        </div>
                        ))}
                    </RadioGroup>
                )}
            />
        </div>

        <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))} disabled={currentQuestionIndex === 0}>
                Previous
            </Button>
            {currentQuestionIndex < quiz.questions.length - 1 ? (
                <Button type="button" onClick={() => setCurrentQuestionIndex(i => Math.min(quiz.questions.length - 1, i + 1))}>
                    Next
                </Button>
            ) : (
                <Button type="submit">Submit Quiz</Button>
            )}
        </div>
    </form>
  )
}