import { getQuizSubmission } from "@/server/quiz-queries"
import SiteHeader from "@/components/site-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Trophy, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  Brain,
  Lightbulb,
  Calendar,
  Zap
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Props = { params: { id: string } }

export default async function SubmissionPage({ params }: Props) {
  const submissionId = params.id
  const submission = await getQuizSubmission(submissionId) as any

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <Brain className="h-16 w-16 text-slate-800 mx-auto animate-pulse" />
          <h1 className="text-2xl font-black text-white">لم يتم العثور على النتائج</h1>
          <Link href="/">
            <Button variant="outline">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isPassed = submission.quiz.passing_score ? submission.score >= submission.quiz.passing_score : true
  const scoreColor = isPassed ? "text-emerald-500" : "text-amber-500"
  const bgColor = isPassed ? "from-emerald-500/20" : "from-amber-500/20"

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 relative overflow-hidden pb-20">
      {/* Immersive Background Glows */}
      <div className={cn("absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b via-transparent to-transparent pointer-events-none", bgColor)} />
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10" dir="rtl">
        <SiteHeader />
        
        <div className="mx-auto max-w-5xl px-4 py-12">
          {/* Score Hero Section */}
          <header className="mb-16 text-center space-y-6 animate-in fade-in zoom-in duration-1000">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-widest uppercase mb-4">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(submission.submitted_at || submission.created_at).toLocaleDateString('ar-EG', { dateStyle: 'full' })}
             </div>

             <div className="relative inline-block mt-4">
                <div className={cn("absolute inset-0 blur-[60px] opacity-40 rounded-full", isPassed ? "bg-emerald-500" : "bg-amber-500")} />
                <div className="relative bg-white dark:bg-slate-900 border-8 border-slate-50 dark:border-slate-800 shadow-2xl rounded-[3rem] p-10 md:p-14 transition-transform hover:scale-105 duration-500">
                   <div className="flex flex-col items-center gap-2">
                      <span className={cn("text-7xl md:text-9xl font-black tracking-tighter", scoreColor)}>
                         {submission.score}%
                      </span>
                      <div className="flex items-center gap-3 mt-4">
                         {isPassed ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-black px-6 py-2 rounded-full text-lg shadow-lg shadow-emerald-500/30 border-none">
                               <Trophy className="mr-2 h-5 w-5" /> ناجح ومتميز
                            </Badge>
                         ) : (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-black px-6 py-2 rounded-full text-lg shadow-lg shadow-amber-500/30 border-none">
                               <Target className="mr-2 h-5 w-5" /> يحتاج مراجعة
                            </Badge>
                         )}
                      </div>
                   </div>
                </div>
                {isPassed && (
                   <div className="absolute -top-6 -right-6 bg-amber-400 p-4 rounded-3xl shadow-xl shadow-amber-400/30 rotate-12 animate-bounce">
                      <Sparkles className="h-8 w-8 text-amber-900" />
                   </div>
                )}
             </div>

             <div className="mt-10 space-y-3">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                   {submission.quiz.title}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold max-w-xl mx-auto text-lg leading-relaxed">
                   تهانينا على إتمام الاختبار! إليك تحليل شامل لأدائك وإجاباتك لتطوير مستواك.
                </p>
             </div>
          </header>

          {/* Analysis & Review Section */}
          <div className="grid gap-10">
             <div className="flex items-center gap-4 px-4 overflow-hidden">
                <div className="h-px bg-slate-900/10 dark:bg-white/10 flex-1" />
                <h2 className="text-xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-3 shrink-0">
                   <Zap className="h-5 w-5 text-amber-500" /> مراجعة الأسئلة (Deep Review)
                </h2>
                <div className="h-px bg-slate-900/10 dark:bg-white/10 flex-1" />
             </div>

             <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
               {submission.questions.map((q: any, index: number) => {
                 const isCorrect = q.student_answer?.is_correct;
                 
                 return (
                   <Card key={q.id} className="group border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl rounded-[2.5rem] overflow-hidden transition-all hover:border-emerald-500/30">
                     <CardContent className="p-8 md:p-12 space-y-8">
                       <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="space-y-4 flex-1">
                             <div className="flex items-center gap-3">
                                <span className={cn(
                                   "flex h-12 w-12 items-center justify-center rounded-2xl font-black text-lg shadow-sm border-2 shrink-0",
                                   isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "bg-red-500 border-red-500 text-white"
                                )}>
                                   {index + 1}
                                </span>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                   {q.question_text}
                                </h3>
                             </div>
                             
                             <div className="grid gap-3 pr-0 md:pr-14">
                               {q.options.map((opt: any, optIndex: number) => {
                                 const isSelected = q.student_answer?.selected_option_index === optIndex
                                 const isCorrectOption = opt.is_correct

                                 let stateStyles = "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 opacity-60"
                                 if (isSelected) {
                                   stateStyles = isCorrectOption 
                                     ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 text-emerald-700 dark:text-emerald-400 opacity-100 scale-[1.01]"
                                     : "border-red-500 bg-red-500/10 ring-2 ring-red-500/20 text-red-700 dark:text-red-400 opacity-100 scale-[1.01]"
                                 } else if (isCorrectOption) {
                                   stateStyles = "border-emerald-500/50 bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 opacity-100 ring-2 ring-emerald-500/10"
                                 }

                                 return (
                                   <div key={optIndex} className={cn(
                                      "p-4 md:p-5 border-2 rounded-2xl flex items-center justify-between transition-all duration-300 font-bold",
                                      stateStyles
                                   )}>
                                       <div className="flex items-center gap-4">
                                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 text-[10px] font-black uppercase tracking-tighter shrink-0 opacity-50 border-current">
                                             {String.fromCharCode(65 + optIndex)}
                                          </span>
                                          <p className="text-base md:text-lg leading-relaxed">{opt.text}</p>
                                       </div>
                                       {isSelected && isCorrectOption && <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />}
                                       {isSelected && !isCorrectOption && <XCircle className="h-6 w-6 text-red-500 shrink-0" />}
                                       {!isSelected && isCorrectOption && <CheckCircle2 className="h-6 w-6 text-emerald-500/50 shrink-0" />}
                                   </div>
                                 )
                               })}
                             </div>
                          </div>
                       </div>

                       {/* AI Expert Analysis Bubble */}
                       {q.feedback && (
                         <div className="relative mt-10 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="absolute -top-3 right-10 w-4 h-4 bg-indigo-50 dark:bg-indigo-950/50 rotate-45 border-t border-r border-indigo-100 dark:border-white/10" />
                            <div className="p-6 md:p-8 rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-white/10 flex flex-col md:flex-row items-start gap-5 shadow-sm">
                               <div className="bg-amber-500 p-4 rounded-2xl shadow-xl shadow-amber-500/20 shrink-0">
                                  <Lightbulb className="h-7 w-7 text-white" />
                                </div>
                                <div className="space-y-3">
                                   <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                      <Sparkles className="h-3 w-3" /> تحليل الذكاء الاصطناعي (Smart Analysis)
                                   </h4>
                                   <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic tracking-tight">
                                      {q.feedback}
                                   </p>
                                </div>
                            </div>
                         </div>
                       )}
                     </CardContent>
                   </Card>
                 )
               })}
             </div>
          </div>

          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
             <Link href="/student/custom-exam">
                <Button className="h-16 px-10 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-black rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 text-lg">
                   <Brain className="ml-2 h-6 w-6" /> إنشاء اختبار جديد
                </Button>
             </Link>
             <Link href="/">
                <Button variant="outline" className="h-16 px-10 border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-black rounded-2xl transition-all hover:bg-slate-100 dark:hover:bg-slate-900 text-lg">
                   <ArrowRight className="ml-2 h-6 w-6" /> العودة للرئيسية
                </Button>
             </Link>
          </div>
        </div>
      </div>
    </main>
  )
}