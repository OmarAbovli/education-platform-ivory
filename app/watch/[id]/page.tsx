import type { Metadata } from "next";
import Link from "next/link"
import SiteHeader from "@/components/site-header"
import ProfessionalVideoPlayer from "@/components/professional-video-player"
import {
  getVideoById,
  getResourcesForVideo,
  getQuizzesForVideo,
} from "@/server/video-access"

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: videoId } = await params;
  const video = await getVideoById(videoId);

  if (!video) {
    return {
      title: "الفيديو غير موجود | YourPlatform",
      description: "الفيديو الذي تبحث عنه غير موجود في YourPlatform.",
    };
  }

  const videoTitle = video.title || "درس فيديو";
  const teacherName = video.teacher_name || "Your Name";
  const videoCategory = video.category || "اللغة الإنجليزية";

  const title = `${videoTitle} | ${teacherName} | ${videoCategory} للثانوية العامة | YourPlatform`;
  const description = video.description || `شاهد ${videoTitle} وتعلم ${videoCategory} مع ${teacherName} لطلاب الثانوية العامة على YourPlatform التعليمية.`;

  return {
    title,
    description,
    keywords: [`${videoTitle}`, `${videoCategory}`, `${teacherName}`, "درس فيديو إنجليزي", "فيديو تعليمي", "منصة الهلال", "ثانوية عامة", "طنطا"],
    openGraph: {
      title,
      description,
      url: new URL(`/watch/${videoId}`, process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app/"),
      images: [
        {
          url: new URL(video.thumbnail_url || "/video-thumbnail.png", process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app/"),
          width: 1280,
          height: 720,
          alt: `صورة مصغرة لـ ${videoTitle}`,
        },
      ],
      type: "video.other",
    },
    twitter: {
      card: "player",
      title,
      description,
      images: [new URL(video.thumbnail_url || "/video-thumbnail.png", process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app/")],
    },
  };
}


import { checkVideoAccess } from "@/server/student-queries"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getCurrentUser } from "@/lib/auth"
import { FileText, PencilRuler } from "lucide-react"
import { cookies } from "next/headers"

type PageProps = { params: { id: string } }

function makeWaUrl(videoTitle?: string | null, teacherName?: string | null) {
  // استخدام رقم WhatsApp الثابت للتواصل
  const whatsappPhone = '201503860035'
  const msg = `Hello ${teacherName || "Teacher"}, I would like to get access to: ${videoTitle || "your video"}.`
  const text = encodeURIComponent(msg)
  return `https://wa.me/${whatsappPhone}?text=${text}`
}

export default async function WatchPage({ params }: PageProps) {
  const { id: videoId } = await params
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)

  const video = await getVideoById(videoId, user?.id)

  if (!video) {
    return (
      <main>
        <SiteHeader />
        <div className="mx-auto max-w-4xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Video not found</CardTitle>
              <CardDescription>The requested video does not exist.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/" className="underline">
                Go back home
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // Fetch access, resources, and quizzes in parallel
  const [access, resources, quizzes] = await Promise.all([
    user ? checkVideoAccess(videoId, user.id) : Promise.resolve({ allowed: false, reason: 'login-required' as const }),
    getResourcesForVideo(videoId),
    getQuizzesForVideo(videoId),
  ])

  const waUrl = makeWaUrl(video.title, video.teacher_name)

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          "name": video.title,
          "description": video.description,
          "uploadDate": video.created_at ? new Date(video.created_at).toISOString() : new Date().toISOString(),
          "thumbnailUrl": `${process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app/"}${video.thumbnail_url || "/video-thumbnail.png"}`,
          "contentUrl": `${process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app/"}/watch/${video.id}`,
          "embedUrl": `${process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app/"}/embed/video/${video.id}`,
          "publisher": {
            "@type": "Organization",
            "name": "YourPlatform",
            "logo": {
              "@type": "ImageObject",
              "url": `${process.env.NEXT_PUBLIC_BASE_URL || "https://el-helal-rpe3.vercel.app/"}/placeholder-logo.svg`,
              "width": 600,
              "height": 60
            }
          },
          "duration": "PT0H15M00S", // Placeholder, ideally fetch from video metadata
          "regionsAllowed": "EG", // Explicitly setting Egypt
          "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/WatchAction",
            "userInteractionCount": 0 // Placeholder, could be from video views table
          },
          "author": {
            "@type": "Person",
            "name": video.teacher_name || "Your Name"
          }
        })
      }} />
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {video.category ? <Badge variant="outline">{video.category}</Badge> : null}
          {typeof video.is_free === "boolean" ? (
            <Badge variant={video.is_free ? "default" : "secondary"}>
              {video.is_free ? "Free" : "Paid"}
            </Badge>
          ) : null}
          {typeof video.month === "number" ? <Badge variant="secondary">{`Month ${video.month}`}</Badge> : null}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="text-xl">{video.title ?? "Lesson"}</CardTitle>
            {video.description ? (
              <CardDescription className="whitespace-pre-line">{video.description}</CardDescription>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={video.thumbnail_url ? "" : ""} alt="" />
                <AvatarFallback>{video.teacher_name?.slice(0, 2).toUpperCase() || "T"}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">Uploaded by {video.teacher_name ?? "the teacher"}</span>
            </div>
          </CardHeader>
          <CardContent>
            {access.allowed ? (
              <ProfessionalVideoPlayer
                videoId={video.id}
                videoUrl={video.url ?? ""}
                videoTitle={video.title ?? "Video"}
                videoDescription={video.description}
                watermarkText={user?.name ? `${user.name} • ${user.id}` : ""}
                teacherPhone={video.teacher_phone}
                teacherName={video.teacher_name}
              />
            ) : (
              <AccessMessage
                reason={access.reason!}
                teacherName={video.teacher_name ?? "the teacher"}
                waUrl={waUrl}
              />
            )}
          </CardContent>
        </Card>

        {/* Resources Section */}
        {access.allowed && resources.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resources
            </h2>
            <div className="grid gap-3">
              {resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md border bg-card p-3 transition hover:shadow-md"
                >
                  <p className="font-medium">{resource.title}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Quizzes Section */}
        {access.allowed && quizzes.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
              <PencilRuler className="h-5 w-5" />
              Quizzes
            </h2>
            <div className="grid gap-3">
              {quizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/quiz/${quiz.id}`}
                  className="block rounded-md border bg-card p-3 transition hover:shadow-md"
                >
                  <p className="font-medium">{quiz.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function AccessMessage({
  reason,
  teacherName,
  waUrl,
}: {
  reason: "login-required" | "subscribe-required" | "subscription-required" | "month-locked" | "package-locked" | "grade-locked" | "not-found"
  teacherName: string
  waUrl: string
}) {
  const contactButton = (
    <a href={waUrl} target="_blank" rel="noopener noreferrer">
      <Button>Contact on WhatsApp</Button>
    </a>
  )

  if (reason === "login-required") {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border p-3 text-sm">
          This video is paid content. Please log in with your student account that’s linked to {teacherName}, or contact
          the teacher to get access.
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/login">
            <Button variant="outline">Log in</Button>
          </Link>
          {contactButton}
        </div>
      </div>
    )
  }
  if (reason === "subscribe-required" || reason === "subscription-required") {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border p-3 text-sm">
          You don't have an active subscription to {teacherName}. Please contact the teacher to be added.
        </div>
        <div className="flex flex-wrap gap-2">{contactButton}</div>
      </div>
    )
  }
  if (reason === "grade-locked") {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border p-3 text-sm">
          This video is not available for your grade level. Please contact {teacherName} if you think this is a mistake.
        </div>
        <div className="flex flex-wrap gap-2">{contactButton}</div>
      </div>
    )
  }
  if (reason === "package-locked") {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border p-3 text-sm">
          You don't have access to this package. Please contact {teacherName} to purchase this package.
        </div>
        <div className="flex flex-wrap gap-2">{contactButton}</div>
      </div>
    )
  }
  // month-locked or other
  return (
    <div className="grid gap-3">
      <div className="rounded-md border p-3 text-sm">
        Your account doesn't have access to this content. Ask {teacherName} for access.
      </div>
      <div className="flex flex-wrap gap-2">{contactButton}</div>
    </div>
  )
}