import { cookies } from "next/headers"
import SiteHeader from "@/components/site-header"

export const dynamic = "force-dynamic"
import { TeacherVideoForm } from "@/components/teacher-video-form"
import { CreateStudentForm } from "@/components/create-student-form"
import TeacherStudentsManager from "@/components/teacher-students-manager"
import { GenerateStudentQr } from "@/components/generate-student-qr"
import { TeacherSettingsForm } from "@/components/teacher-settings-form"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/server/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { QrCode } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import TeacherVideosManager from "@/components/teacher-videos-manager"
import { TeacherGoLive } from "@/components/teacher-go-live"
import { TeacherLiveScheduler } from "@/components/teacher-live-scheduler"
import { getScheduledLiveSessions } from "@/server/live-actions"
import { getTeacherPackages } from "@/server/package-actions"
import TeacherPhotoUpload from "@/components/teacher-photo-upload"
import { ManageStudentAccess } from "@/components/manage-student-access"
import { getTeacherPhotos } from "@/server/photo-queries"
import Image from "next/image"

export default async function TeacherPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)

  if (!me || me.role !== "teacher") {
    return (
      <main>
        <SiteHeader />
        <div className="mx-auto max-w-4xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Area</CardTitle>
              <CardDescription>Please log in with a teacher account to access this page.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    )
  }

  // Data fetching
  const packages = await getTeacherPackages()
  const photos = await getTeacherPhotos(me.id)
  const scheduledSessions = await getScheduledLiveSessions()

  // Dashboard stats
  const [{ count: videosCount }] = (await sql`
    SELECT COUNT(*)::int AS count FROM videos WHERE teacher_id = ${me.id};
  `) as any[]
  const [{ count: studentsCount }] = (await sql`
    SELECT COUNT(DISTINCT student_id)::int AS count FROM teacher_subscriptions
    WHERE teacher_id = ${me.id} AND status = 'active';
  `) as any[]
  const nextLive = (await sql`
    SELECT title, start_at
    FROM live_sessions
    WHERE teacher_id = ${me.id} AND start_at > NOW()
    ORDER BY start_at ASC
    LIMIT 1;
  `) as any[]

  // Initial settings
  let initial = {
    name: "",
    phone: "",
    bio: "",
    subject: "",
    avatar_url: "",
    theme_primary: "#10b981",
    theme_secondary: "#14b8a6",
  }
  const rows = (await sql`
    SELECT name, phone, bio, subject, avatar_url, theme_primary, theme_secondary
    FROM users WHERE id = ${me.id} LIMIT 1;
  `) as any[]
  if (rows[0]) {
    initial = {
      name: rows[0].name ?? "",
      phone: rows[0].phone ?? "",
      bio: rows[0].bio ?? "",
      subject: rows[0].subject ?? "",
      avatar_url: rows[0].avatar_url ?? "",
      theme_primary: rows[0].theme_primary ?? "#10b981",
      theme_secondary: rows[0].theme_secondary ?? "#14b8a6",
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Header (Internal to content) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Studio</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="text-emerald-600 font-semibold">{initial.name || "Teacher"}</span>. Manage your classroom and content.
          </p>
        </div>
      </div>
      {/* Dashboard */}
      <section className="grid gap-4" aria-labelledby="dashboard">
        <h2 id="dashboard" className="text-xl font-semibold">
          Dashboard
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your Students</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{studentsCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your Videos</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{videosCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Next Live (Scheduled)</CardTitle>
            </CardHeader>
            <CardContent>
              {nextLive[0] ? (
                <div>
                  <p className="font-medium">{nextLive[0].title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(nextLive[0].start_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming sessions</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Go Live Now */}
      <section id="live" className="grid gap-2" aria-labelledby="live-title">
        <h2 id="live-title" className="text-xl font-semibold">
          Go Live Now
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste any live link (Zoom, YouTube, etc.) and activate. Students will see a “Live Now” banner with your
          join link.
        </p>
        <Card className="mt-2">
          <CardContent className="pt-6">
            <TeacherGoLive packages={packages} />
          </CardContent>
        </Card>
      </section>

      <Separator className="my-6" />

      {/* Schedule Live Session */}
      <section id="schedule-live" className="grid gap-2" aria-labelledby="schedule-live-title">
        <h2 id="schedule-live-title" className="text-xl font-semibold">
          Scheduled Live Sessions
        </h2>
        <p className="text-sm text-muted-foreground">
          Schedule a future live session. Students will be notified and will see it in their dashboard.
        </p>
        <div className="mt-2">
          <TeacherLiveScheduler initialSessions={scheduledSessions} packages={packages} />
        </div>
      </section>

      <Separator className="my-6" />

      {/* Upload */}
      <section id="upload" className="grid gap-2" aria-labelledby="upload-title">
        <h2 id="upload-title" className="text-xl font-semibold">
          Upload Video
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a title, category, grades, and package. Free videos appear on the homepage automatically.
        </p>
        <Card className="mt-2">
          <CardContent className="pt-6">
            <TeacherVideoForm packages={packages} />
          </CardContent>
        </Card>
      </section>

      <Separator className="my-6" />

      {/* My Videos */}
      <section id="my-videos" className="grid gap-2" aria-labelledby="my-videos-title">
        <h2 id="my-videos-title" className="text-xl font-semibold">
          Your Videos
        </h2>
        <p className="text-sm text-muted-foreground">
          The videos you have uploaded. Click Edit to update the title, description, or link.
        </p>
        <div className="mt-2">
          <TeacherVideosManager />
        </div>
      </section>

      <Separator className="my-6" />

      {/* Photos */}
      <section id="photos" className="grid gap-2" aria-labelledby="photos-title">
        <h2 id="photos-title" className="text-xl font-semibold">
          Photos
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload images that will appear on your profile and in the Photos page. Include an optional caption.
        </p>
        <Card className="mt-2">
          <CardContent className="pt-6">
            <TeacherPhotoUpload />
          </CardContent>
        </Card>

        <div className="mt-4">
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven’t uploaded any photos yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
                >
                  <div className="aspect-square relative bg-muted">
                    <Image
                      src={p.url || "/placeholder.svg"}
                      alt={p.caption || "Teacher photo"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-3">
                    {p.caption ? (
                      <p className="text-sm">{p.caption}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No caption</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Separator className="my-6" />

      {/* Students */}
      <section id="students" className="grid gap-2" aria-labelledby="students-title">
        <h2 id="students-title" className="text-xl font-semibold">
          Create Student
        </h2>
        <p className="text-sm text-muted-foreground">
          Register a student with grade and phone numbers. You’ll get a username and password to share.
        </p>
        <Card className="mt-2">
          <CardContent className="pt-6">
            <CreateStudentForm packages={packages} />
          </CardContent>
        </Card>

        <div className="mt-6">
          <TeacherStudentsManager packages={packages} />
        </div>
      </section>

      <Separator className="my-6" />


      {/* QR */}
      <section id="qr" className="grid gap-2" aria-labelledby="qr-title">
        <div className="flex items-center justify-between gap-2">
          <h2 id="qr-title" className="text-xl font-semibold">
            QR Login
          </h2>
          <Button asChild variant="outline" size="sm" className="hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-500/20">
            <Link href="/teacher/qr-login" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Manage QR Codes
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate a one-time QR for a student to scan and be logged into their account immediately.
        </p>
        <Card className="mt-2">
          <CardContent className="pt-6">
            <GenerateStudentQr />
          </CardContent>
        </Card>
      </section>

      <Separator className="my-6" />

      {/* Settings */}
      <section id="settings" className="grid gap-2" aria-labelledby="settings-title">
        <h2 id="settings-title" className="text-xl font-semibold">
          Profile Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your name, subject, phone number, photo, description, and color theme.
        </p>
        <Card className="mt-2">
          <CardContent className="pt-6">
            <TeacherSettingsForm initial={initial} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
