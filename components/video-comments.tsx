"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Send } from "lucide-react"
import { VideoCommentItem } from "./video-comment-item"
import { addVideoComment } from "@/server/video-comments-actions"
import { useToast } from "@/hooks/use-toast"
import { VideoComment } from "@/server/video-comments-queries"

type VideoCommentsProps = {
    videoId: string
    comments: VideoComment[]
    currentUserId?: string
    currentUserRole?: string
}

export function VideoComments({ videoId, comments, currentUserId, currentUserRole }: VideoCommentsProps) {
    const [body, setBody] = useState("")
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!body.trim()) return

        startTransition(async () => {
            const res = await addVideoComment(videoId, body)
            if (res.ok) {
                setBody("")
                toast({ title: "تم الإضافة", description: "تم إضافة تعليقك بنجاح" })
            } else {
                toast({ title: "خطأ", description: res.message, variant: "destructive" })
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">التعليقات ({comments.length})</h2>
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <Textarea
                            placeholder="اكتب تعليقك هنا..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="min-h-[100px] resize-none focus-visible:ring-primary/30"
                            disabled={isPending}
                        />
                        <div className="flex justify-end">
                            <Button disabled={isPending || !body.trim()} size="sm" className="gap-2">
                                {isPending ? "جاري الإرسال..." : "إرسال التعليق"}
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="divide-y divide-border/50">
                {comments.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        <p>لا توجد تعليقات بعد. كن أول من يعلق!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <VideoCommentItem
                            key={comment.id}
                            comment={comment}
                            currentUserId={currentUserId}
                            currentUserRole={currentUserRole}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
