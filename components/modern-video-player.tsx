"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Eye, 
  AlertCircle, 
  Lock, 
  MessageCircle, 
  PlayCircle,
  PauseCircle,
  Volume2,
  VolumeX,
  Maximize,
  SkipForward,
  SkipBack,
  Settings,
  Download,
  Share2,
  Heart,
  Clock,
  TrendingUp,
  Award,
  Zap,
  Shield,
  CheckCircle2
} from "lucide-react"
import SecureVideoPlayer from "./secure-video-player"
import { cn } from "@/lib/utils"

interface VideoWatchInfo {
  videoId: string
  timesWatched: number
  maxAllowed: number
  remainingWatches: number
  canWatch: boolean
  lastWatchProgress: number
  watchLimitEnabled: boolean
}

interface ModernVideoPlayerProps {
  videoId: string
  videoUrl: string
  videoTitle: string
  videoDescription?: string
  teacherName?: string
  teacherPhone?: string
  watermarkText?: string
  onWatchComplete?: () => void
}

export default function ModernVideoPlayer({
  videoId,
  videoUrl,
  videoTitle,
  videoDescription,
  teacherName,
  teacherPhone,
  watermarkText = "",
  onWatchComplete
}: ModernVideoPlayerProps) {
  const [watchInfo, setWatchInfo] = useState<VideoWatchInfo | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [isTracking, setIsTracking] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastTrackedProgress = useRef(0)
  const trackingInterval = useRef<NodeJS.Timeout | null>(null)

  // جلب معلومات المشاهدة
  const fetchWatchInfo = useCallback(async () => {
    try {
      console.log('[Modern Player] Fetching watch info for video:', videoId)
      const response = await fetch(`/api/video-tracking?videoId=${videoId}`)
      const data = await response.json()
      console.log('[Modern Player] Watch info response:', data)
      
      if (data.success && data.data) {
        setWatchInfo(data.data)
        return data.data
      } else {
        setError("فشل في جلب معلومات المشاهدة")
        return null
      }
    } catch (err) {
      console.error("[Modern Player] Error fetching watch info:", err)
      setError("حدث خطأ في جلب معلومات المشاهدة")
      return null
    }
  }, [videoId])

  // بدء جلسة المشاهدة
  const startWatchSession = useCallback(async () => {
    try {
      console.log('[Modern Player] Starting watch session for video:', videoId)
      const response = await fetch('/api/video-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          videoId
        })
      })

      const data = await response.json()
      console.log('[Modern Player] Session start response:', data)
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId)
        setIsTracking(true)
        return true
      }
      return false
    } catch (err) {
      console.error("[Modern Player] Error starting watch session:", err)
      return false
    }
  }, [videoId])

  // تتبع تقدم المشاهدة
  const trackProgress = useCallback(async (progress: number) => {
    if (Math.abs(progress - lastTrackedProgress.current) < 5 && progress < 85) {
      return
    }

    console.log('[Modern Player] Tracking progress:', progress.toFixed(2) + '%', 'Session:', sessionId)

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
      console.log('[Modern Player] Progress track response:', data)
      
      if (data.success) {
        lastTrackedProgress.current = progress
        
        if (data.completed) {
          console.log('[Modern Player] Video completed! Remaining watches:', data.remainingWatches)
          
          const newRemainingWatches = data.remainingWatches || 0
          const newTimesWatched = (watchInfo?.timesWatched || 0) + 1
          
          setWatchInfo(prev => {
            const updated = prev ? {
              ...prev,
              timesWatched: newTimesWatched,
              remainingWatches: Math.max(0, newRemainingWatches),
              canWatch: newRemainingWatches > 0 || !prev.watchLimitEnabled
            } : null
            console.log('[Modern Player] Updated watch info:', updated)
            return updated
          })
          
          if (newRemainingWatches <= 0 && watchInfo?.watchLimitEnabled) {
            console.log('[Modern Player] No more watches available! Stopping video...')
            
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
    
    setCurrentProgress(progress)
    setCurrentTime(video.currentTime)
    setDuration(video.duration)
    
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

  // تنسيق الوقت
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // حساب النسبة المئوية للإنجاز
  const getCompletionStatus = () => {
    if (!watchInfo?.watchLimitEnabled) return null
    const percentage = ((watchInfo?.timesWatched || 0) / (watchInfo?.maxAllowed || 1)) * 100
    return Math.min(100, percentage)
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <PlayCircle className="absolute inset-0 m-auto h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">جاري تحميل الفيديو...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="text-sm">{error}</AlertDescription>
      </Alert>
    )
  }

  // عرض رسالة انتهاء المشاهدات
  if (!watchInfo?.canWatch) {
    const whatsappMessage = encodeURIComponent(
      `مرحباً ${teacherName || 'أستاذ'},\n\nأريد الحصول على مشاهدات إضافية للفيديو:\n${videoTitle}\n\nلقد استنفذت جميع المشاهدات المتاحة (${watchInfo?.timesWatched || 0} من ${watchInfo?.maxAllowed || 3}).\n\nشكراً لك`
    )
    const whatsappUrl = teacherPhone 
      ? `https://wa.me/${teacherPhone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`
      : null

    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-destructive/5">
          <div className="p-8">
            <div className="mx-auto max-w-2xl">
              {/* Header */}
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

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                  <Card className="border-destructive/20 bg-destructive/5">
                    <div className="p-4 text-center">
                      <div className="text-3xl font-bold text-destructive">{watchInfo?.timesWatched || 0}</div>
                      <div className="text-xs text-muted-foreground mt-1">مشاهدة</div>
                    </div>
                  </Card>
                  <Card className="border-muted">
                    <div className="p-4 text-center">
                      <div className="text-3xl font-bold text-muted-foreground">{watchInfo?.maxAllowed || 3}</div>
                      <div className="text-xs text-muted-foreground mt-1">الحد الأقصى</div>
                    </div>
                  </Card>
                  <Card className="border-destructive/20 bg-destructive/5">
                    <div className="p-4 text-center">
                      <div className="text-3xl font-bold text-destructive">0</div>
                      <div className="text-xs text-muted-foreground mt-1">متبقي</div>
                    </div>
                  </Card>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>استهلاك المشاهدات</span>
                    <span>100%</span>
                  </div>
                  <Progress value={100} className="h-2 bg-destructive/10" />
                </div>

                {/* CTA Section */}
                <Card className="w-full border-blue-200/50 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
                        <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-blue-900 dark:text-blue-100">
                          احصل على مشاهدات إضافية
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                          تواصل معنا الآن للحصول على رصيد إضافي ومتابعة التعلم
                        </p>
                      </div>
                    </div>
                    
                    {whatsappUrl && (
                      <Button 
                        asChild 
                        size="lg"
                        className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg"
                      >
                        <a 
                          href={whatsappUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="h-5 w-5" />
                          تواصل عبر WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Tips */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>نظام الحماية يضمن جودة التعلم وحقوق المحتوى</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Video Preview Locked */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60 z-10 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="rounded-full bg-background/90 backdrop-blur p-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">الفيديو مقفل</p>
                <p className="text-sm text-muted-foreground">تحتاج لرصيد إضافي للمشاهدة</p>
              </div>
            </div>
          </div>
          <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted/30" />
        </Card>
      </div>
    )
  }

  // عرض المشغل العادي
  return (
    <div className="space-y-6">
      {/* Player Stats Bar */}
      {watchInfo && watchInfo.watchLimitEnabled && (
        <Card className="border-primary/10 bg-gradient-to-r from-primary/5 via-background to-primary/5">
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                {/* Watch Count */}
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المشاهدات</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">{watchInfo.timesWatched}</span>
                      <span className="text-sm text-muted-foreground">/ {watchInfo.maxAllowed}</span>
                    </div>
                  </div>
                </div>

                {/* Remaining */}
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">متبقي</p>
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-lg font-bold",
                        watchInfo.remainingWatches <= 1 ? "text-destructive" : "text-green-600 dark:text-green-400"
                      )}>
                        {watchInfo.remainingWatches}
                      </span>
                      <span className="text-sm text-muted-foreground">مشاهدة</span>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">التقدم</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(currentProgress)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion Badge */}
              {getCompletionStatus() !== null && (
                <div className="flex items-center gap-2">
                  <Progress value={getCompletionStatus()} className="w-24 h-2" />
                  <Badge 
                    variant={watchInfo.remainingWatches <= 1 ? "destructive" : "secondary"}
                    className="gap-1"
                  >
                    <Award className="h-3 w-3" />
                    {Math.round(getCompletionStatus())}%
                  </Badge>
                </div>
              )}
            </div>

            {/* Warning for last watch */}
            {watchInfo.remainingWatches === 1 && (
              <Alert className="mt-4 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <strong>تنبيه:</strong> هذه آخر مشاهدة متاحة لك. احرص على مشاهدة الفيديو بالكامل للاستفادة القصوى.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Main Video Player */}
      <Card className="overflow-hidden">
        <div className="relative bg-black">
          <SecureVideoPlayer
            source={videoUrl}
            title={videoTitle}
            watermarkText={watermarkText}
            antiDownload
            aspectRatio="16:9"
            onTimeUpdate={handleProgressUpdate}
            videoRef={(ref) => { 
              videoRef.current = ref
              if (ref) {
                ref.addEventListener('play', () => setIsPlaying(true))
                ref.addEventListener('pause', () => setIsPlaying(false))
              }
            }}
          />
          
          {/* Custom Progress Bar Overlay */}
          {currentProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/80">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <Progress value={currentProgress} className="h-1 bg-white/20" />
              </div>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{videoTitle}</h1>
            {videoDescription && (
              <p className="text-muted-foreground">{videoDescription}</p>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {teacherName && (
                <Badge variant="secondary" className="gap-1">
                  <Award className="h-3 w-3" />
                  {teacherName}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(duration)}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Achievement notification */}
      {currentProgress >= 85 && (
        <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>أحسنت!</strong> لقد شاهدت أكثر من 85% من الفيديو وتم احتساب مشاهدة كاملة.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
