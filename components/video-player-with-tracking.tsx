"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, AlertCircle, Lock, MessageCircle, Phone } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import SecureVideoPlayer from "./secure-video-player"

interface VideoWatchInfo {
  videoId: string
  timesWatched: number
  maxAllowed: number
  remainingWatches: number
  canWatch: boolean
  lastWatchProgress: number
  watchLimitEnabled: boolean
}

interface VideoPlayerWithTrackingProps {
  videoId: string
  videoUrl: string
  videoTitle: string
  watermarkText?: string
  onWatchComplete?: () => void
  teacherPhone?: string
  teacherName?: string
}

export default function VideoPlayerWithTracking({
  videoId,
  videoUrl,
  videoTitle,
  watermarkText = "",
  onWatchComplete,
  teacherPhone,
  teacherName
}: VideoPlayerWithTrackingProps) {
  const [watchInfo, setWatchInfo] = useState<VideoWatchInfo | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [isTracking, setIsTracking] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastTrackedProgress = useRef(0)
  const trackingInterval = useRef<NodeJS.Timeout | null>(null)

  // جلب معلومات المشاهدة
  const fetchWatchInfo = useCallback(async () => {
    try {
      console.log('[Watch Tracking] Fetching watch info for video:', videoId)
      const response = await fetch(`/api/video-tracking?videoId=${videoId}`)
      const data = await response.json()
      console.log('[Watch Tracking] Watch info response:', data)
      
      if (data.success && data.data) {
        setWatchInfo(data.data)
        return data.data
      } else {
        setError("فشل في جلب معلومات المشاهدة")
        return null
      }
    } catch (err) {
      console.error("[Watch Tracking] Error fetching watch info:", err)
      setError("حدث خطأ في جلب معلومات المشاهدة")
      return null
    }
  }, [videoId])

  // بدء جلسة المشاهدة
  const startWatchSession = useCallback(async () => {
    try {
      console.log('[Watch Tracking] Starting watch session for video:', videoId)
      const response = await fetch('/api/video-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          videoId
        })
      })

      const data = await response.json()
      console.log('[Watch Tracking] Session start response:', data)
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId)
        setIsTracking(true)
        return true
      }
      return false
    } catch (err) {
      console.error("[Watch Tracking] Error starting watch session:", err)
      return false
    }
  }, [videoId])

  // تتبع تقدم المشاهدة
  const trackProgress = useCallback(async (progress: number) => {
    // تتبع فقط إذا تغير التقدم بنسبة 5% على الأقل
    if (Math.abs(progress - lastTrackedProgress.current) < 5 && progress < 85) {
      return
    }

    console.log('[Watch Tracking] Tracking progress:', progress.toFixed(2) + '%', 'Session:', sessionId)

    try {
      const response = await fetch('/api/video-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track',
          videoId,
          progress,
          sessionId
        })
      })

      const data = await response.json()
      console.log('[Watch Tracking] Progress track response:', data)
      
      if (data.success) {
        lastTrackedProgress.current = progress
        
        // إذا اكتمل الفيديو (85%)
        if (data.completed) {
          console.log('[Watch Tracking] Video completed! Remaining watches:', data.remainingWatches)
          
          const newRemainingWatches = data.remainingWatches || 0
          const newTimesWatched = (watchInfo?.timesWatched || 0) + 1
          
          setWatchInfo(prev => {
            const updated = prev ? {
              ...prev,
              timesWatched: newTimesWatched,
              remainingWatches: Math.max(0, newRemainingWatches),
              canWatch: newRemainingWatches > 0 || !prev.watchLimitEnabled
            } : null
            console.log('[Watch Tracking] Updated watch info:', updated)
            return updated
          })
          
          // إذا انتهت المشاهدات، أوقف الفيديو وأعد تحميل المعلومات
          if (newRemainingWatches <= 0 && watchInfo?.watchLimitEnabled) {
            console.log('[Watch Tracking] No more watches available! Stopping video...')
            
            // أوقف الفيديو
            if (videoRef.current) {
              videoRef.current.pause()
            }
            
            // أوقف التتبع
            setIsTracking(false)
            
            // أظهر تنبيه
            setTimeout(() => {
              alert('لقد انتهت مشاهداتك المتاحة لهذا الفيديو. سيتم إيقاف الفيديو الآن.')
              // أعد تحميل المعلومات لعرض رسالة الحد الأقصى
              fetchWatchInfo()
            }, 500)
          }
          
          if (onWatchComplete) {
            onWatchComplete()
          }
        }
      }
    } catch (err) {
      console.error("Error tracking progress:", err)
    }
  }, [videoId, sessionId, onWatchComplete, watchInfo, fetchWatchInfo])

  // معالج تحديث التقدم
  const handleProgressUpdate = useCallback(() => {
    if (!videoRef.current) return
    
    const video = videoRef.current
    if (!video.duration || isNaN(video.duration)) return
    
    const progress = (video.currentTime / video.duration) * 100
    
    setCurrentProgress(progress)
    
    // تتبع التقدم
    if (isTracking && progress > 0) {
      trackProgress(progress)
    }
  }, [isTracking, trackProgress])

  // تحميل معلومات المشاهدة عند التحميل
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const info = await fetchWatchInfo()
      setLoading(false)
      
      // إذا كان يمكن المشاهدة، ابدأ الجلسة
      if (info?.canWatch) {
        await startWatchSession()
      }
    }
    
    init()
  }, [fetchWatchInfo, startWatchSession])

  // إعداد تتبع التقدم
  useEffect(() => {
    if (!isTracking) return

    // تتبع التقدم كل 5 ثواني
    trackingInterval.current = setInterval(() => {
      handleProgressUpdate()
    }, 5000)

    // تتبع فوري عند البدء
    handleProgressUpdate()

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current)
      }
      // حفظ التقدم النهائي عند الخروج
      if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        const finalProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100
        if (finalProgress > 0) {
          trackProgress(finalProgress)
        }
      }
    }
  }, [isTracking, handleProgressUpdate, trackProgress])

  // عرض حالة التحميل
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

  // عرض الخطأ
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // التحقق من إمكانية المشاهدة
  if (!watchInfo?.canWatch) {
    const whatsappMessage = encodeURIComponent(
      `مرحباً ${teacherName || 'أستاذ'},\n\nأريد الحصول على مشاهدات إضافية للفيديو: ${videoTitle}\n\nلقد استنفذت جميع المشاهدات المتاحة (${watchInfo?.timesWatched || 0} من ${watchInfo?.maxAllowed || 3}).\n\nشكراً لك`
    )
    const whatsappUrl = teacherPhone 
      ? `https://wa.me/${teacherPhone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`
      : null

    return (
      <div className="space-y-4">
        {/* بطاقة رئيسية */}
        <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-destructive">
                انتهت مشاهداتك المتاحة
              </h3>
              <p className="text-sm text-muted-foreground">
                لقد شاهدت هذا الفيديو <span className="font-bold text-foreground">{watchInfo?.timesWatched || 0}</span> مرات 
                من أصل <span className="font-bold text-foreground">{watchInfo?.maxAllowed || 3}</span> مرات مسموحة
              </p>
            </div>

            {/* إحصائيات المشاهدة */}
            <div className="flex gap-4 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{watchInfo?.timesWatched || 0}</div>
                <div className="text-xs text-muted-foreground">مرات المشاهدة</div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{watchInfo?.maxAllowed || 3}</div>
                <div className="text-xs text-muted-foreground">الحد الأقصى</div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">0</div>
                <div className="text-xs text-muted-foreground">متبقي</div>
              </div>
            </div>

            {/* رسالة التواصل */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <p className="font-medium">تحتاج لمشاهدات إضافية؟</p>
                <p className="text-sm mt-1">
                  تواصل معنا على الواتساب للحصول على رصيد إضافي لمشاهدة هذا الفيديو
                </p>
              </AlertDescription>
            </Alert>

            {/* أزرار التواصل */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              {whatsappUrl ? (
                <Button 
                  asChild 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-5 w-5" />
                    تواصل عبر الواتساب
                  </a>
                </Button>
              ) : (
                <Alert className="w-full">
                  <Phone className="h-4 w-4" />
                  <AlertDescription>
                    يرجى التواصل مع المعلم للحصول على مشاهدات إضافية
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* معلومات إضافية */}
            <div className="text-xs text-muted-foreground pt-2 border-t w-full">
              <p className="mt-2">
                💡 نصيحة: احرص على مشاهدة الفيديو بالكامل في كل مرة للاستفادة القصوى
              </p>
            </div>
          </div>
        </div>

        {/* معاينة الفيديو المعطل */}
        <div className="relative rounded-lg overflow-hidden opacity-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">الفيديو مقفل</p>
            </div>
          </div>
          <div className="aspect-video bg-muted" />
        </div>
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

      {/* مشغل الفيديو */}
      <div className="relative">
        <SecureVideoPlayer
          source={videoUrl}
          title={videoTitle}
          watermarkText={watermarkText}
          antiDownload
          aspectRatio="16:9"
          onTimeUpdate={handleProgressUpdate}
          videoRef={(ref) => { videoRef.current = ref }}
        />
        
        {/* شريط التقدم */}
        {currentProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">التقدم:</span>
              <Progress value={currentProgress} className="flex-1" />
              <span className="text-xs font-medium">{Math.round(currentProgress)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* تنبيه عند اقتراب الحد */}
      {watchInfo && watchInfo.watchLimitEnabled && watchInfo.remainingWatches === 1 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            تنبيه: هذه آخر مشاهدة متاحة لك لهذا الفيديو. تأكد من مشاهدة الفيديو بالكامل.
          </AlertDescription>
        </Alert>
      )}

      {/* رسالة عند الوصول إلى 85% */}
      {currentProgress >= 85 && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            تم احتساب مشاهدة كاملة! لقد شاهدت أكثر من 85% من الفيديو.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
