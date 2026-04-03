import { getStudentDashboardData } from "@/server/student-queries"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { CustomExamForm } from "@/components/ai/custom-exam-form"
import SiteHeader from "@/components/site-header"
import { Sparkles, Brain, GraduationCap, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CustomExamPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)

  if (!user || user.role !== 'student') {
    return <div>Unauthorized</div>
  }

  const dashboardDataRaw = await getStudentDashboardData(user.id)
  
  // Transform data to simplify it for the form
  const teachersData = dashboardDataRaw.map((t: any) => ({
    teacherId: t.teacherId,
    teacherName: t.teacherName,
    packages: t.packages
      .filter((pkg: any) => pkg.isAccessible)
      .map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        videos: pkg.videos.map((v: any) => ({
          id: v.id,
          title: v.title
        }))
      }))
      .filter((pkg: any) => pkg.videos.length > 0)
  })).filter((t: any) => t.packages.length > 0)

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-emerald-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10">
        <SiteHeader />
        
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <header className="mb-12 space-y-6">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold tracking-wider uppercase text-[10px]">
                <Sparkles className="h-3 w-3" />
                AI Learning Assistant
             </div>
             
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                   <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
                      <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                         <Brain className="h-10 w-10 text-white" />
                      </div>
                      منشئ الاختبارات المخصصة
                   </h1>
                   <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg leading-relaxed">
                      Generate a comprehensive AI exam by selecting multiple lessons. Tailor the difficulty and focus to your needs.
                   </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex -space-x-3 overflow-hidden">
                     {[1, 2, 3].map((i) => (
                       <div key={i} className="inline-block h-12 w-12 rounded-full ring-4 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-emerald-500" />
                       </div>
                     ))}
                     <div className="flex items-center justify-center h-12 px-4 rounded-full bg-slate-900 dark:bg-emerald-500 text-white text-xs font-black ring-4 ring-white dark:ring-slate-900">
                        +150 Students
                     </div>
                  </div>
                  
                  <Link href="/student/community-exams">
                     <Button variant="outline" className="h-12 px-6 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 font-bold transition-all hover:scale-105 active:scale-95">
                        <Users className="mr-2 h-5 w-5 text-indigo-500" /> Browse Shared Exams
                     </Button>
                  </Link>
                </div>
             </div>
          </header>

          <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
             {teachersData.length > 0 ? (
               <CustomExamForm teachersData={teachersData} />
             ) : (
               <div className="text-center py-32 glass-panel rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center">
                  <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-3xl mb-6 text-slate-300 dark:text-slate-700">
                     <Brain className="h-16 w-16" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-400 dark:text-slate-600 mb-2">لا يوجد دروس متاحة حالياً</h2>
                  <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm">اشترك في باقات المدرسين لتتمكن من استخدام منشئ الاختبارات الذكي.</p>
                  <Button variant="link" className="mt-4 text-emerald-500 font-bold underline" asChild>
                     <Link href="/">Explore Teachers</Link>
                  </Button>
               </div>
             )}
          </section>
        </div>
      </div>
    </main>
  )
}
