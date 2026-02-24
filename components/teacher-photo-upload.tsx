"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createPhoto } from "@/server/photo-actions"

export default function TeacherPhotoUpload() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = React.useState<File | null>(null)
  const [caption, setCaption] = React.useState("")
  const [isUploading, setIsUploading] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) {
      toast({ title: "No file selected", description: "Please choose an image to upload." })
      return
    }
    try {
      setIsUploading(true)
      // 1) Upload to Blob Store
      const fd = new FormData()
      fd.append("file", file)
      fd.append("filename", file.name)
      const res = await fetch("/api/photo-upload", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()

      if (!res.ok) {
        // res.json() will throw if the body is not valid JSON.
        // The error message will be in data.error or a default message.
        throw new Error(data?.error || `Upload failed with status: ${res.status}`)
      }
      const url: string = data.url

      // 2) Persist record in DB
      await createPhoto({ url, caption })

      toast({ title: "Photo uploaded", description: "Your image has been added to Photos." })
      setFile(null)
      setCaption("")
      ;(e.currentTarget as HTMLFormElement).reset()
      router.refresh()
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="photo-file">Select image</Label>
        <Input
          id="photo-file"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-describedby="photo-help"
          required
        />
        <p id="photo-help" className="text-xs text-muted-foreground">
          JPG, PNG, or WebP. Keep under ~4.5 MB for server uploads. For larger files, we can switch to client uploads.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="photo-caption">Caption (optional)</Label>
        <Textarea
          id="photo-caption"
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImagePlus className="mr-2 h-4 w-4" />
              Upload Photo
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
