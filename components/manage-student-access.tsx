"use client"

import { useState, useTransition, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { getStudentMonths, updateStudentMonths } from "@/server/teacher-actions"
import { useToast } from "@/hooks/use-toast"

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

export function ManageStudentAccess() {
  const [studentId, setStudentId] = useState("")
  const [allowedMonths, setAllowedMonths] = useState<number[]>([])
  const [loading, startTransition] = useTransition()
  const { toast } = useToast()

  function toggle(m: number) {
    setAllowedMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function load() {
    if (!studentId) return
    startTransition(async () => {
      const data = await getStudentMonths(studentId)
      setAllowedMonths(data ?? [])
    })
  }

  async function save() {
    if (!studentId) return
    startTransition(async () => {
      const ok = await updateStudentMonths(studentId, allowedMonths)
      toast({
        title: ok ? "Saved" : "Error",
        description: ok ? "Student access updated" : "Could not update access",
        variant: ok ? "default" : "destructive",
      })
    })
  }

  useEffect(() => {
    // no-op
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-sm">
        <Label htmlFor="student-id">Student ID</Label>
        <Input id="student-id" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="st_..." />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {months.map((m) => (
          <label key={m.value} className="flex items-center gap-2 text-sm">
            <Checkbox checked={allowedMonths.includes(m.value)} onCheckedChange={() => toggle(m.value)} />
            <span>{m.label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={load} disabled={loading || !studentId}>
          {loading ? "Loading..." : "Load"}
        </Button>
        <Button onClick={save} disabled={loading || !studentId} variant="outline">
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Teachers can unlock additional months later for the student’s account.
      </p>
    </div>
  )
}
