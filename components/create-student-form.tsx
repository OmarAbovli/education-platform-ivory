"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createStudent } from "@/server/teacher-actions"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import type { StudentClassification } from "@/server/teacher-actions"
import type { VideoPackage } from "@/server/package-actions"

export function CreateStudentForm({ packages }: { packages: VideoPackage[] }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [guardianPhone, setGuardianPhone] = useState("")
  const [grade, setGrade] = useState<number | null>(null)
  const [classification, setClassification] = useState<StudentClassification>("center")
  const [packageIds, setPackageIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0)

  function togglePackage(id: string) {
    setPackageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!grade) return

        // منع الإرسال المتكرر: يجب الانتظار ثانيتين بين كل طلب
        const now = Date.now()
        if (now - lastSubmitTime < 2000) {
          toast({
            title: "Please wait",
            description: "Wait 2 seconds before creating another student",
            variant: "destructive"
          })
          return
        }

        setLastSubmitTime(now)
        startTransition(async () => {
          const res = await createStudent({ name, phone, guardianPhone, grade, classification, packageIds })
          if (res?.ok) {
            toast({ title: "Student created", description: `Student ID: ${res.studentId}` })
            setStudentId(res.studentId)
            setCreds({ username: res.username, password: res.password })
            setName("")
            setPhone("")
            setGuardianPhone("")
            setGrade(null)
            setClassification("center")
            setPackageIds([])
          } else {
            toast({ title: "Error", description: res?.error ?? "Failed to create student", variant: "destructive" })
          }
        })
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="s-name">Full name</Label>
        <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="s-phone">Phone</Label>
          <Input
            id="s-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 222 3333"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-gphone">Guardian phone</Label>
          <Input
            id="s-gphone"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
            placeholder="+1 555 111 2222"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Grade</Label>
          <Select value={grade?.toString() ?? ""} onValueChange={(v) => setGrade(Number.parseInt(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">First year</SelectItem>
              <SelectItem value="2">Second year</SelectItem>
              <SelectItem value="3">Third year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Classification</Label>
          <Select value={classification} onValueChange={(v) => setClassification(v as StudentClassification)}>
            <SelectTrigger>
              <SelectValue placeholder="Select classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assign Packages</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {packages.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={packageIds.includes(p.id)}
                onCheckedChange={() => togglePackage(p.id)}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          These packages control paid video access for this student. Classification helps with bulk updates later.
        </p>
      </div>

      <Button disabled={isPending || !grade} type="submit">
        {isPending ? "Creating..." : "Create Student"}
      </Button>

      {creds && studentId && (
        <Card className="mt-4">
          <CardContent className="pt-4">
            <p className="text-sm font-medium">Generated Credentials</p>
            <p className="text-xs text-muted-foreground mt-1">Share these with the student securely.</p>
            <div className="mt-2 grid gap-1 text-sm">
              <div>
                <span className="font-medium">Student ID: </span>
                <code className="rounded bg-muted px-1 py-0.5">{studentId}</code>
              </div>
              <div>
                <span className="font-medium">Username: </span>
                <code className="rounded bg-muted px-1 py-0.5">{creds.username}</code>
              </div>
              <div>
                <span className="font-medium">Password: </span>
                <code className="rounded bg-muted px-1 py-0.5">{creds.password}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
