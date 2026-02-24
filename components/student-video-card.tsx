"use client"

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import ProfessionalVideoPlayer from '@/components/professional-video-player'
import { Play } from 'lucide-react'
import { isYouTubeUrl, toYouTubeEmbed } from '@/lib/youtube'
import { isVimeoUrl, normalizeVimeoInput, extractVimeoEmbedSrc } from '@/lib/vimeo'
import { isBunnyUrl, normalizeBunnyInput, isBunnyEmbedUrl, extractBunnyEmbedSrc } from '@/lib/bunny'
import RedeemCodeDialog from '@/components/redeem-code-dialog'
import { useAuth } from '@/lib/auth-provider'

type Props = {
  id?: string
  title?: string
  source?: string
  thumbnailUrl?: string
  watermarkText?: string
  antiDownload?: boolean
  hideRedeem?: boolean
}

export default function StudentVideoCard({
  id = '',
  title = 'Video',
  source = '',
  thumbnailUrl = '/video-thumbnail.png',
  watermarkText = '',
  antiDownload = false,
  hideRedeem = false,
}: Props) {
  const { user } = useAuth()
  const [playing, setPlaying] = useState(false)

  const { kind, embedSrc } = useMemo(() => {
    const raw = (source || '').trim()
    if (!raw) return { kind: 'none' as const, embedSrc: '' }
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

  return (
    <div className="group transition-all hover:shadow-md rounded-md border overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <Link href={`/watch/${id}`}>
          <div className="text-base font-medium hover:underline">{title}</div>
        </Link>
        {!hideRedeem && <RedeemCodeDialog />}
      </div>

      <div className="px-4 pb-4">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="relative w-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={`Play ${title}`}
          >
            <div className="aspect-video w-full">
              <img
                src={thumbnailUrl || '/placeholder.svg?height=360&width=640&query=video%20thumbnail'}
                alt={`${title} thumbnail`}
                className="h-full w-full object-cover"
              />
            </div>
            <div
              className="absolute inset-0 grid place-items-center bg-black/20 opacity-100 group-hover:bg-black/30 transition-colors"
              data-no-bg-compat="true"
              suppressHydrationWarning
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-2 text-sm font-medium text-primary shadow">
                <Play className="h-4 w-4" />
                Play
              </span>
            </div>
          </button>
        ) : kind === 'yt' || kind === 'vimeo' || kind === 'bunny-embed' || kind === 'iframe-generic' ? (
          <div className="aspect-video w-full overflow-hidden rounded-md">
            <iframe
              className="h-full w-full"
              src={embedSrc}
              title={title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <ProfessionalVideoPlayer
            videoId={id}
            videoUrl={embedSrc}
            videoTitle={title}
            watermarkText={watermarkText}
          />
        )}
      </div>
    </div>
  )
}