import VideoCardPro from "@/components/video-card-pro"
import SectionHeader from "@/components/section-header"

type Video = {
  id: string
  title: string
  description: string | null
  grades: number[]
  category: string | null
  is_free: boolean | null
  month: number | null
  thumbnail_url: string | null
  url: string
  teacher_id: string
  teacher_name: string | null
  teacher_avatar_url: string | null
  teacher_phone: string | null
}

export default function GradeVideosSection({ grade, videos }: { grade: number; videos: Video[] }) {
  const freeVideo = videos.find((v) => v.is_free)
  const paidVideos = videos.filter((v) => !v.is_free)

  let videosToShow: Video[] = []

  if (freeVideo) {
    videosToShow = [freeVideo, ...paidVideos.slice(0, 2)]
  } else {
    videosToShow = paidVideos.slice(0, 3)
  }

  return (
    <section className="py-10">
      <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-muted/40 px-4 py-8">
        <SectionHeader
          eyebrow={`Grade ${grade}`}
          title={`Latest for Grade ${grade}`}
          subtitle="Fresh explanations, memorable visuals, and structured practice."
        />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videosToShow.map((v) => (
            <VideoCardPro
              key={v.id}
              id={v.id}
              title={v.title}
              description={v.description}
              category={v.category}
              is_free={v.is_free}
              month={v.month}
              thumbnail_url={v.thumbnail_url}
              url={v.url}
              chip={v.is_free ? "Free" : "New"}
            />
          ))}
          {videosToShow.length === 0 && <p className="text-sm text-muted-foreground">No courses yet for this grade.</p>}
        </div>
      </div>
    </section>
  )
}
