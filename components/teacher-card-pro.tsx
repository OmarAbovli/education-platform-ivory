"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap, MessageSquareMore } from "lucide-react"

export type TeacherCardProProps = {
  id?: string
  name?: string | null
  subject?: string | null
  bio?: string | null
  avatar_url?: string | null
  phone?: string | null
  theme_primary?: string | null
  theme_secondary?: string | null
}

export default function TeacherCardPro({
  id = "t_demo",
  name = "Teacher",
  subject = "Subject",
  bio = "Experienced teacher.",
  avatar_url = "",
  phone = "",
  theme_primary = "#10b981",
  theme_secondary = "#14b8a6",
}: TeacherCardProProps) {
  const wa = phone
    ? `https://wa.me/${String(phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        "Hello, I want to join El-helal. Can you create my student account?",
      )}`
    : null

  return (
    <Card className="group relative overflow-hidden border-border bg-card/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Soft gradient wash */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background: `linear-gradient(135deg, ${theme_primary ?? "#10b981"}11, ${theme_secondary ?? "#14b8a6"}11)`,
        }}
      />
      {/* Glossy animated sweep */}
      <span className="pointer-events-none absolute inset-y-0 left-[-40%] w-1/2 -skew-x-12 bg-gradient-to-r from-white/5 via-white/20 to-white/5 opacity-0 blur-md transition group-hover:animate-[shine_1.2s_ease] dark:via-white/12" />
      <style>{`
        @keyframes shine {
          0% { transform: translateX(0) skewX(-12deg); opacity: 0; }
          20% { opacity: .8; }
          100% { transform: translateX(260%) skewX(-12deg); opacity: 0; }
        }
      `}</style>

      <CardContent className="grid gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-lg ring-2 ring-emerald-200/60 dark:ring-emerald-800/50">
            <img
              src={avatar_url || "/placeholder.svg?height=112&width=112&query=teacher%20portrait"}
              alt={`Photo of ${name}`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="truncate text-base font-semibold">{name}</h3>
            </div>
            <p className="truncate text-xs text-emerald-700/80 dark:text-emerald-300/80">{subject ?? "General"}</p>
          </div>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">{bio ?? ""}</p>

        <div className="flex gap-2">
          <Link href={`/teachers/${id}`} className="w-full">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">View Profile</Button>
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button
                variant="outline"
                className="w-full gap-1 border-emerald-300 bg-transparent text-emerald-700 dark:text-emerald-300 dark:border-emerald-700"
              >
                <MessageSquareMore className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
