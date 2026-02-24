"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import PhotoLikeButton from "@/components/photo-like-button"
import PhotoCommentForm from "@/components/photo-comment-form"
import { MessageCircle, Trash2 } from "lucide-react"
import { deletePhoto } from "@/server/photo-actions"

export type PhotoCardProps = {
  id: string
  url: string
  caption?: string | null
  likeCount: number
  commentCount: number
  likedByMe: boolean
  teacherId: string
  teacherName: string | null
  teacherAvatarUrl: string | null
  createdAt?: string
  isTeacher?: boolean
  currentUserId?: string
}

type PhotoComment = {
  id: string
  photo_id: string
  user_id: string
  body: string
  created_at: string
  user_name: string | null
  user_avatar_url: string | null
}

export default function PhotoCard({
  id,
  url,
  caption = null,
  likeCount,
  commentCount,
  likedByMe,
  teacherId,
  teacherName,
  teacherAvatarUrl,
  isTeacher = false,
  currentUserId,
}: PhotoCardProps) {
  const [openComments, setOpenComments] = useState(false)
  const [comments, setComments] = useState<PhotoComment[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({ likes: likeCount, comments: commentCount })
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) return

    setDeleting(true)
    const result = await deletePhoto(id)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error || 'فشل حذف الصورة')
      setDeleting(false)
    }
  }

  const canDelete = isTeacher && currentUserId === teacherId

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/photos/${id}/comments`, { headers: { Accept: "application/json" } })
        const contentType = res.headers.get("content-type") || ""
        if (!res.ok || !contentType.includes("application/json")) {
          console.warn("Comments fetch failed:", res.status, await res.text())
          setComments([])
          return
        }
        const data = await res.json()
        setComments(data?.comments ?? [])
      } catch (err) {
        console.error("Comments error", err)
        setComments([])
      } finally {
        setLoading(false)
      }
    }
    if (openComments && comments === null && !loading) {
      load()
    }
  }, [openComments, comments, id, loading])

  const onCommentAdded = (c: PhotoComment) => {
    setComments((prev) => [c, ...(prev ?? [])])
    setCounts((s) => ({ ...s, comments: s.comments + 1 }))
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Link href={`/about-us/${teacherId}`} className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={teacherAvatarUrl || "/placeholder.svg?height=64&width=64&query=teacher-avatar"}
              alt={`${teacherName ?? "Teacher"} avatar`}
            />
            <AvatarFallback>{(teacherName ?? "T").slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium hover:underline">{teacherName ?? "Teacher"}</div>
          </div>
        </Link>
      </CardHeader>

      <div className="relative">
        <img
          src={url || "/placeholder.svg?height=600&width=800&query=teacher-photo"}
          alt={caption ?? "Teacher photo"}
          className="h-72 w-full object-cover sm:h-96"
        />
        {canDelete && (
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <CardContent className="grid gap-3 p-3">
        {caption && <p className="text-sm text-muted-foreground">{caption}</p>}

        <div className="flex items-center gap-2">
          <PhotoLikeButton photoId={id} initialCount={counts.likes} initialLiked={likedByMe} />
          <button
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
            onClick={() => setOpenComments((v) => !v)}
            aria-expanded={openComments}
            aria-controls={`comments-${id}`}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">{counts.comments}</span>
            <span>Comments</span>
          </button>
        </div>

        {openComments && (
          <div id={`comments-${id}`} className="grid gap-3">
            {loading && <div className="text-sm text-muted-foreground">Loading comments...</div>}
            {!loading && comments && comments.length === 0 && (
              <div className="text-sm text-muted-foreground">No comments yet.</div>
            )}
            {!loading &&
              comments &&
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={c.user_avatar_url || "/placeholder.svg?height=64&width=64&query=user-avatar"}
                      alt={`${c.user_name ?? "User"} avatar`}
                    />
                    <AvatarFallback>{(c.user_name ?? "U").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{c.user_name ?? "User"}</span>{" "}
                      <span className="text-muted-foreground">{c.body}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            <PhotoCommentForm photoId={id} onAdded={onCommentAdded} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
