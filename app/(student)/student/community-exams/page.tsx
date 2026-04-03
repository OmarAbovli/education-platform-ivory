import { getCommunityQuizzes } from "@/server/quiz-queries"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import SiteHeader from "@/components/site-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Brain, 
  Clock, 
  Target, 
  ArrowRight, 
  Search,
  Sparkles,
  Calendar,
  User
} from "lucide-react"
import Link from "next/link"

export default async function CommunityExamsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)

  if (!user || user.role !== 'student') {
    return <div>Unauthorized</div>
  }

  const quizzes = await getCommunityQuizzes()

  return (
    <main className="min-h-screen bg-slate-50/50">
      <SiteHeader />
      
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-12 space-y-4">
           <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-wider uppercase text-sm">
              <Users className="h-4 w-4" />
              مجتمع الطلاب (Student Community)
           </div>
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                 <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
                    <Sparkles className="h-10 w-10 text-amber-500" />
                    اختبارات من صنع الزملاء
                 </h1>
                 <p className="text-slate-500 max-w-2xl">
                    تصفح وحل الاختبارات التي قام بإنشائها طلاب آخرون في الصف {user.grade}. تدرب على أفكار جديدة من زملائك!
                 </p>
              </div>
           </div>
        </header>

        {quizzes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {quizzes.map((quiz: any) => (
              <Card key={quiz.id} className="group border-slate-200 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md overflow-hidden bg-white">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                     <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1">
                        <User className="h-3 w-3" /> {quiz.creator_name}
                     </Badge>
                     <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Calendar className="h-3 w-3" />
                        {new Date(quiz.created_at).toLocaleDateString('ar-EG')}
                     </div>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-indigo-600 transition-colors line-clamp-1">{quiz.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <p className="text-xs text-slate-500 line-clamp-2 italic">
                      {quiz.description || "اختبار شامل مخصص من الـ AI لمراجعة المنهج الدراسي."}
                   </p>
                   
                   <div className="grid grid-cols-2 gap-2 text-[11px] font-bold uppercase tracking-tight text-slate-600">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                         <Brain className="h-4 w-4 text-amber-500" />
                         {quiz.question_count} MCQs
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                         <Clock className="h-4 w-4 text-emerald-500" />
                         {quiz.time_limit_minutes} Min
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                         <Target className="h-4 w-4 text-blue-500" />
                         {quiz.passing_score}% Pass
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                         <Users className="h-4 w-4 text-indigo-500" />
                         {quiz.total_enrollment} Solved
                      </div>
                   </div>
                </CardContent>
                <CardFooter className="pt-2">
                   <Link href={`/quiz/${quiz.id}`} className="w-full">
                      <Button className="w-full bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 border-none transition-all group-hover:scale-[1.02] active:scale-[0.98]">
                         Start Solving <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                   </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <Search className="mx-auto h-12 w-12 text-slate-200 mb-4" />
             <h2 className="text-xl font-bold text-slate-400">لا توجد اختبارات مجتمعية متاحة بصفك حالياً</h2>
             <p className="text-slate-400 text-sm mt-1">كن أنت أول من ينشئ اختباراً ويشاركه مع زملائك!</p>
             <Link href="/student/custom-exam">
               <Button variant="link" className="text-indigo-600 font-bold mt-4">
                  Create First Shared Exam 🚀
               </Button>
             </Link>
          </div>
        )}
      </div>
    </main>
  )
}
