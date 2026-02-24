"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { getMyStudents } from "@/server/teacher-actions"
import { sendMessage } from "@/server/messaging-actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

type Student = {
  id: string
  name: string | null
  username: string | null
  grade: number | null
  classification: string | null
}

export default function TeacherCompose({ onMessageSent }: { onMessageSent?: (conversationId?: string | null) => void }) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  useEffect(() => {
    getMyStudents().then((data) => {
      setStudents(data || [])
      if (data?.length === 1) setSelectedIds(new Set([data[0].id]))
    })
  }, [])

  const handleSend = async () => {
    if (selectedIds.size === 0 || !body.trim()) return
    startTransition(async () => {
      try {
        const targetIds = Array.from(selectedIds)
        const res = await sendMessage({ studentIds: targetIds, body })
        if (res?.success) {
          toast({ title: `Message sent to ${targetIds.length} student${targetIds.length > 1 ? 's' : ''}` })
          setBody("")
          if (onMessageSent) onMessageSent(res.conversationId ?? (res.conversationIds && res.conversationIds[0]) ?? null)
        } else {
          toast({ title: "Failed", description: (res as any)?.error ?? "Could not send message", variant: "destructive" })
        }
      } catch (e) {
        console.error(e)
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" })
      }
    })
  }

  // Group students by classification then grade
  const grouped: Record<string, Record<string, Student[]>> = {}
  for (const s of students) {
    const cls = s.classification ?? "center"
    const grade = String(s.grade ?? "-")
    grouped[cls] = grouped[cls] || {}
    grouped[cls][grade] = grouped[cls][grade] || []
    grouped[cls][grade].push(s)
  }

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGrade = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((i) => next.has(i))
      if (allSelected) {
        ids.forEach((i) => next.delete(i))
      } else {
        ids.forEach((i) => next.add(i))
      }
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(students.map((s) => s.id)))
  const clearSelection = () => setSelectedIds(new Set())

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Compose</Button>
      </DialogTrigger>
  <DialogContent className="bg-card/95 dark:bg-card/90 text-foreground backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>New message to student</DialogTitle>
        </DialogHeader>

          <div className="space-y-3">
          <div>
            <label className="text-sm text-foreground/90">Select students (click to toggle, or select entire grade)</label>
            <div className="mt-2 flex items-center gap-2">
              <button className="text-sm underline" onClick={selectAll}>Select all</button>
              <button className="text-sm underline" onClick={clearSelection}>Clear</button>
            </div>
            <div className="mt-2 max-h-48 overflow-auto border rounded-md p-2">
              {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground">No students found.</p>}
              {Object.entries(grouped).map(([cls, grades]) => (
                <div key={cls} className="mb-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{cls}</p>
                  {Object.entries(grades).map(([grade, items]) => (
                    <div key={grade} className="pl-2 mb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Grade: {grade}</p>
                        <button className="text-xs underline" onClick={() => toggleGrade(items.map((i) => i.id))}>Toggle Grade</button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {items.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => toggleStudent(s.id)}
                            className={`px-2 py-1 rounded text-sm border ${selectedIds.has(s.id) ? 'bg-sky-100 border-sky-300' : 'bg-white'}`}
                          >
                            {s.name ?? s.username ?? s.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-foreground/90">Message</label>
            <Textarea value={body} onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)} rows={6} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSend} disabled={isPending || selectedIds.size === 0 || !body.trim()}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
