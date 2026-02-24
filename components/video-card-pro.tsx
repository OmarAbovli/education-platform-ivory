"use client"

import ThumbPlay from "@/components/thumb-play"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type VideoCardProProps = {
  id?: string
  title?: string
  description?: string
  category?: string
  is_free?: boolean
  month?: number
  thumbnail_url?: string
  url?: string
  chip?: string
  teacher_id?: string
  teacher_name?: string
  teacher_avatar_url?: string
  teacher_phone?: string
}

function sanitizePhoneForWa(phone?: string) {
  if (!phone) return null
  const trimmed = phone.trim()
  const digits = trimmed.replace(/[^\d]/g, "")
  return digits || null // wa.me expects no '+'
}
function makeWaUrl(phone?: string, videoTitle?: string, teacherName?: string) {
  const clean = sanitizePhoneForWa(phone)
  if (!clean) return null
  const msg = `Hello ${teacherName || "Teacher"}, I would like to get access to: ${videoTitle || "your video"}.`
  const text = encodeURIComponent(msg)
  return `https://wa.me/${clean}?text=${text}`
}

export default function VideoCardPro({
  id = "v_demo",
  title = "Lesson Title",
  description = "Brief lesson overview that entices learners to click.",
  category = "General",
  is_free = false,
  month,
  thumbnail_url,
  url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  chip,
  teacher_id,
  teacher_name,
  teacher_avatar_url,
  teacher_phone,
}: VideoCardProProps) {
  const paid = !is_free
  const waUrl = makeWaUrl(teacher_phone, title, teacher_name)

  return (
    <Card className="group relative overflow-hidden border-border bg-card/80 shadow-sm transition-all hover:shadow-md">
      {/* subtle wash */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(20,184,166,0.06))",
        }}
      />
      {/* glossy sweep */}
      <span className="pointer-events-none absolute inset-y-0 left-[-40%] w-1/2 -skew-x-12 bg-gradient-to-r from-white/5 via-white/20 to-white/5 opacity-0 blur-md transition group-hover:animate-[shine_1.2s_ease] dark:via-white/12" />
      <style>{`
        @keyframes shine {
          0% { transform: translateX(0) skewX(-12deg); opacity: 0; }
          20% { opacity: .8; }
          100% { transform: translateX(260%) skewX(-12deg); opacity: 0; }
        }
      `}</style>

      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-300/50 bg-card/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
            {category}
          </span>
          {chip ? (
            <span className="rounded-full border border-emerald-300/50 bg-card/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
              {chip}
            </span>
          ) : null}
          <span className="rounded-full border border-emerald-300/50 bg-card/70 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
            {is_free ? "Free" : month ? `Month ${month}` : "Paid"}
          </span>
        </div>

        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>

        {/* Teacher attribution */}
        <div className="mb-3 flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={teacher_avatar_url || ""}
              alt={teacher_name ? `${teacher_name} avatar` : "Teacher avatar"}
            />
            <AvatarFallback>{teacher_name?.slice(0, 2).toUpperCase() || "T"}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{teacher_name || "Teacher"}</span>
        </div>

        {/* Free videos play inline; paid videos show WhatsApp contact */}
        {paid ? (
          <div className="relative">
            <div className="aspect-video w-full overflow-hidden rounded-md">
              <img
                src={thumbnail_url || "/course-thumbnail.png"}
                alt={`${title} thumbnail`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>{"Paid — contact the teacher to unlock"}</span>
              </div>
              {waUrl ? (
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    Contact
                  </Button>
                </a>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Contact
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ThumbPlay title={title} source={url} thumbnailUrl={thumbnail_url || "/course-thumbnail.png"} antiDownload />
        )}
      </CardContent>
    </Card>
  )
}
