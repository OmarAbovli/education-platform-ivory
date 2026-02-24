"use client"

import { useActionState, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarUpload } from "@/components/avatar-upload"
import { adminUpdateTeacher } from "@/server/admin-actions"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFeaturedTeachers } from "@/server/public-queries"

const initialState = undefined

export function EditTeacherForm() {
  const { toast } = useToast()
  const [state, formAction, pending] = useActionState(adminUpdateTeacherAction, initialState)
  const [teacher, setTeacher] = useState<any>(null)

  useEffect(() => {
    async function fetchTeacher() {
      const teachers = await getFeaturedTeachers()
      setTeacher(teachers[0])
    }
    fetchTeacher()
  }, [])

  useEffect(() => {
    if (state === true) {
      toast({
        title: "Teacher updated",
        description: "The teacher's profile has been updated successfully.",
      })
    } else if (state === false) {
      toast({ title: "Error", description: "Failed to update teacher.", variant: "destructive" })
    }
  }, [state, toast])

  if (!teacher) {
    return <div>Loading...</div>
  }

  async function adminUpdateTeacherAction(_prevState: any, formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    const subject = String(formData.get("subject") ?? "").trim()
    const phone = String(formData.get("phone") ?? "").trim()
    const bio = String(formData.get("bio") ?? "").trim()
    const avatarUrl = String(formData.get("avatarUrl") ?? "").trim()

    return await adminUpdateTeacher(teacher.id, {
      name,
      subject,
      phone,
      bio,
      avatarUrl,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Teacher Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="t-name">Full name</Label>
                <Input id="t-name" name="name" defaultValue={teacher.name} required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-subject">Subject</Label>
                  <Input id="t-subject" name="subject" defaultValue={teacher.subject} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-phone">Phone (WhatsApp)</Label>
                  <Input id="t-phone" name="phone" defaultValue={teacher.phone} required />
                  <p className="text-[11px] text-muted-foreground">Used for WhatsApp contact button.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Photo</Label>
                <AvatarUpload value={teacher.avatar_url} />
                <input type="hidden" name="avatarUrl" value={teacher.avatar_url} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-bio">Description</Label>
                <Textarea id="t-bio" name="bio" defaultValue={teacher.bio} rows={4} />
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[180px] flex-col items-center gap-2">
              <div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-white">
                <img
                  src={teacher.avatar_url || "/placeholder.svg?height=160&width=160&query=teacher%20portrait"}
                  alt={"Teacher photo preview"}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">Preview</p>
            </div>
          </div>

          <Button disabled={pending} type="submit">
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
