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
    <main className="min-h-screen bg-white dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <SiteHeader />
        
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <header className="mb-12 space-y-6">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase text-[10px]">
                <Users className="h-3 w-3" />
                Student Community (مجتمع الطلاب)
             </div>
             
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                   <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight text-right md:text-left">
                      <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                         <Sparkles className="h-10 w-10 text-white" />
                      </div>
                      اختبارات من صنع الزملاء
                   </h1>
                   <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg leading-relaxed text-right md:text-left">
                      تصفح وحل الاختبارات التي قام بإنشائية طلاب آخرون في الصف {user.grade}. تدرب على أفكار جديدة من زملائك!
                   </p>
                </div>
                
                <Link href="/student/custom-exam">
                   <Button variant="outline" className="h-12 px-6 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm">
                      <Brain className="mr-2 h-5 w-5 text-emerald-500" /> Create Your Own
                   </Button>
                </Link>
             </div>
          </header>

          <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            {quizzes.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz: any) => (
                  <Card key={quiz.id} className="group overflow-hidden border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-500/10">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start mb-3">
                         <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 flex items-center gap-1 font-bold">
                            <User className="h-3 w-3" /> {quiz.creator_name}
                         </Badge>
                         <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                            <Calendar className="h-3 w-3" />
                            {new Date(quiz.created_at).toLocaleDateString('ar-EG')}
                         </div>
                      </div>
                      <CardTitle className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {quiz.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                       <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                          {quiz.description || "اختبار شامل مخصص من الـ AI لمراجعة المنهج الدراسي."}
                       </p>
                       
                       <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                             <Brain className="h-4 w-4 text-amber-500 mb-1" />
                             <span className="text-[10px] font-black uppercase text-slate-400">Questions</span>
                             <span className="text-sm font-bold text-slate-900 dark:text-white">{quiz.question_count} MCQs</span>
                          </div>
                          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                             <Clock className="h-4 w-4 text-emerald-500 mb-1" />
                             <span className="text-[10px] font-black uppercase text-slate-400">Duration</span>
                             <span className="text-sm font-bold text-slate-900 dark:text-white">{quiz.time_limit_minutes} Min</span>
                          </div>
                          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                             <Target className="h-4 w-4 text-blue-500 mb-1" />
                             <span className="text-[10px] font-black uppercase text-slate-400">Difficulty</span>
                             <span className="text-sm font-bold text-slate-900 dark:text-white">{quiz.passing_score}% Pass</span>
                          </div>
                          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                             <Users className="h-4 w-4 text-indigo-500 mb-1" />
                             <span className="text-[10px] font-black uppercase text-slate-400">Usage</span>
                             <span className="text-sm font-bold text-slate-900 dark:text-white">{quiz.total_enrollment} Solved</span>
                          </div>
                       </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                       <Link href={`/quiz/${quiz.id}`} className="w-full">
                          <Button className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-black h-12 rounded-xl transition-all shadow-lg shadow-indigo-500/10">
                             Start Solving <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                       </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 glass-panel rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center">
                 <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-3xl mb-6 text-slate-300 dark:text-slate-700">
                    <Search className="h-16 w-16" />
                 </div>
                 <h2 className="text-2xl font-black text-slate-400 dark:text-slate-600 mb-2">لا توجد اختبارات مجتمعية متاحة بصفك حالياً</h2>
                 <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm">كن أنت أول من ينشئ اختباراً ويشاركه مع زملائك!</p>
                 <Button variant="link" className="mt-4 text-indigo-600 font-bold underline" asChild>
                    <Link href="/student/custom-exam">Create First Shared Exam 🚀</Link>
                 </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
