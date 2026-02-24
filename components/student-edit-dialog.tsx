"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { updateStudentAll, updateStudentPackages } from "@/server/teacher-actions"
import type { VideoPackage } from "@/server/package-actions"

export default function StudentEditDialog({
  student,
  packages,
}: {
  student: {
    id: string
    name: string | null
    username: string | null
    grade: number | null
    phone: string | null
    guardian_phone: string | null
    classification: "center" | "online"
    package_ids: string[]
  }
  packages: VideoPackage[]
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(student.name ?? "")
  const [username, setUsername] = useState(student.username ?? "")
  const [phone, setPhone] = useState(student.phone ?? "")
  const [guardianPhone, setGuardianPhone] = useState(student.guardian_phone ?? "")
  const [grade, setGrade] = useState<number | "">(student.grade ?? "")
  const [classification, setClassification] = useState<"center" | "online">(student.classification ?? "center")
  const [newPassword, setNewPassword] = useState("")
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(student.package_ids ?? [])

  function togglePackage(id: string) {
    setSelectedPackageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function save() {
    startTransition(async () => {
      const res = await updateStudentAll({
        studentId: student.id,
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        phone: phone.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        grade: typeof grade === "number" ? grade : undefined,
        classification,
        newPassword: newPassword.trim() || undefined,
      })
      if (!res.ok) {
        toast({ title: "Error", description: res.error ?? "Failed to update student.", variant: "destructive" })
        return
      }

      const ok = await updateStudentPackages(student.id, selectedPackageIds)
      if (!ok) {
        toast({ title: "Error", description: "Failed to update packages.", variant: "destructive" })
        return
      }

      toast({ title: "Saved", description: "Student updated successfully." })
      setNewPassword("")
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor={`name-${student.id}`}>Name</Label>
              <Input id={`name-${student.id}`} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`username-${student.id}`}>Username</Label>
              <Input id={`username-${student.id}`} value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`phone-${student.id}`}>Phone</Label>
              <Input id={`phone-${student.id}`} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`gphone-${student.id}`}>Guardian Phone</Label>
              <Input
                id={`gphone-${student.id}`}
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label>Grade</Label>
              <Select value={grade === "" ? "" : String(grade)} onValueChange={(v) => setGrade(v ? Number(v) : "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">First</SelectItem>
                  <SelectItem value="2">Second</SelectItem>
                  <SelectItem value="3">Third</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Classification</Label>
              <Select value={classification} onValueChange={(v) => setClassification(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor={`pwd-${student.id}`}>New Password (optional)</Label>
              <Input
                id={`pwd-${student.id}`}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Access Packages</div>
            <div className="grid grid-cols-2 gap-3 rounded-md border p-3 bg-muted/30">
              {packages.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                  <Checkbox
                    id={`pkg-${student.id}-${p.id}`}
                    checked={selectedPackageIds.includes(p.id)}
                    onCheckedChange={() => togglePackage(p.id)}
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
