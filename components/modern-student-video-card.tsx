"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ProfessionalVideoPlayer from '@/components/professional-video-player'
import { Play, Lock, Clock, CheckCircle2, LayoutTemplate } from 'lucide-react'
import { isYouTubeUrl, toYouTubeEmbed } from '@/lib/youtube'
import { isVimeoUrl, normalizeVimeoInput, extractVimeoEmbedSrc } from '@/lib/vimeo'
import { isBunnyUrl, normalizeBunnyInput, isBunnyEmbedUrl, extractBunnyEmbedSrc } from '@/lib/bunny'
import RedeemCodeDialog from '@/components/redeem-code-dialog'
import { useAuth } from '@/lib/auth-provider'
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type Props = {
    id?: string
    title?: string
    source?: string
    thumbnailUrl?: string
    watermarkText?: string
    antiDownload?: boolean
    hideRedeem?: boolean
    isLocked?: boolean
    duration?: string
    isCompleted?: boolean
}

export default function ModernStudentVideoCard({
    id = '',
    title = 'Video',
    source = '',
    thumbnailUrl = '/video-thumbnail.png',
    watermarkText = '',
    antiDownload = false,
    hideRedeem = false,
    isLocked = false,
    duration,
    isCompleted = false
}: Props) {
    const { user } = useAuth()
    const [playing, setPlaying] = useState(false)

    const { kind, embedSrc } = useMemo(() => {
        const raw = (source || '').trim()
        if (!raw) return { kind: 'none' as const, embedSrc: '' }

        // Check if iframe code
        const lower = raw.toLowerCase()
        const hasIframe = lower.includes('<iframe')

        if (hasIframe) {
            const bunnySrc = extractBunnyEmbedSrc(raw)
            if (bunnySrc) return { kind: 'bunny-embed' as const, embedSrc: normalizeBunnyInput(bunnySrc) }

            const vimeoSrc = extractVimeoEmbedSrc(raw)
            if (vimeoSrc) return { kind: 'vimeo' as const, embedSrc: normalizeVimeoInput(vimeoSrc) }

            const m = raw.match(/src=['"]([^'"]+)['"]/i)
            if (m) return { kind: 'iframe-generic' as const, embedSrc: m[1] }
            return { kind: 'iframe-generic' as const, embedSrc: raw }
        }

        if (isYouTubeUrl(raw)) return { kind: 'yt' as const, embedSrc: toYouTubeEmbed(raw) }
        if (isBunnyUrl(raw)) {
            return {
                kind: isBunnyEmbedUrl(raw) ? ('bunny-embed' as const) : ('file' as const),
                embedSrc: normalizeBunnyInput(raw),
            }
        }
        if (isVimeoUrl(raw)) return { kind: 'vimeo' as const, embedSrc: normalizeVimeoInput(raw) }

        return { kind: 'file' as const, embedSrc: raw }
    }, [source])

    // Play handler
    const handlePlay = () => {
        if (!isLocked) {
            setPlaying(true)
        }
    }

    const renderMedia = () => {
        if (playing) {
            return (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10 shadow-2xl ring-2 ring-indigo-500/50 animate-in fade-in zoom-in-95 duration-300">
                    {kind === 'yt' || kind === 'vimeo' || kind === 'bunny-embed' || kind === 'iframe-generic' ? (
                        <iframe
                            className="h-full w-full"
                            src={embedSrc}
                            title={title}
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                        />
                    ) : (
                        <ProfessionalVideoPlayer
                            videoId={id}
                            videoUrl={embedSrc}
                            videoTitle={title}
                            watermarkText={watermarkText}
                        />
                    )}
                </div>
            )
        }

        return (
            <div
                className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 shadow-lg ring-1 ring-white/10 group-hover:ring-indigo-500/50 transition-all duration-500 cursor-pointer"
                onClick={handlePlay}
            >
                <img
                    src={thumbnailUrl || '/placeholder.svg?height=360&width=640&query=video%20thumbnail'}
                    alt={title}
                    className={cn(
                        "h-full w-full object-cover transition-transform duration-700 ease-out",
                        !isLocked && "group-hover:scale-110"
                    )}
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                {/* Status Badge (Completed) */}
                {isCompleted && (
                    <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                    </div>
                )}

                {/* Lock or Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {isLocked ? (
                        <div className="h-12 w-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Lock className="h-5 w-5 text-white/70" />
                        </div>
                    ) : (
                        <div className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 group-hover:bg-indigo-600 group-hover:border-indigo-400 transition-all duration-300">
                            <Play className="h-6 w-6 text-white ml-1 fill-white" />
                        </div>
                    )}
                </div>

                {/* Duration Badge */}
                {duration && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            className={cn(
                "group relative flex flex-col gap-3 rounded-2xl p-0 hover:bg-white/5 transition-all duration-300",
                isLocked ? "opacity-75 grayscale-[0.5]" : ""
            )}
        >
            {/* Media Container (Thumbnail or Player) */}
            {renderMedia()}

            {/* Content Info */}
            <div className="space-y-1.5 p-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <Link href={`/watch/${id}`} className="block group/link">
                            <h3 className={cn(
                                "font-bold text-base leading-tight line-clamp-2 group-hover/link:text-indigo-400 transition-colors",
                                isLocked ? "text-muted-foreground" : "text-foreground"
                            )}>
                                {title}
                            </h3>
                        </Link>
                        {!isLocked && (
                            <Link
                                href={`/watch/${id}`}
                                className="inline-flex items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-indigo-400 transition-colors gap-1"
                            >
                                <LayoutTemplate className="w-3 h-3" />
                                <span>صفحة الفيديو</span>
                            </Link>
                        )}
                    </div>

                    {!hideRedeem && !isLocked && (
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <RedeemCodeDialog triggerVariant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-400" />
                        </div>
                    )}
                </div>

                {/* Optional Meta/Description line could go here */}
                {isLocked && (
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400 text-[10px] h-5 px-1.5 gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Locked Content
                        </Badge>
                    </div>
                )}
            </div>
        </div>
    )
}
