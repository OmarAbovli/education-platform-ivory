"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

const gradeOptions = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
]

const classOptions = [
  { value: "center", label: "Center" },
  { value: "online", label: "Online" },
] as const

export default function StudentsFilterBar({
  initialQuery = "",
  initialGrades = [],
  initialClasses = [],
}: {
  initialQuery?: string
  initialGrades?: number[]
  initialClasses?: ("center" | "online")[]
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState(initialQuery)
  const [grades, setGrades] = useState<number[]>(initialGrades)
  const [classes, setClasses] = useState<string[]>(initialClasses)
  const [isPending, startTransition] = useTransition()

  function toggleGrade(v: number) {
    setGrades((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }
  function toggleClass(v: string) {
    setClasses((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (grades.length > 0) params.set("grades", grades.join(","))
    if (classes.length > 0) params.set("classes", classes.join(","))
    return params.toString()
  }, [q, grades, classes])

  const applyFilters = useDebouncedCallback(() => {
    startTransition(() => {
      router.replace(`/teacher/students${queryString ? `?${queryString}` : ""}`)
    })
  }, 300) // Debounce for 300ms

  useEffect(() => {
    const qParam = sp.get("q") ?? ""
    const gradesParam = (sp.get("grades") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
    const classesParam = (sp.get("classes") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    // Only update when values actually differ to avoid unnecessary renders
    const sameQ = q === qParam
    const sameGrades = grades.length === gradesParam.length && grades.every((v, i) => v === gradesParam[i])
    const sameClasses = classes.length === classesParam.length && classes.every((v, i) => v === classesParam[i])

    if (!sameQ) setQ(qParam)
    if (!sameGrades) setGrades(gradesParam)
    if (!sameClasses) setClasses(classesParam)
  }, [sp.toString()])

  // Apply filters automatically when state changes
  useEffect(() => {
    applyFilters()
  }, [q, grades, classes, applyFilters])

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by name, username, phone, ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-[280px]"
          />
          <Button
            variant="outline"
            onClick={() => {
              setQ("")
              setGrades([])
              setClasses([])
              router.replace("/teacher/students")
            }}
          >
            Reset
          </Button>
        </div>
        <div className="flex flex-wrap gap-8">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Grade</div>
            <div className="flex flex-wrap gap-3">
              {gradeOptions.map((g) => (
                <label key={g.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={grades.includes(g.value)} onCheckedChange={() => toggleGrade(g.value)} />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Classification</div>
            <div className="flex flex-wrap gap-3">
              {classOptions.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm capitalize">
                  <Checkbox checked={classes.includes(c.value)} onCheckedChange={() => toggleClass(c.value)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
