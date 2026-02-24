"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  updateStudentPackages,
  updateStudentCredentials,
  updateStudentClassification,
  type StudentClassification,
} from "@/server/teacher-actions"
import type { VideoPackage } from "@/server/package-actions"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Student = {
  id: string
  name: string | null
  username: string | null
  grade: number | null
  phone: string | null
  guardian_phone: string | null
  classification: StudentClassification
  package_ids: string[]
}

export function TeacherStudentRow({
  student = {
    id: "",
    name: "",
    username: "",
    grade: 1,
    phone: "",
    guardian_phone: "",
    classification: "center",
    package_ids: [],
  },
  packages,
}: {
  student: Student
  packages: VideoPackage[]
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [username, setUsername] = useState(student.username ?? "")
  const [password, setPassword] = useState("")
  const [classification, setClassification] = useState<StudentClassification>(student.classification ?? "center")
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(student.package_ids ?? [])

  function togglePackage(id: string) {
    setSelectedPackageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <tr className="border-t align-top">
      <td className="py-2 pr-3">
        <div className="grid">
          <span className="font-medium">{student.name ?? "Unnamed"}</span>
          <span className="text-xs text-muted-foreground">{student.id}</span>
        </div>
      </td>

      <td className="py-2 pr-3">{student.grade ?? "—"}</td>

      <td className="py-2 pr-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-[160px]"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="new password (optional)"
            className="w-[180px]"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateStudentCredentials(student.id, username, password || undefined)
                toast({
                  title: res.ok ? "Saved" : "Error",
                  description: res.ok ? "Credentials updated" : (res.error ?? "Failed to update"),
                  variant: res.ok ? "default" : "destructive",
                })
                if (res.ok) setPassword("")
              })
            }
          >
            {isPending ? "Saving..." : "Save Credentials"}
          </Button>

          <Select value={classification} onValueChange={(v) => setClassification(v as StudentClassification)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateStudentClassification(student.id, classification)
                toast({
                  title: res.ok ? "Saved" : "Error",
                  description: res.ok ? "Classification updated" : (res.error ?? "Failed to update"),
                  variant: res.ok ? "default" : "destructive",
                })
              })
            }
          >
            {isPending ? "Saving..." : "Save Classification"}
          </Button>
        </div>
      </td>

      <td className="py-2 pr-3">
        <div className="flex max-w-[340px] flex-wrap gap-2">
          {packages.map((p) => (
            <label key={p.id} className="flex items-center gap-1 text-xs">
              <Checkbox
                checked={selectedPackageIds.includes(p.id)}
                onCheckedChange={() => togglePackage(p.id)}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </td>

      <td className="py-2 pr-3">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const ok = await updateStudentPackages(student.id, selectedPackageIds)
              toast({
                title: ok ? "Saved" : "Error",
                description: ok ? "Access packages updated" : "Could not update access",
                variant: ok ? "default" : "destructive",
              })
            })
          }
        >
          {isPending ? "Saving..." : "Save Access"}
        </Button>
      </td>
    </tr>
  )
}
