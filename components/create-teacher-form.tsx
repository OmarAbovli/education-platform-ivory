"use client"

import { useActionState, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarUpload } from "@/components/avatar-upload"
import { type CreateTeacherState, createTeacherAction } from "@/server/admin-actions"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"

const initialState: CreateTeacherState = undefined

export function CreateTeacherForm() {
  const { toast } = useToast()
  const [state, formAction, pending] = useActionState(createTeacherAction, initialState)

  // Local preview state for avatar and colors; submit via hidden inputs
  const [avatarUrl, setAvatarUrl] = useState("")
  const [themePrimary, setThemePrimary] = useState("#10b981")
  const [themeSecondary, setThemeSecondary] = useState("#14b8a6")

  useEffect(() => {
    if (state?.ok) {
      toast({
        title: "Teacher created",
        description: "Credentials generated below. Share them securely with the teacher.",
      })
    } else if (state && !state.ok) {
      toast({ title: "Error", description: state.message, variant: "destructive" })
    }
  }, [state, toast])

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-name">Full name</Label>
            <Input id="t-name" name="name" placeholder="Jane Doe" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-subject">Subject</Label>
              <Input id="t-subject" name="subject" placeholder="Math • Physics • English" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-phone">Phone (WhatsApp)</Label>
              <Input id="t-phone" name="phone" placeholder="+1 555 000 1111" required />
              <p className="text-[11px] text-muted-foreground">Used for WhatsApp contact button.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-email">Email (optional)</Label>
              <Input id="t-email" name="email" placeholder="jane@school.org" type="email" />
            </div>

            <div className="space-y-2">
              <Label>Photo</Label>
              <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} />
              {/* Submit avatar through hidden input */}
              <input type="hidden" name="avatarUrl" value={avatarUrl} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-bio">Description</Label>
            <Textarea id="t-bio" name="bio" placeholder="Short bio or description..." rows={4} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-primary">Theme color (primary)</Label>
              <Input
                id="t-primary"
                type="color"
                value={themePrimary}
                onChange={(e) => setThemePrimary(e.target.value)}
              />
              <input type="hidden" name="themePrimary" value={themePrimary} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-secondary">Theme color (secondary)</Label>
              <Input
                id="t-secondary"
                type="color"
                value={themeSecondary}
                onChange={(e) => setThemeSecondary(e.target.value)}
              />
              <input type="hidden" name="themeSecondary" value={themeSecondary} />
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[180px] flex-col items-center gap-2">
          <div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-white">
            <img
              src={avatarUrl || "/placeholder.svg?height=160&width=160&query=teacher%20portrait"}
              alt={"Teacher photo preview"}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">Preview</p>
        </div>
      </div>

      <Button disabled={pending} type="submit">
        {pending ? "Creating..." : "Create Teacher"}
      </Button>

      {state && !state.ok && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      {state?.ok && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium">Generated Credentials</p>
            <p className="text-xs text-muted-foreground mt-1">Please copy and share securely with the teacher.</p>
            <div className="mt-2 grid gap-1 text-sm">
              <div>
                <span className="font-medium">Username: </span>
                <code className="rounded bg-muted px-1 py-0.5">{state.username}</code>
              </div>
              <div>
                <span className="font-medium">Password: </span>
                <code className="rounded bg-muted px-1 py-0.5">{state.password}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
