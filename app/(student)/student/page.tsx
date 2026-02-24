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
} from "@/server/student-queries"
import { getStudentXPStatus } from "@/server/xp-actions"
import { XPProgressCard } from "@/components/xp-progress-card"
import { getAvailableExams } from "@/server/student-exam-actions"
import { VideoPlayer } from "@/components/video-player"
import { StudentHeroFX } from "@/components/student-hero-fx"
import { Button } from "@/components/ui/button"
import { VideoCategoryFilter } from "@/components/video-category-filter"
import { PurchasePackageButton } from "@/components/purchase-package-button"
import RedeemCodeDialog from "@/components/redeem-code-dialog"
import { ExamCountdown } from "@/components/exam-countdown"
import { StudentLiveCallBanner } from "@/components/student-live-call-banner"

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

  const [teacherVideoGroups, sessions, activeNow, categories, availableExamsResult, upcomingExams, xpStatus] = await Promise.all([
    getStudentDashboardData(user.id, { category }),
    getUpcomingLiveSessions(user.id),
    getActiveLiveStreams(user.id),
    getAccessibleVideoCategories(user.id),
    getAvailableExams(),
    getUpcomingLiveExams(user.id),
    getStudentXPStatus(user.id),
  ])

  // Filter active exams only
  const activeExams = availableExamsResult.success
    ? (availableExamsResult.exams || []).filter((exam: any) => exam.status === 'active')
    : []

  return (
    <main>
      <SiteHeader />
      <StudentHeroFX name={user.name ?? "Student"} ctaHref="#videos" />

      <div className="mx-auto max-w-6xl p-4 -mt-20">
        {/* Voice Call Banner - Always Show */}
        <section className="mb-6">
          <StudentLiveCallBanner />
        </section>

        {xpStatus && (
          <section className="mb-8">
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

        {/* Live Now - Streams & Active Exams */}
        {(activeNow.length > 0 || activeExams.length > 0) && (
          <section id="live-now" className="mb-8 grid gap-4">
            <Card className="border-primary/20 bg-primary/10">
              <CardHeader>
                <CardTitle>Live Now</CardTitle>
                <CardDescription>
                  {activeNow.length > 0 && activeExams.length > 0
                    ? "Your teacher is live and there are active exams. Join the stream or start your exam."
                    : activeNow.length > 0
                      ? `Your teacher${activeNow.length > 1 ? "s are" : " is"} live right now. Join the stream.`
                      : "There are active exams available now. Start your exam."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Live Streams */}
                  {activeNow.map((s) => (
                    <div
                      key={s.teacher_id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">🔴 {s.title}</p>
                        <p className="truncate text-xs text-muted-foreground">Teacher: {s.teacher_name}</p>
                      </div>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm">Join</Button>
                        </a>
                      ) : null}
                    </div>
                  ))}

                  {/* Active Exams */}
                  {activeExams.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">📝 {exam.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">{exam.description || 'اختبار مباشر'}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>⏱️ {exam.duration_minutes}د</span>
                          <span>🎯 {exam.passing_score}%</span>
                        </div>
                      </div>
                      <Link href={`/student/exam/${exam.id}`}>
                        <Button size="sm" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500">
                          ابدأ الاختبار
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Videos Section */}
        <div id="videos" className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Your Videos</h2>
          <VideoCategoryFilter categories={categories} />
        </div>

        {teacherVideoGroups.map((teacherGroup) => (
          <div key={teacherGroup.teacherId} className="mb-16 animate-in slide-in-from-bottom-5 duration-700">
            <h2 className="text-3xl font-bold tracking-tight mb-8 flex items-center gap-3">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 w-2 h-8 rounded-full" />
              {teacherGroup.teacherName}
            </h2>
            {teacherGroup.packages.map((pkg) => (
              <section key={pkg.id} id={`package-${pkg.id}`} className="mb-16">
                <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                  <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    {pkg.name}
                    {!pkg.isAccessible && (
                      <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                        Locked Package
                      </span>
                    )}
                  </h3>
                  {/* Package Code Button */}
                  {!pkg.isAccessible && (
                    <div className="flex items-center gap-2">
                      <PurchasePackageButton pkg={pkg} />
                      <RedeemCodeDialog triggerVariant="ghost" size="sm" />
                    </div>
                  )}
                </div>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {/* Videos */}
                  {pkg.videos.map((v: any) => {
                    const isLocked = !pkg.isAccessible && !v.is_free
                    return (
                      <ModernStudentVideoCard
                        key={v.id}
                        id={v.id}
                        title={v.title}
                        source={v.url}
                        thumbnailUrl={v.thumbnail_url || "/course-thumbnail.png"}
                        watermarkText={user.name ? `${user.name} • ${user.id}` : user.id}
                        antiDownload
                        hideRedeem={true}
                        isLocked={isLocked}
                        isCompleted={false} // Todo: connect with watch history
                      />
                    )
                  })}

                  {/* Empty State */}
                  {pkg.videos.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                      <p>No videos in this package yet.</p>
                    </div>
                  )}

                  {/* Unlock Card for Locked Packages */}
                  {!pkg.isAccessible && (
                    <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 hover:bg-indigo-500/10 transition-colors p-6 flex flex-col items-center justify-center text-center min-h-[250px] aspect-video sm:aspect-auto">
                      <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,transparent,black)]" />
                      <div className="relative z-10 space-y-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">Unlock Full Access</h4>
                          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                            Get access to all {pkg.videos.length} videos in <strong>{pkg.name}</strong>
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 w-full max-w-[180px]">
                          <PurchasePackageButton pkg={pkg} className="w-full" />
                          <RedeemCodeDialog className="w-full" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        ))}

        {teacherVideoGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {category ? `No videos found in category: "${category}"` : "No videos yet."}
          </p>
        )}

        {/* Upcoming Live Sessions & Exams */}
        {(sessions.length > 0 || upcomingExams.length > 0) && (
          <section id="live" className="mt-12 grid gap-4">
            <h2 className="text-xl font-semibold">Upcoming Live Sessions & Exams</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Live Sessions */}
              {sessions.map((s: any) => (
                <div
                  key={s.id}
                  className="flex flex-col justify-between gap-3 rounded-md border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">📡 {s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">Teacher: {s.teacher_name}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Starts: {new Date(s.start_at).toLocaleString('ar-EG', {
                      timeZone: 'Africa/Cairo',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}

              {/* Upcoming Exams */}
              {upcomingExams.map((exam: any) => (
                <div
                  key={exam.id}
                  className="flex flex-col justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">📝 {exam.title}</p>
                    <p className="truncate text-xs text-muted-foreground">Teacher: {exam.teacher_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>⏱️ {exam.duration_minutes}د</span>
                      <span>🎯 {exam.passing_score}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <ExamCountdown scheduledAt={exam.scheduled_at} />
                    <div className="text-xs text-muted-foreground">
                      {new Date(exam.scheduled_at).toLocaleString('ar-EG', {
                        timeZone: 'Africa/Cairo',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
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