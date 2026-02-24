import type React from "react"
import type { Metadata } from "next"
import SiteHeader from "@/components/site-header"

export const metadata: Metadata = {
  title: "YourPlatform | لغة إنجليزية للثانوية العامة مع أستاذك",
  description: "YourPlatform منصة تعليمية لتعلم اللغة الإنجليزية لطلاب الصف الأول والثاني والثالث الثانوي في مدينتك. اكتشف دروسًا تفاعلية، دورات فيديو شاملة، واختبارات ديناميكية. مع YourPlatform، اجعل تعلم الإنجليزية ممتعًا وفعالًا.",
  keywords: ["YourPlatform", "لغة إنجليزية", "ثانوية عامة", "أستاذك", "دروس إنجليزية", "شروحات فيديو", "اختبارات إنجليزية", "تعليم أونلاين", "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي", "تعلم الإنجليزية"],
  openGraph: {
    title: "YourPlatform | لغة إنجليزية للثانوية العامة مع أستاذك",
    description: "YourPlatform منصة تعليمية لتعلم اللغة الإنجليزية لطلاب الصف الأول والثاني والثالث الثانوي في مدينتك. اكتشف دروسًا تفاعلية، دورات فيديو شاملة، واختبارات ديناميكية. مع YourPlatform، اجعل تعلم الإنجليزية ممتعًا وفعالًا.",
    url: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"),
    images: [
      {
        url: new URL("/online-illustration-class.png", process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/"),
        width: 1200,
        height: 630,
        alt: "YourPlatform منصة تعليمية للغة الإنجليزية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YourPlatform | لغة إنجليزية للثانوية العامة مع أستاذك",
    description: "YourPlatform منصة تعليمية لتعلم اللغة الإنجليزية لطلاب الصف الأول والثاني والثالث الثانوي في مدينتك. اكتشف دروسًا تفاعلية، دورات فيديو شاملة، واختبارات ديناميكية. مع YourPlatform، اجعل تعلم الإنجليزية ممتعًا وفعالًا.",
    images: [new URL("/online-illustration-class.png", process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app/")],
  },
};


import { Hero3DBook } from "@/components/hero-3d-book"
import { Card, CardContent } from "@/components/ui/card"
import { getFeaturedTeachers, getFreeVideos } from "@/server/public-queries"
import SectionHeader from "@/components/section-header"
import { BookOpenCheck, BrainCircuit, MonitorPlay, Sparkles, Star, Trophy } from "lucide-react"
import VideoCardPro from "@/components/video-card-pro"
import TeacherInteractiveCard from "@/components/teacher-interactive-card"
import GradePackagesSection from "@/components/grade-packages-section"

export default async function HomePage() {
  const free = await getFreeVideos()

  return (
    <main className="text-foreground min-h-screen bg-[radial-gradient(ellipse_at_top,_#fef9c3_10%,_#ffffff_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "YourPlatform",
          "url": `${process.env.NEXT_PUBLIC_BASE_URL || "https://yourplatform-demo.vercel.app"}`,
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        })
      }} />
      <SiteHeader />
      <Hero3DBook primaryHref="/about-us" secondaryHref="/login" />

      {/* Pillars */}
      <section className="relative border-b border-white/5">
        {/* Removed conflicting green/grey gradients to let the main Navy Blue flow through */}
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          <InfoCard
            icon={<MonitorPlay className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
            title="Bite-sized lessons"
            desc="Concise videos with visual explanations to make concepts stick."
          />
          <InfoCard
            icon={<BrainCircuit className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
            title="Active learning"
            desc="Practice as you go with tasks, goals, and progress markers."
          />
          <InfoCard
            icon={<BookOpenCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
            title="Learn your way"
            desc="Unlock topics by month and study at the pace that fits you."
          />
        </div>
      </section>

      {/* Teachers with glossy 3D feel */}
      <section className="relative py-10">
        <TeacherInteractiveCard />
      </section>

      <GradePackagesSection />

      {/* Free videos */}
      <section className="py-10">
        <SectionHeader
          eyebrow="Start Free"
          title="Try Before You Commit"
          subtitle="Explore free lessons to get a feel for the platform."
        />
        <div className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {free.map((v) => (
            <VideoCardPro
              key={v.id}
              id={v.id}
              title={v.title}
              description={v.description}
              category={v.category}
              is_free={true}
              month={v.month}
              thumbnail_url={v.thumbnail_url}
              url={v.url}
              chip="Free"
            />
          ))}
          {free.length === 0 && <p className="text-sm text-muted-foreground">No free videos yet.</p>}
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          <StatCard
            icon={<Trophy className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
            title="60k+"
            desc="Lessons watched"
          />
          <StatCard
            icon={<Star className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
            title="4.9/5"
            desc="Average rating"
          />
          <StatCard
            icon={<BookOpenCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
            title="Engaging Content"
            desc="Fun and interactive"
          />
        </div>
      </section>
    </main>
  )
}

function InfoCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="grid gap-2 p-4">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-sm font-medium">{title}</div>
        </div>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  )
}

function StatCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md border border-border bg-card p-2">{icon}</div>
        <div>
          <div className="text-xl font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </CardContent>
    </Card>
  )
}
