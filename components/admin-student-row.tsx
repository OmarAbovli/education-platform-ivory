"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { adminUpdateStudentAction, type Student, type UpdateStudentState } from "@/server/admin-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"

function TeacherChips({ items }: { items: { id: string; name: string | null }[] }) {
  if (!items || items.length === 0) return <span className="text-muted-foreground">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t) => (
        <a
          key={t.id}
          href={`/teachers/${t.id}`}
          className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
          title={t.id}
        >
          {t.name ?? "Teacher"}
        </a>
      ))}
    </div>
  )
}

export default function AdminStudentRow({ student }: { student: Student }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [state, formAction, pending] = useActionState<UpdateStudentState, FormData>(adminUpdateStudentAction, undefined)

  return (
    <tr className="border-t">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage
              src={student.avatar_url || "/placeholder.svg?height=64&width=64&query=student-avatar"}
              alt={`${student.name ?? "Student"} avatar`}
            />
            <AvatarFallback>{(student.name ?? "S").slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{student.name ?? "Student"}</span>
        </div>
      </td>
      <td className="py-2 pr-3">{student.username ?? "-"}</td>
      <td className="py-2 pr-3">{student.email ?? "-"}</td>
      <td className="py-2 pr-3">{student.phone ?? "-"}</td>
      <td className="py-2 pr-3">
        {student.creator_teacher_name ? (
          <a
            href={`/teachers/${student.creator_teacher_id}`}
            title={student.creator_teacher_id ?? undefined}
            className="text-emerald-700 hover:underline"
          >
            {student.creator_teacher_name}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <TeacherChips items={student.access_teachers ?? []} />
      </td>
      <td className="py-2 pr-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <form
              action={async (fd: FormData) => {
                const res = await formAction(fd)
                if (res?.ok) {
                  setOpen(false)
                  router.refresh()
                }
              }}
              className="grid gap-3"
            >
              <input type="hidden" name="id" value={student.id} />
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input name="name" defaultValue={student.name ?? ""} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Username</label>
                <Input name="username" defaultValue={student.username ?? ""} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input type="email" name="email" defaultValue={student.email ?? ""} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone</label>
                <Input name="phone" defaultValue={student.phone ?? ""} />
              </div>
              {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  )
}
