"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
// import { Slider } from "@/components/ui/slider" // سيتم استخدامه في video-controls
// سيتم استخدام هذه في video-controls
import { cn } from "@/lib/utils"
import VideoControls from "./video-controls"
import { 
  Eye, 
  AlertCircle, 
  Lock, 
  MessageCircle, 
  PlayCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface VideoWatchInfo {
  videoId: string
  timesWatched: number
  maxAllowed: number
  remainingWatches: number
  canWatch: boolean
  lastWatchProgress: number
  watchLimitEnabled: boolean
}

export interface ProfessionalVideoPlayerProps {
  videoId: string
  videoUrl: string
  videoTitle: string
  videoDescription?: string
  teacherName?: string
  teacherPhone?: string
  watermarkText?: string
  onWatchComplete?: () => void
}

export default function ProfessionalVideoPlayer({
  videoId,
  videoUrl,
  videoTitle,
  videoDescription,
  teacherName,
  teacherPhone,
  watermarkText = "",
  onWatchComplete
}: ProfessionalVideoPlayerProps) {
  // Watch tracking states
  const [watchInfo, setWatchInfo] = useState<VideoWatchInfo | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  
  // Video player states
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const lastTrackedProgress = useRef(0)
  const trackingInterval = useRef<NodeJS.Timeout | null>(null)
  const [showResumeMessage, setShowResumeMessage] = useState(false)
  const [resumePosition, setResumePosition] = useState(0)

  // جلب معلومات المشاهدة
  const fetchWatchInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-tracking?videoId=${videoId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setWatchInfo(data.data)
        return data.data
      } else {
        setError("فشل في جلب معلومات المشاهدة")
        return null
      }
    } catch (err) {
      console.error("Error fetching watch info:", err)
      setError("حدث خطأ في جلب معلومات المشاهدة")
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
        setIsTracking(true)
        
        // استعادة آخر موضع مشاهدة
        if (data.lastPosition && data.lastPosition > 0) {
          console.log('[Resume] Restoring last position:', data.lastPosition, 'seconds')
          setResumePosition(data.lastPosition)
          setShowResumeMessage(true)
          
          // انتظر قليلاً حتى يتم تحميل الفيديو
          setTimeout(() => {
            if (videoRef.current && videoRef.current.duration) {
              videoRef.current.currentTime = data.lastPosition
              // إظهار رسالة للمستخدم
              const percentage = (data.lastPosition / videoRef.current.duration) * 100
              console.log(`[Resume] Resumed at ${percentage.toFixed(1)}%`)
              
              // إخفاء الرسالة بعد 3 ثواني
              setTimeout(() => {
                setShowResumeMessage(false)
              }, 3000)
            }
          }, 1000)
        }
        
        return true
      }
      return false
    } catch (err) {
      console.error("Error starting watch session:", err)
      return false
    }
  }, [videoId])

  // تتبع تقدم المشاهدة
  const trackProgress = useCallback(async (progress: number) => {
    if (Math.abs(progress - lastTrackedProgress.current) < 5 && progress < 85) {
      return
    }

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
      
      if (data.success) {
        lastTrackedProgress.current = progress
        
        if (data.completed) {
          const newRemainingWatches = data.remainingWatches || 0
          const newTimesWatched = (watchInfo?.timesWatched || 0) + 1
          
          setWatchInfo(prev => {
            const updated = prev ? {
              ...prev,
              timesWatched: newTimesWatched,
              remainingWatches: Math.max(0, newRemainingWatches),
              canWatch: newRemainingWatches > 0 || !prev.watchLimitEnabled
            } : null
            return updated
          })
          
          if (newRemainingWatches <= 0 && watchInfo?.watchLimitEnabled) {
            if (videoRef.current) {
              videoRef.current.pause()
            }
            setIsTracking(false)
            setTimeout(() => {
              fetchWatchInfo()
            }, 1000)
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
    
    setCurrentTime(video.currentTime)
    setDuration(video.duration)
    
    // تحديث البفر
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1)
      const bufferedProgress = (bufferedEnd / video.duration) * 100
      setBuffered(bufferedProgress)
    }
    
    if (isTracking && progress > 0) {
      trackProgress(progress)
    }
  }, [isTracking, trackProgress])

  // تحميل معلومات المشاهدة
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

  // إعداد تتبع التقدم
  useEffect(() => {
    if (!isTracking) return

    trackingInterval.current = setInterval(() => {
      handleProgressUpdate()
    }, 5000)

    handleProgressUpdate()

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current)
      }
      if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        const finalProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100
        if (finalProgress > 0) {
          trackProgress(finalProgress)
        }
      }
    }
  }, [isTracking, handleProgressUpdate, trackProgress])

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل الفيديو...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // عرض رسالة انتهاء المشاهدات
  if (!watchInfo?.canWatch) {
    const whatsappMessage = encodeURIComponent(
      `مرحباً ${teacherName || 'أستاذ'},\n\nأريد الحصول على مشاهدات إضافية للفيديو:\n${videoTitle}\n\nلقد استنفذت جميع المشاهدات المتاحة (${watchInfo?.timesWatched || 0} من ${watchInfo?.maxAllowed || 3}).\n\nشكراً لك`
    )
    // استخدام رقم WhatsApp الثابت للتواصل
    const whatsappPhone = '201503860035'
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`

    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-destructive/5">
          <div className="p-8">
            <div className="mx-auto max-w-2xl">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20 blur-xl" />
                  <div className="relative rounded-full bg-gradient-to-br from-destructive/10 to-destructive/20 p-4">
                    <Lock className="h-10 w-10 text-destructive" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text text-transparent">
                    انتهت مشاهداتك المتاحة
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    لقد وصلت للحد الأقصى المسموح به لمشاهدة هذا الفيديو
                  </p>
                </div>

                <Button 
                  asChild 
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                >
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-5 w-5" />
                    تواصل عبر WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const currentProgress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="space-y-4">
      {/* رسالة استئناف المشاهدة */}
      {showResumeMessage && resumePosition > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <PlayCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>تم استئناف المشاهدة</strong> من آخر موضع توقفت عنده ({Math.floor(resumePosition / 60)}:{Math.floor(resumePosition % 60).toString().padStart(2, '0')})
          </AlertDescription>
        </Alert>
      )}
      
      {/* إحصائيات المشاهدة */}
      {watchInfo && watchInfo.watchLimitEnabled && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 via-background to-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="font-bold">{watchInfo.timesWatched}</span>
                  <span className="text-muted-foreground"> / {watchInfo.maxAllowed}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  متبقي: <span className="font-bold">{watchInfo.remainingWatches}</span>
                </span>
              </div>
            </div>
            {watchInfo.remainingWatches === 1 && (
              <Badge variant="destructive" className="animate-pulse">
                آخر مشاهدة متاحة
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* المشغل مع الكنترولز */}
      <VideoControls
        videoRef={videoRef}
        containerRef={containerRef}
        videoUrl={videoUrl}
        videoId={videoId}
        watermarkText={watermarkText}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        isBuffering={isBuffering}
        setIsBuffering={setIsBuffering}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        showControls={showControls}
        setShowControls={setShowControls}
        onTimeUpdate={handleProgressUpdate}
        currentProgress={currentProgress}
      />
    </div>
  )
}
