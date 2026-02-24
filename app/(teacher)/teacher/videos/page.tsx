"use client"

import { useEffect, useState, useTransition } from "react"
import { getMyVideos, deleteVideo } from "@/server/teacher-actions"
import { getTeacherPackages } from "@/server/package-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, Plus, Film, Trash2, Calendar, Layout, Search, Users } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { VideoWatchersDialog } from "@/components/video-watchers-dialog"

export default function TeacherVideosPage() {
    const { toast } = useToast()
    const [videos, setVideos] = useState<any[]>([])
    const [packages, setPackages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        async function init() {
            setLoading(true)
            const [vids, pkgs] = await Promise.all([getMyVideos(), getTeacherPackages()])
            setVideos(vids)
            setPackages(pkgs)
            setLoading(false)
        }
        init()
    }, [])

    const filteredVideos = videos.filter(v =>
        v.title?.toLowerCase().includes(search.toLowerCase()) ||
        v.category?.toLowerCase().includes(search.toLowerCase())
    )

    const handleDelete = (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return
        startTransition(async () => {
            const res = await deleteVideo(id)
            if (res.ok) {
                setVideos(prev => prev.filter(v => v.id !== id))
                toast({ title: "Deleted", description: "Video removed successfully." })
            } else {
                toast({ title: "Error", description: res.error || "Failed to delete", variant: "destructive" })
            }
        })
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <main className="mx-auto max-w-6xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 transition-colors">
                        <Link href="/teacher">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold italic text-emerald-600">Videos Management</h1>
                        <p className="text-muted-foreground">Manage your uploaded lessons and assignments.</p>
                    </div>
                </div>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20">
                    <Link href="/teacher#upload" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Upload New Video
                    </Link>
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search videos by title or category..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.length === 0 ? (
                    <Card className="col-span-full py-12">
                        <div className="flex flex-col items-center justify-center text-center space-y-3">
                            <Film className="h-12 w-12 text-muted-foreground opacity-20" />
                            <div className="space-y-1">
                                <p className="font-medium">No videos found</p>
                                <p className="text-sm text-muted-foreground">Try adjusting your search or upload a new video.</p>
                            </div>
                        </div>
                    </Card>
                ) : (
                    filteredVideos.map(video => (
                        <Card key={video.id} className="overflow-hidden flex flex-col group border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                            <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative">
                                {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Film className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                                {video.is_free && (
                                    <Badge className="absolute top-2 right-2 bg-emerald-500 hover:bg-emerald-500">Free</Badge>
                                )}
                            </div>
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{video.category || 'General'}</Badge>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(video.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <CardTitle className="text-lg line-clamp-1 mt-1 group-hover:text-emerald-600 transition-colors uppercase">{video.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Layout className="h-3 w-3" />
                                            <span>
                                                {packages.find(p => p.id === video.package_id)?.name || 'No Package'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full text-emerald-600 font-medium border border-emerald-500/10">
                                            <Users className="h-3 w-3" />
                                            <span>{video.watchers_count || 0} Watchers</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {video.grades?.map((g: number) => (
                                            <Badge key={g} variant="secondary" className="text-[10px]">Grade {g}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/5">
                                    <Button asChild size="sm" variant="outline" className="flex-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 transition-colors">
                                        <Link href={`/teacher/videos/${video.id}/edit`}>Edit Details</Link>
                                    </Button>
                                    <VideoWatchersDialog videoId={video.id} videoTitle={video.title || "Untitled"} />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        onClick={() => handleDelete(video.id, video.title)}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </main>
    )
}
