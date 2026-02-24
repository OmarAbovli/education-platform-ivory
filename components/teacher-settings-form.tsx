"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AvatarUpload } from "@/components/avatar-upload"
import { updateTeacherSelf } from "@/server/teacher-actions"
import { useToast } from "@/hooks/use-toast"

type Props = {
  initial: {
    name: string
    phone: string
    bio: string
    subject: string
    avatar_url: string
    theme_primary: string
    theme_secondary: string
  }
}

export function TeacherSettingsForm({
  initial = {
    name: "",
    phone: "",
    bio: "",
    subject: "",
    avatar_url: "",
    theme_primary: "#10b981",
    theme_secondary: "#14b8a6",
  },
}: Props) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [bio, setBio] = useState(initial.bio)
  const [subject, setSubject] = useState(initial.subject)
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url)
  const [primary, setPrimary] = useState(initial.theme_primary || "#10b981")
  const [secondary, setSecondary] = useState(initial.theme_secondary || "#14b8a6")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const ok = await updateTeacherSelf({
            name,
            phone,
            bio,
            subject,
            avatarUrl,
            themePrimary: primary,
            themeSecondary: secondary,
          })
          toast({
            title: ok ? "Saved" : "Error",
            description: ok ? "Your profile was updated" : "Could not update profile",
            variant: ok ? "default" : "destructive",
          })
        })
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Photo</Label>
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} label="Change Photo" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Theme (primary)</Label>
          <Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Theme (secondary)</Label>
          <Input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
        </div>
      </div>
      <div>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  )
}
