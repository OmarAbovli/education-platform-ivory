"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { deleteVideoComment } from "@/server/video-comments-actions"
import { useTransition } from "react"
import { useToast } from "@/hooks/use-toast"

type VideoCommentItemProps = {
    comment: {
        id: string
        video_id: string
        user_id: string
        body: string
        created_at: string
        author_name: string | null
        author_avatar_url: string | null
    }
    currentUserId?: string
    currentUserRole?: string
}

export function VideoCommentItem({ comment, currentUserId, currentUserRole }: VideoCommentItemProps) {
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const canDelete = currentUserRole === "admin" || currentUserRole === "teacher" || currentUserId === comment.user_id

    const handleDelete = () => {
        if (!confirm("هل أنت متأكد من حذف هذا التعليق؟")) return

        startTransition(async () => {
            const res = await deleteVideoComment(comment.id, comment.video_id)
            if (res.ok) {
                toast({ title: "تم الحذف", description: "تم حذف التعليق بنجاح" })
            } else {
                toast({ title: "خطأ", description: res.message, variant: "destructive" })
            }
        })
    }

    return (
        <div className="flex gap-3 py-4 group">
            <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                <AvatarImage src={comment.author_avatar_url || ""} />
                <AvatarFallback className="bg-primary/5 text-primary">
                    {comment.author_name?.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{comment.author_name || "مستخدم"}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ar })}
                    </span>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                    {comment.body}
                </p>
            </div>

            {canDelete && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={handleDelete}
                    disabled={isPending}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
