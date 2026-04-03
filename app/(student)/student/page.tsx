import { Suspense } from "react"
import SiteHeader from "@/components/site-header"

export const dynamic = "force-dynamic"
import { cookies } from "next/headers"
import Link from "next/link"
import ModernStudentVideoCard from "@/components/modern-student-video-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCurrentUser } from "@/lib/auth"
import {
  getStudentDashboardData,
  getUpcomingLiveSessions,
  getActiveLiveStreams,
  getAccessibleVideoCategories,
  getUpcomingLiveExams,
  getRecentlyWatchedVideos,
} from "@/server/student-queries"
import { getStudentXPStatus } from "@/server/xp-actions"
import { XPProgressCard } from "@/components/xp-progress-card"
import { getAvailableExams } from "@/server/student-exam-actions"
import { StudentHeroFX } from "@/components/student-hero-fx"
import { StudentVideoSections } from "@/components/student-video-sections"
import { RecentlyWatchedCarousel } from "@/components/recently-watched-carousel"
import { StudentLiveCallBanner } from "@/components/student-live-call-banner"
import { Button } from "@/components/ui/button"

export default async function StudentPage({ searchParams }: { searchParams?: { error?: string; category?: string } }) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)
  const err = searchParams?.error
  const category = searchParams?.category

  if (!user || user.role !== "student") {
    return (
      <main>
        <SiteHeader />
        <StudentHeroFX name="Student" ctaHref="#portal" />
        <div id="portal" className="mx-auto max-w-4xl p-6 -mt-12">
          {err === "invalid-token" && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Invalid or expired QR link</AlertTitle>
              <AlertDescription>
                Ask your teacher to generate a new QR code and try again. You can also proceed to the portal below.
              </AlertDescription>
            </Alert>
          )}
          <h1 className="text-2xl font-semibold">Student Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Please log in using your QR code or credentials.</p>
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Use QR Login</CardTitle>
                <CardDescription>Ask your teacher for your QR code. When scanned, it will log you in.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  const [teacherVideoGroups, sessions, activeNow, categories, availableExamsResult, upcomingExams, xpStatus, recentlyWatched] = await Promise.all([
    getStudentDashboardData(user.id, { category }),
    getUpcomingLiveSessions(user.id),
    getActiveLiveStreams(user.id),
    getAccessibleVideoCategories(user.id),
    getAvailableExams(),
    getUpcomingLiveExams(user.id),
    getStudentXPStatus(user.id),
    getRecentlyWatchedVideos(user.id),
  ])

  // Filter active exams only
  const activeExams = availableExamsResult.success
    ? (availableExamsResult.exams || []).filter((exam: any) => exam.status === 'active')
    : []

  return (
    <main className="min-h-screen bg-transparent">
      <SiteHeader />
      
      {/* 🔮 Premium Hero with FX */}
      <StudentHeroFX name={user.name ?? "Student"} ctaHref="#videos" />

      <div className="mx-auto max-w-6xl p-4 sm:p-8 -mt-24 space-y-12">
        
        {/* 🎬 Continue Watching (Recently Watched) */}
        {recentlyWatched && recentlyWatched.length > 0 && (
          <RecentlyWatchedCarousel videos={recentlyWatched} />
        )}

        {/* 🔴 Live Now & Banners */}
        <div className="grid gap-6">
          <StudentLiveCallBanner />
          
          {(activeNow.length > 0 || activeExams.length > 0) && (
            <section id="live-now" className="animate-in zoom-in-95 duration-500">
              <Card className="border-primary/20 bg-primary/5 backdrop-blur-md shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    Live Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Live Streams */}
                    {activeNow.map((s: any) => (
                      <div key={s.teacher_id} className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-4 hover:bg-white/10 transition-all">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">🔴 {s.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.teacher_name}</p>
                        </div>
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20">Join</Button>
                          </a>
                        )}
                      </div>
                    ))}

                    {/* Active Exams */}
                    {activeExams.map((exam: any) => (
                      <div key={exam.id} className="flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition-all">
                        <div className="flex-1">
                          <p className="font-bold text-sm mb-1">📝 {exam.title}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            <span>⏱️ {exam.duration_minutes}m</span>
                            <span>🎯 {exam.passing_score}%</span>
                          </div>
                        </div>
                        <Link href={`/student/exam/${exam.id}`}>
                          <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600">ابدأ الاختبار</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>

        {/* 📊 Progress & Stats */}
        {xpStatus && (
          <section className="animate-in fade-in slide-in-from-left-5 duration-700">
            <XPProgressCard
              xp={xpStatus.xp}
              level={xpStatus.level}
              percentage={xpStatus.percentage}
              nextLevelXP={xpStatus.nextLevelXP}
              streakCount={xpStatus.streak_count}
              rank={xpStatus.rank}
            />
          </section>
        )}

        {/* 📚 Video Library with Instant Search */}
        <section id="videos" className="space-y-6">
          <StudentVideoSections 
            teacherVideoGroups={teacherVideoGroups} 
            userId={user.id} 
            userName={user.name} 
          />
        </section>

        {/* 📅 Schedule Footer */}
        {(sessions.length > 0 || upcomingExams.length > 0) && (
          <section id="schedule" className="pt-12 border-t border-white/5 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Upcoming Schedule</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Live Sessions */}
              {sessions.map((s: any) => (
                <div key={s.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">📡 {s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.teacher_name}</p>
                  </div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400">
                    {new Date(s.start_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}

              {/* Upcoming Exams */}
              {upcomingExams.map((exam: any) => (
                <div key={exam.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">📝 {exam.title}</p>
                    <p className="text-xs text-muted-foreground">{exam.teacher_name}</p>
                  </div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                    {new Date(exam.scheduled_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}