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
    gemini_api_key: string
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
    gemini_api_key: "",
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
  const [geminiKey, setGeminiKey] = useState(initial.gemini_api_key || "")

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
            gemini_api_key: geminiKey,
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

      {/* AI Settings Section */}
      <div className="border-t pt-6 mt-2">
         <h3 className="text-lg font-semibold mb-2">AI Learning Suite Configuration</h3>
         <div className="space-y-2">
            <Label>Google Gemini API Key</Label>
            <Input 
              type="password" 
              placeholder="Enter your Gemini 1.5 API Key here..." 
              value={geminiKey} 
              onChange={(e) => setGeminiKey(e.target.value)} 
            />
            <p className="text-xs text-muted-foreground">
              Used for generating video summaries, study guides, and the interactive learning chatbot.
              <a href="https://aistudio.google.com/app/apikey" target="_blank" className="ml-1 text-emerald-600 underline">Get a free key here.</a>
            </p>
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
