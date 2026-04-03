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
    <main className="min-h-screen bg-slate-50/50">
      <SiteHeader />
      
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-4">
           <div className="flex items-center gap-2 text-emerald-600 font-bold tracking-wider uppercase text-sm">
              <Sparkles className="h-4 w-4" />
              AI Learning Assistant
           </div>
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                 <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
                    <Brain className="h-10 w-10 text-emerald-500" />
                    منشئ الاختبارات المخصصة
                 </h1>
                 <p className="text-slate-500 max-w-2xl">
                    Generate a comprehensive AI exam by selecting multiple lessons. Tailor the difficulty and focus to your needs.
                 </p>
              </div>
              <div className="shrink-0">
                 <Link href="/student/community-exams">
                    <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold">
                       <Users className="mr-2 h-4 w-4" /> Browse Shared Exams
                    </Button>
                 </Link>
              </div>
              <div className="flex -space-x-3 overflow-hidden">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-emerald-100 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                   </div>
                 ))}
                 <div className="flex items-center justify-center h-10 px-3 rounded-full bg-slate-900 text-white text-xs font-bold ring-2 ring-white">
                    +150 Students
                 </div>
              </div>
           </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
           {teachersData.length > 0 ? (
             <CustomExamForm teachersData={teachersData} />
           ) : (
             <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <Brain className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-400">لا يوجد دروس متاحة حالياً</h2>
                <p className="text-slate-400 text-sm">اشترك في باقات المدرسين لتتمكن من إنشاء اختبارات مخصصة.</p>
             </div>
           )}
        </section>
      </div>
    </main>
  )
}
