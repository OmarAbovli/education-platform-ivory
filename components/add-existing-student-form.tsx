"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { addExistingStudentToTeacher } from "@/server/teacher-actions"
import type { VideoPackage } from "@/server/package-actions"

export default function AddExistingStudentForm({ packages }: { packages: VideoPackage[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [studentId, setStudentId] = useState("")
  const [classification, setClassification] = useState<"center" | "online">("center")
  const [packageIds, setPackageIds] = useState<string[]>([])

  function togglePackage(id: string) {
    setPackageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Existing Student</CardTitle>
        <CardDescription>
          Link an existing student to your classroom using their Student ID. You can also set their type and package
          access.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="student-id">Student ID</Label>
            <Input
              id="student-id"
              placeholder="e.g. s_abc123"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Student Type</Label>
            <Select value={classification} onValueChange={(v) => setClassification(v as "center" | "online")}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Packages</Label>
            <div className="flex flex-wrap gap-2">
              {packages.map((p) => (
                <label key={p.id} className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={packageIds.includes(p.id)}
                    onCheckedChange={() => togglePackage(p.id)}
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Button
            disabled={isPending || !studentId}
            onClick={() =>
              startTransition(async () => {
                const res = await addExistingStudentToTeacher({
                  studentId: studentId.trim(),
                  classification,
                  packageIds,
                })
                if (!res.ok) {
                  toast({
                    title: "Could not add student",
                    description: res.error ?? "Please verify the Student ID and try again.",
                    variant: "destructive",
                  })
                  return
                }
                toast({ title: "Student added", description: "The student was linked and permissions updated." })
                setStudentId("")
                setPackageIds([])
                setClassification("center")
                router.refresh()
              })
            }
          >
            {isPending ? "Adding..." : "Add Student"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
