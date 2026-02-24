'use client'

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { deleteVideo } from "@/server/teacher-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Video = {
  id: string
  title: string | null
  description: string | null
  url: string | null
  // Add other video properties as needed for display
}

export function TeacherVideoRow({ video }: { video: Video }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, startDeleting] = useTransition()

  function onDeleteConfirmed() {
    startDeleting(async () => {
      const res = await deleteVideo(video.id)
      toast({
        title: res.ok ? "Deleted" : "Error",
        description: res.ok ? "Video removed" : ((res as any).error ?? "Failed to delete"),
        variant: res.ok ? "default" : "destructive",
      })
      if (res.ok) {
        router.refresh()
      }
    })
  }

  return (
    <tr className="border-t align-top">
      <td className="py-2 pr-3">
        <div className="font-medium">{video.title || "Untitled"}</div>
      </td>
      <td className="py-2 pr-3">
        <div className="line-clamp-2 max-w-[420px] text-muted-foreground">{video.description}</div>
      </td>
      <td className="py-2 pr-3">
        <a
          href={video.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[280px] truncate text-emerald-700 underline"
        >
          {video.url}
        </a>
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
                <Link href={`/teacher/videos/${video.id}/edit`}>Edit</Link>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this video?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. The video and all its associated data (like resources) will be permanently removed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteConfirmed} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </td>
    </tr>
  )
}
