"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import TeacherCardPro from "@/components/teacher-card-pro"

function normalize(str?: string | null) {
  return (str || "").toLowerCase()
}

export default function ClientFilters({
  teachers,
  subjects,
}: {
  teachers: any[]
  subjects: string[]
}) {
  const [q, setQ] = useState("")
  const [active, setActive] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const nq = normalize(q)
    return teachers.filter((t: any) => {
      const okQ =
        !nq || normalize(t.name).includes(nq) || normalize(t.bio).includes(nq) || normalize(t.subject).includes(nq)
      const okS = !active || normalize(t.subject) === normalize(active)
      return okQ && okS
    })
  }, [q, active, teachers])

  return (
    <div className="mt-6 grid gap-6">
      <Card>
        <CardContent className="grid gap-3 p-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search teachers by name, subject, or bio..."
          />
          <div className="flex flex-wrap gap-2">
            <Badge
              role="button"
              variant={active ? "outline" : "default"}
              className={active ? "" : "bg-emerald-600"}
              onClick={() => setActive(null)}
              aria-pressed={!active}
            >
              All
            </Badge>
            {subjects.map((s) => (
              <button
                key={s}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  active === s ? "border-emerald-400 bg-emerald-100 text-emerald-800" : "border-emerald-200 bg-white"
                }`}
                onClick={() => setActive(active === s ? null : s)}
                aria-pressed={active === s}
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t: any) => (
          <TeacherCardPro key={t.id} {...t} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
      </div>
    </div>
  )
}
