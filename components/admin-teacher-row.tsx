"use client"

import { useState, useTransition, useActionState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarUpload } from "@/components/avatar-upload"
import { adminDeleteTeacher, adminUpdateTeacher, adminChangeCredentials } from "@/server/admin-actions"
import type { UpdateTeacherState } from "@/server/admin-actions"
import { useToast } from "@/hooks/use-toast"

type Teacher = {
  id: string
  name: string | null
  subject: string | null
  bio: string | null
  phone: string | null
  avatar_url: string | null
  username: string | null
  theme_primary: string | null
  theme_secondary: string | null
}

export function AdminTeacherRow({ teacher }: { teacher: Teacher }) {
  const { toast } = useToast()
  const router = useRouter()
  const [openEdit, setOpenEdit] = useState(false)
  const [openCreds, setOpenCreds] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [updateState, updateAction, isUpdating] = useActionState<UpdateTeacherState, FormData>(
    adminUpdateTeacher,
    undefined,
  )

  // Editable fields
  const [name, setName] = useState(teacher.name ?? "")
  const [subject, setSubject] = useState(teacher.subject ?? "")
  const [bio, setBio] = useState(teacher.bio ?? "")
  const [phone, setPhone] = useState(teacher.phone ?? "")
  const [avatarUrl, setAvatarUrl] = useState(teacher.avatar_url ?? "")
  const [primary, setPrimary] = useState(teacher.theme_primary ?? "#10b981")
  const [secondary, setSecondary] = useState(teacher.theme_secondary ?? "#14b8a6")

  // Creds
  const [username, setUsername] = useState(teacher.username ?? "")
  const [password, setPassword] = useState("")

  return (
    <>
      <tr className="border-t">
        <td className="py-2 pr-3">
          <div className="flex items-center gap-2">
            <img
              src={teacher.avatar_url || "/placeholder.svg?height=32&width=32&query=avatar"}
              alt="Avatar"
              className="h-8 w-8 rounded object-cover"
            />
            <span>{teacher.name}</span>
          </div>
        </td>
        <td className="py-2 pr-3">{teacher.subject || "—"}</td>
        <td className="py-2 pr-3">{teacher.phone || "—"}</td>
        <td className="py-2 pr-3">{teacher.username || "—"}</td>
        <td className="py-2 pr-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenEdit((v) => !v)}>
              {openEdit ? "Close" : "Edit"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpenCreds((v) => !v)}>
              {openCreds ? "Close" : "Credentials"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const ok = await adminDeleteTeacher(teacher.id)
                  toast({
                    title: ok ? "Deleted" : "Error",
                    description: ok ? "Teacher account deleted" : "Could not delete",
                    variant: ok ? "default" : "destructive",
                  })
                  if (ok) router.refresh()
                })
              }
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>

      {openEdit && (
        <tr className="bg-muted/30">
          <td colSpan={5} className="p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Photo</Label>
                <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} label="Change Photo" />
              </div>
              <div className="space-y-2">
                <Label>Theme (primary)</Label>
                <Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Theme (secondary)</Label>
                <Input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
              </div>

              <div className="sm:col-span-2">
                <form
                  action={async (formData) => {
                    const res = await updateAction(formData)
                    toast({
                      title: res.ok ? "Saved" : "Error",
                      description: res.message,
                      variant: res.ok ? "default" : "destructive",
                    })
                    if (res.ok) router.refresh()
                  }}
                >
                  <input type="hidden" name="id" value={teacher.id} />
                  <input type="hidden" name="name" value={name} />
                  <input type="hidden" name="subject" value={subject} />
                  <input type="hidden" name="bio" value={bio} />
                  <input type="hidden" name="phone" value={phone} />
                  <input type="hidden" name="avatarUrl" value={avatarUrl} />
                  <input type="hidden" name="themePrimary" value={primary} />
                  <input type="hidden" name="themeSecondary" value={secondary} />
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </div>
            </div>
          </td>
        </tr>
      )}

      {openCreds && (
        <tr className="bg-muted/30">
          <td colSpan={5} className="p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>New password (optional)</Label>
                <Input
                  placeholder="Leave blank to keep current"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const ok = await adminChangeCredentials(teacher.id, username, password || undefined)
                      toast({
                        title: ok ? "Saved" : "Error",
                        description: ok ? "Credentials updated" : "Could not update credentials",
                        variant: ok ? "default" : "destructive",
                      })
                      if (ok) {
                        setPassword("")
                        router.refresh()
                      }
                    })
                  }
                >
                  {isPending ? "Saving..." : "Save Credentials"}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
