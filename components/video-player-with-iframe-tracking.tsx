"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Eye, AlertCircle, Lock, Info } from "lucide-react"
import SecureVideoPlayer from "./secure-video-player"

interface VideoPlayerWithIframeTrackingProps {
  videoId: string
  videoUrl: string
  videoTitle: string
  watermarkText?: string
  estimatedDurationMinutes?: number // المدة التقديرية للفيديو بالدقائق
}

export default function VideoPlayerWithIframeTracking({
  videoId,
  videoUrl,
  videoTitle,
  watermarkText = "",
  estimatedDurationMinutes = 10
}: VideoPlayerWithIframeTrackingProps) {
  const [watchInfo, setWatchInfo] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watchTime, setWatchTime] = useState(0) // بالثواني
  const [isWatching, setIsWatching] = useState(false)
  const watchInterval = useRef<NodeJS.Timeout | null>(null)
  const startTime = useRef<number>(0)

  // جلب معلومات المشاهدة
  const fetchWatchInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-tracking?videoId=${videoId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setWatchInfo(data.data)
        return data.data
      }
      return null
    } catch (err) {
      console.error("Error fetching watch info:", err)
      return null
    }
  }, [videoId])

  // بدء جلسة المشاهدة
  const startWatchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/video-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          videoId
        })
      })

      const data = await response.json()
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId)
        return true
      }
      return false
    } catch (err) {
      console.error("Error starting watch session:", err)
      return false
    }
  }, [videoId])

  // تتبع الوقت المشاهد
  const trackWatchTime = useCallback(async () => {
    if (!sessionId || !isWatching) return

    const currentTime = Date.now()
    const elapsedSeconds = Math.floor((currentTime - startTime.current) / 1000)
    setWatchTime(elapsedSeconds)

    // احسب النسبة المئوية بناءً على المدة التقديرية
    const estimatedDurationSeconds = estimatedDurationMinutes * 60
    const progressPercent = Math.min(100, (elapsedSeconds / estimatedDurationSeconds) * 100)

    console.log(`[Iframe Tracking] Watch time: ${elapsedSeconds}s, Progress: ${progressPercent.toFixed(1)}%`)

    // أرسل التقدم للخادم
    try {
      const response = await fetch('/api/video-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track',
          videoId,
          progress: progressPercent,
          sessionId
        })
      })

      const data = await response.json()
      
      if (data.success && data.completed) {
        console.log('[Iframe Tracking] Video marked as completed!')
        // أوقف التتبع
        if (watchInterval.current) {
          clearInterval(watchInterval.current)
          watchInterval.current = null
        }
        
        // حدث معلومات المشاهدة
        await fetchWatchInfo()
      }
    } catch (err) {
      console.error("Error tracking progress:", err)
    }
  }, [videoId, sessionId, isWatching, estimatedDurationMinutes, fetchWatchInfo])

  // بدء/إيقاف التتبع عند تغيير التركيز
  useEffect(() => {
    const handleFocus = () => {
      console.log('[Iframe Tracking] Page focused - starting tracking')
      setIsWatching(true)
      startTime.current = Date.now() - (watchTime * 1000)
    }

    const handleBlur = () => {
      console.log('[Iframe Tracking] Page blurred - pausing tracking')
      setIsWatching(false)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[Iframe Tracking] Page hidden - pausing tracking')
        setIsWatching(false)
      } else {
        console.log('[Iframe Tracking] Page visible - resuming tracking')
        setIsWatching(true)
        startTime.current = Date.now() - (watchTime * 1000)
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ابدأ التتبع إذا كانت الصفحة نشطة
    if (document.hasFocus() && !document.hidden) {
      setIsWatching(true)
      startTime.current = Date.now()
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [watchTime])

  // تحميل معلومات المشاهدة وبدء الجلسة
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const info = await fetchWatchInfo()
      setLoading(false)
      
      if (info?.canWatch) {
        await startWatchSession()
      }
    }
    
    init()
  }, [fetchWatchInfo, startWatchSession])

  // إعداد تتبع الوقت
  useEffect(() => {
    if (!sessionId || !isWatching) return

    // تتبع كل 10 ثواني
    watchInterval.current = setInterval(() => {
      trackWatchTime()
    }, 10000)

    return () => {
      if (watchInterval.current) {
        clearInterval(watchInterval.current)
      }
      // حفظ التقدم النهائي
      trackWatchTime()
    }
  }, [sessionId, isWatching, trackWatchTime])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!watchInfo?.canWatch) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">لقد وصلت للحد الأقصى من المشاهدات</p>
              <p>لقد شاهدت هذا الفيديو {watchInfo?.timesWatched || 0} مرات من أصل {watchInfo?.maxAllowed || 3} مرات مسموحة.</p>
              <p className="text-sm">يرجى التواصل مع المعلم للحصول على مشاهدات إضافية.</p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* معلومات المشاهدة */}
      {watchInfo && watchInfo.watchLimitEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              المشاهدات المتبقية: 
              <Badge variant={watchInfo.remainingWatches <= 1 ? "destructive" : "secondary"} className="mr-2">
                {watchInfo.remainingWatches} من {watchInfo.maxAllowed}
              </Badge>
            </span>
          </div>
          
          {watchInfo.timesWatched > 0 && (
            <span className="text-xs text-muted-foreground">
              شاهدت {watchInfo.timesWatched} {watchInfo.timesWatched === 1 ? 'مرة' : 'مرات'}
            </span>
          )}
        </div>
      )}

      {/* تنبيه للمشغل الخارجي */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">تتبع تلقائي للمشاهدة</p>
            <p className="text-xs">
              يتم احتساب المشاهدة بناءً على الوقت المقضي في الصفحة.
              المدة المتوقعة: {estimatedDurationMinutes} دقيقة
            </p>
            {isWatching && (
              <p className="text-xs text-green-600">
                ⏱️ وقت المشاهدة: {Math.floor(watchTime / 60)}:{String(watchTime % 60).padStart(2, '0')}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* مشغل الفيديو */}
      <SecureVideoPlayer
        source={videoUrl}
        title={videoTitle}
        watermarkText={watermarkText}
        antiDownload
        aspectRatio="16:9"
      />

      {/* تنبيه عند اقتراب الحد */}
      {watchInfo && watchInfo.watchLimitEnabled && watchInfo.remainingWatches === 1 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            تنبيه: هذه آخر مشاهدة متاحة لك لهذا الفيديو.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
