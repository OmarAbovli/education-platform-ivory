import { getQuizzesByTeacher } from "@/server/quiz-queries";
import { QuizListClient } from "@/components/quiz-list-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TeacherQuizzesPage() {
  const quizzes = await getQuizzesByTeacher();

  return (
    <div className="flex flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الاختبارات</h1>
        <Button asChild>
          <Link href="/teacher/quizzes/new">إنشاء اختبار جديد</Link>
        </Button>
      </header>
      <main className="mt-6">
        <QuizListClient quizzes={quizzes} />
      </main>
    </div>
  );
}
