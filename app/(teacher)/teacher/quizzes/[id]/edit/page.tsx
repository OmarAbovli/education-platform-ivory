import { getQuizForEditing } from "@/server/quiz-queries";
import { TeacherAppSidebar } from "@/components/teacher-app-sidebar";
import { EditQuizForm } from "@/components/edit-quiz-form";

type Props = { params: { id: string } };

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuizForEditing(id) as any;

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center p-4 sm:p-6">
        <h1 className="text-2xl font-bold">الاختبار غير موجود</h1>
        <p>لم نتمكن من العثور على الاختبار الذي تبحث عنه.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">تعديل الاختبار: {quiz.title}</h1>
      </header>
      <main className="mt-6 max-w-4xl">
        <EditQuizForm quiz={quiz} />
      </main>
    </div>
  );
}
