import type { Metadata } from "next";
import SiteHeader from "@/components/site-header"
import { notFound } from "next/navigation"
import { getTeacherProfile } from "@/server/public-queries"
import { getTeacherPhotos } from "@/server/photo-queries"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { TeacherProfileView } from "@/components/teacher-profile-view"

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getTeacherProfile(params.id);
  if (!data) {
    return {
      title: "المعلم غير موجود | YourPlatform",
      description: "ملف تعريف المعلم الذي تبحث عنه غير موجود في YourPlatform.",
    };
  }
  const { teacher } = data;

  const teacherName = teacher.name || "معلم";
  const teacherSubject = teacher.subject || "اللغة الإنجليزية";
  const title = `${teacherName} | ${teacherSubject} للثانوية العامة | YourPlatform`;
  const description = `تعرف على الأستاذ ${teacherName}، خبير ${teacherSubject} لطلاب الثانوية العامة. اكتشف دوراته وشروحاته المميزة على YourPlatform التعليمية.`;

  return {
    title,
    description,
    keywords: [`${teacherName}`, `${teacherSubject}`, "معلم إنجليزي", "ثانوية عامة", "طنطا", "منصة الهلال", "دروس إنجليزية"],
    openGraph: {
      title,
      description,
      url: new URL(`/about-us/${params.id}`, process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"),
      images: [
        {
          url: new URL(teacher.avatar_url || "/placeholder-user.jpg", process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"),
          width: 200,
          height: 200,
          alt: `صورة ملف تعريف ${teacherName}`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [new URL(teacher.avatar_url || "/placeholder-user.jpg", process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/")],
    },
  };
}

export default async function TeacherProfilePage({ params }: { params: { id: string } }) {
  const data = await getTeacherProfile(params.id)
  if (!data) return notFound()
  const { teacher } = data

  const photos = await getTeacherPhotos(params.id)
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          "name": teacher.name,
          "url": `${process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"}/about-us/${teacher.id}`,
          "image": `${process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"}${teacher.avatar_url || "/placeholder-user.jpg"}`,
          "description": teacher.bio || `معلم اللغة الإنجليزية لطلاب الثانوية العامة.`,
          "alumniOf": "YourPlatform",
          "hasOccupation": {
            "@type": "Occupation",
            "name": teacher.subject || "معلم لغة إنجليزية",
            "description": `متخصص في تدريس اللغة الإنجليزية لطلاب الصف الأول والثاني والثالث الثانوي.`
          },
          "worksFor": {
            "@type": "EducationalOrganization",
            "name": "YourPlatform"
          }
        })
      }} />
      <TeacherProfileView
        teacher={teacher}
        packages={data.packages}
        photos={photos}
        me={me}
      />
    </>
  )
}
