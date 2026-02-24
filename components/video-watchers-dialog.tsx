'use client'

import { useState, useTransition, useEffect } from "react"
import { getVideoWatchers } from "@/server/video-tracking-actions"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Users, Loader2, Calendar, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type Watcher = {
    student_id: string
    student_name: string
    student_username: string
    student_grade: number
    completed_count: number
    last_watch_progress: number
    last_watched_at: string
}

export function VideoWatchersDialog({ videoId, videoTitle }: { videoId: string, videoTitle: string }) {
    const [open, setOpen] = useState(false)
    const [watchers, setWatchers] = useState<Watcher[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            loadWatchers()
        }
    }, [open])

    async function loadWatchers() {
        setLoading(true)
        setError(null)
        try {
            const res = await getVideoWatchers(videoId)
            if (res.ok) {
                setWatchers(res.watchers || [])
            } else {
                setError(res.error || "Failed to load watchers")
            }
        } catch (e) {
            setError("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 border-emerald-500/20">
                    <Users className="h-4 w-4" />
                    View Watchers
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col overflow-hidden">
                <DialogHeader className="flex-none pb-4">
                    <DialogTitle className="flex justify-between items-center text-xl font-bold italic text-emerald-600">
                        <div className="flex items-center gap-2 text-right rtl">
                            <Users className="h-6 w-6" />
                            الطلاب الذين شاهدوا: {videoTitle}
                        </div>
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-50">
                            {watchers.length} طالب
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 min-w-0 flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                            <p className="text-muted-foreground animate-pulse">Loading watch records...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                            {error}
                        </div>
                    ) : watchers.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                            <p className="text-muted-foreground">No students have watched this video yet.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-2 overflow-x-hidden">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead>Completions</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {watchers.map((watcher) => (
                                        <TableRow key={watcher.student_id}>
                                            <TableCell>
                                                <div className="font-medium">{watcher.student_name}</div>
                                                <div className="text-xs text-muted-foreground">{watcher.student_username}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200">
                                                    Year {watcher.student_grade}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-semibold text-emerald-600">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {watcher.completed_count}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-xs font-medium">{watcher.last_watch_progress}%</div>
                                                    <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500"
                                                            style={{ width: `${watcher.last_watch_progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(watcher.last_watched_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
