'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Eye, Lock, AlertCircle } from 'lucide-react'

interface VideoWatchInfo {
  timesWatched: number
  maxAllowed: number
  remainingWatches: number
  canWatch: boolean
  watchLimitEnabled: boolean
}

type Props = {
  id: string
  title?: string
  description?: string
  thumbnailUrl?: string
  category?: string
  isLocked?: boolean
  watchInfo?: VideoWatchInfo | null
}

export default function StudentVideoCardWithTracking({
  id,
  title = 'Video',
  description,
  thumbnailUrl = '/video-thumbnail.png',
  category,
  isLocked = false,
  watchInfo
}: Props) {
  const [localWatchInfo, setLocalWatchInfo] = useState<VideoWatchInfo | null>(watchInfo || null)
  const [loading, setLoading] = useState(false)

  // جلب معلومات المشاهدة إذا لم تكن متوفرة
  useEffect(() => {
    if (!watchInfo && !isLocked) {
      setLoading(true)
      fetch(`/api/video-tracking?videoId=${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setLocalWatchInfo(data.data)
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id, watchInfo, isLocked])

  const info = watchInfo || localWatchInfo
  const canWatch = !isLocked && (!info?.watchLimitEnabled || info?.canWatch)
  const remainingWatches = info?.remainingWatches ?? 3
  const timesWatched = info?.timesWatched ?? 0

  return (
    <Card className="group transition-all hover:shadow-md overflow-hidden">
      <div className="relative">
        {/* الصورة المصغرة */}
        <div className="aspect-video relative overflow-hidden bg-muted">
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          
          {/* Overlay للحالة */}
          {isLocked ? (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Lock className="h-8 w-8 text-white" />
            </div>
          ) : !canWatch ? (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
              <AlertCircle className="h-8 w-8 mb-2" />
              <span className="text-sm">وصلت للحد الأقصى</span>
            </div>
          ) : (
            <Link href={`/watch/${id}`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="bg-white/90 rounded-full p-3">
                <Play className="h-6 w-6 text-primary" />
              </div>
            </Link>
          )}
        </div>

        {/* معلومات المشاهدة */}
        {info?.watchLimitEnabled && !isLocked && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <Badge 
              variant={remainingWatches === 0 ? "destructive" : remainingWatches <= 1 ? "secondary" : "default"}
              className="bg-background/90 backdrop-blur-sm"
            >
              <Eye className="h-3 w-3 ml-1" />
              {remainingWatches === 0 ? (
                "انتهت المشاهدات"
              ) : (
                `${remainingWatches} مشاهدة متبقية`
              )}
            </Badge>
          </div>
        )}

        {/* الفئة */}
        {category && (
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
              {category}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* العنوان */}
        <h3 className="font-semibold line-clamp-2 mb-2">
          {canWatch ? (
            <Link href={`/watch/${id}`} className="hover:underline">
              {title}
            </Link>
          ) : (
            <span className="text-muted-foreground">{title}</span>
          )}
        </h3>

        {/* الوصف */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* معلومات إضافية */}
        <div className="flex items-center justify-between text-xs">
          {info?.watchLimitEnabled && !isLocked ? (
            <div className="flex items-center gap-2">
              {timesWatched > 0 && (
                <span className="text-muted-foreground">
                  شاهدت {timesWatched} {timesWatched === 1 ? 'مرة' : 'مرات'}
                </span>
              )}
              {remainingWatches === 1 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  آخر مشاهدة!
                </Badge>
              )}
            </div>
          ) : (
            <div />
          )}
          
          {/* حالة القفل */}
          {isLocked && (
            <Badge variant="secondary" className="text-xs">
              <Lock className="h-3 w-3 ml-1" />
              مقفل
            </Badge>
          )}
          
          {/* زر المشاهدة */}
          {!isLocked && canWatch && (
            <Link href={`/watch/${id}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                <Play className="h-3 w-3 ml-1" />
                شاهد الآن
              </Badge>
            </Link>
          )}
        </div>

        {/* تحذير عند انتهاء المشاهدات */}
        {!isLocked && info?.watchLimitEnabled && remainingWatches === 0 && (
          <div className="mt-3 p-2 bg-destructive/10 rounded-md">
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              لقد استنفذت جميع المشاهدات المتاحة. تواصل مع المعلم للحصول على المزيد.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
