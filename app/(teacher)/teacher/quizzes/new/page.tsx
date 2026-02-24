import { CreateQuizForm } from "@/components/create-quiz-form";
import { TeacherAppSidebar } from "@/components/teacher-app-sidebar";

export default function CreateQuizPage() {
  return (
    <div className="flex flex-col p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">إنشاء اختبار جديد</h1>
      </header>
      <main className="mt-6 max-w-4xl">
        <CreateQuizForm />
      </main>
    </div>
  );
}
