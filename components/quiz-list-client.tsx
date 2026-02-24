'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteQuiz } from '@/server/quiz-actions'
import { useToast } from '@/hooks/use-toast'

type Quiz = {
  id: string;
  title: string;
  video_title: string | null;
  question_count: string;
  created_at: Date;
}

export function QuizListClient({ quizzes }: { quizzes: Quiz[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete(quizId: string) {
    setIsDeleting(true)
    try {
      await deleteQuiz(quizId)
      toast({ title: "نجاح", description: "تم حذف الاختبار بنجاح." })
      router.refresh() // Refresh the page to update the list
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الاختبار.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Table dir="rtl">
        <TableHeader>
          <TableRow>
            <TableHead>العنوان</TableHead>
            <TableHead>الفيديو المرتبط</TableHead>
            <TableHead>عدد الأسئلة</TableHead>
            <TableHead>تاريخ الإنشاء</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quizzes.map((quiz) => (
            <TableRow key={quiz.id}>
              <TableCell>{quiz.title}</TableCell>
              <TableCell>{quiz.video_title || '-'}</TableCell>
              <TableCell>{quiz.question_count}</TableCell>
              <TableCell>{new Date(quiz.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/teacher/quizzes/${quiz.id}/edit`}>تعديل</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/teacher/quizzes/${quiz.id}/results`}>عرض النتائج</Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      حذف
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيؤدي هذا الإجراء إلى حذف الاختبار بشكل دائم وجميع البيانات المرتبطة به (الأسئلة، التقديمات، والإجابات). لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(quiz.id)} disabled={isDeleting}>
                        {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
