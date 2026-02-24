"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { 
  PlayCircle,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  Gauge,
  PictureInPicture,
  Loader2,
  RotateCcw,
  FastForward,
  Rewind,
  Subtitles,
  Download,
  Share2
} from "lucide-react"

// Helper functions for HLS detection
function isHlsUrl(url: string) {
  return /\.m3u8(\?|#|$)/i.test(url)
}

function supportsNativeHls(video: HTMLVideoElement) {
  return Boolean(video.canPlayType("application/vnd.apple.mpegURL") || video.canPlayType("application/x-mpegURL"))
}

interface VideoControlsProps {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  containerRef: React.MutableRefObject<HTMLDivElement | null>
  videoUrl: string
  videoId?: string
  watermarkText?: string
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  currentTime: number
  duration: number
  buffered: number
  isBuffering: boolean
  setIsBuffering: (buffering: boolean) => void
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  showControls: boolean
  setShowControls: (show: boolean) => void
  onTimeUpdate: () => void
  currentProgress: number
}

// قائمة جودات الفيديو المتاحة
const qualityOptions = [
  { label: "1080p HD", value: "1080", bitrate: 5000 },
  { label: "720p HD", value: "720", bitrate: 2500 },
  { label: "480p", value: "480", bitrate: 1000 },
  { label: "360p", value: "360", bitrate: 500 },
  { label: "240p", value: "240", bitrate: 300 },
  { label: "تلقائي", value: "auto", bitrate: 0 }
]

// سرعات التشغيل
const playbackRates = [
  { label: "0.25x", value: 0.25 },
  { label: "0.5x", value: 0.5 },
  { label: "0.75x", value: 0.75 },
  { label: "عادي", value: 1 },
  { label: "1.25x", value: 1.25 },
  { label: "1.5x", value: 1.5 },
  { label: "1.75x", value: 1.75 },
  { label: "2x", value: 2 }
]

export default function VideoControls({
  videoRef,
  containerRef,
  videoUrl,
  videoId,
  watermarkText,
  isPlaying,
  setIsPlaying,
  currentTime,
  duration,
  buffered,
  isBuffering,
  setIsBuffering,
  isFullscreen,
  setIsFullscreen,
  showControls,
  setShowControls,
  onTimeUpdate,
  currentProgress
}: VideoControlsProps) {
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [quality, setQuality] = useState("auto")
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isPiP, setIsPiP] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hlsRef = useRef<any>(null)

  // التحكم في التشغيل
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [setIsPlaying])

  // التقديم والترجيع
  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, videoRef.current.duration))
  }, [])

  // إعادة التشغيل
  const restart = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.currentTime = 0
    videoRef.current.play()
    setIsPlaying(true)
  }, [setIsPlaying])

  // تغيير الصوت
  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return
    const newVolume = value[0]
    videoRef.current.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  // كتم الصوت
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    
    if (isMuted) {
      videoRef.current.volume = volume || 0.5
      setIsMuted(false)
    } else {
      videoRef.current.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume])

  // ملء الشاشة
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [setIsFullscreen])

  // Picture in Picture
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setIsPiP(false)
      } else {
        await videoRef.current.requestPictureInPicture()
        setIsPiP(true)
      }
    } catch (err) {
      console.error("PiP error:", err)
    }
  }, [])

  // تغيير سرعة التشغيل
  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return
    videoRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }, [])

  // البحث في الفيديو
  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current || !duration) return
    const newTime = (value[0] / 100) * duration
    videoRef.current.currentTime = newTime
  }, [duration])

  // إظهار/إخفاء الكنترولز
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
        setShowVolumeSlider(false)
      }
    }, 3000)
  }, [isPlaying, setShowControls])

  // تنسيق الوقت
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return
      
      switch(e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(5)
          break
        case 'j':
          e.preventDefault()
          skip(-10)
          break
        case 'l':
          e.preventDefault()
          skip(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          handleVolumeChange([Math.min(1, volume + 0.1)])
          break
        case 'ArrowDown':
          e.preventDefault()
          handleVolumeChange([Math.max(0, volume - 0.1)])
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case '0':
        case 'Home':
          e.preventDefault()
          restart()
          break
        case 'End':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = videoRef.current.duration
          }
          break
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          if (videoRef.current) {
            const percent = parseInt(e.key) * 10
            videoRef.current.currentTime = (videoRef.current.duration * percent) / 100
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [togglePlay, skip, handleVolumeChange, volume, toggleFullscreen, toggleMute, restart])

  // HLS Setup - دعم ملفات .m3u8 من Bunny CDN
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    const cleanupHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch (err) {
          console.error('HLS cleanup error:', err)
        }
        hlsRef.current = null
      }
    }

    const initVideo = async () => {
      try {
        cleanupHls()

        // Check if URL is HLS
        if (isHlsUrl(videoUrl)) {
          // Safari/iOS support native HLS
          if (supportsNativeHls(video)) {
            video.src = videoUrl
            await video.load?.()
            return
          }

          // Use hls.js for other browsers
          const { default: Hls } = await import('hls.js')
          if (Hls.isSupported()) {
            const hls = new Hls({
              lowLatencyMode: true,
              backBufferLength: 60,
            })
            hlsRef.current = hls

            hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
              if (data?.fatal) {
                console.error('HLS fatal error:', data)
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('Network error - attempting recovery')
                    hls.startLoad()
                    break
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('Media error - attempting recovery')
                    hls.recoverMediaError()
                    break
                  default:
                    console.log('Unrecoverable HLS error')
                    break
                }
              }
            })

            hls.loadSource(videoUrl)
            hls.attachMedia(video)
            return
          }

          // Fallback to native element
          video.src = videoUrl
          await video.load?.()
          return
        }

        // Non-HLS video (regular MP4)
        video.src = videoUrl
        await video.load?.()
      } catch (err) {
        console.error('Video initialization error:', err)
      }
    }

    initVideo()

    return () => {
      cleanupHls()
    }
  }, [videoUrl])

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        isFullscreen && "fixed inset-0 z-50 rounded-none"
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* الفيديو */}
      <video
        ref={videoRef}
        className="w-full h-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false)
          setShowControls(true)
        }}
        crossOrigin="anonymous"
        playsInline
        preload="metadata"
      />

      {/* العلامة المائية */}
      {watermarkText && (
        <div className="absolute top-4 right-4 text-white/20 text-xs pointer-events-none select-none font-mono">
          {watermarkText}
        </div>
      )}

      {/* مؤشر التحميل */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="bg-black/70 rounded-lg p-4 backdrop-blur">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        </div>
      )}

      {/* زر التشغيل الكبير */}
      {!isPlaying && !isBuffering && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 to-transparent transition-opacity hover:from-black/60"
        >
          <div className="rounded-full bg-white/10 backdrop-blur-sm p-6 transition-all hover:scale-110 hover:bg-white/20">
            <PlayCircle className="h-16 w-16 text-white drop-shadow-lg" />
          </div>
        </button>
      )}

      {/* الكنترولز */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-all duration-300",
        showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <div className="p-4 space-y-3">
          {/* شريط التقدم */}
          <div className="space-y-1">
            <div className="relative group/progress">
              {/* البفر */}
              <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/20" style={{ width: `${buffered}%` }} />
              </div>
              
              {/* السلايدر */}
              <Slider
                value={[currentProgress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="relative z-10 cursor-pointer"
              />
              
              {/* معاينة الوقت عند التمرير */}
              <div className="absolute -top-8 left-0 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/progress:opacity-100 pointer-events-none transition-opacity"
                style={{ left: `${currentProgress}%`, transform: 'translateX(-50%)' }}>
                {formatTime(currentTime)}
              </div>
            </div>
            
            {/* الوقت */}
            <div className="flex justify-between text-xs text-white/70">
              <span className="font-mono">{formatTime(currentTime)}</span>
              <span className="font-mono">{formatTime(duration)}</span>
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center justify-between gap-2">
            {/* الجانب الأيسر */}
            <div className="flex items-center gap-1">
              {/* تشغيل/إيقاف */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20 transition-colors"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{isPlaying ? 'إيقاف مؤقت (Space)' : 'تشغيل (Space)'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* إعادة التشغيل */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={restart}
                      className="text-white hover:bg-white/20 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>إعادة التشغيل</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* ترجيع 10 ثواني */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(-10)}
                      className="text-white hover:bg-white/20 transition-colors"
                    >
                      <Rewind className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>ترجيع 10 ثواني (J)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* ترجيع 5 ثواني */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(-5)}
                      className="text-white hover:bg-white/20 transition-colors"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>ترجيع 5 ثواني (←)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* تقديم 5 ثواني */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(5)}
                      className="text-white hover:bg-white/20 transition-colors"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>تقديم 5 ثواني (→)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* تقديم 10 ثواني */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(10)}
                      className="text-white hover:bg-white/20 transition-colors"
                    >
                      <FastForward className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>تقديم 10 ثواني (L)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* الصوت */}
              <div className="flex items-center gap-1"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : volume > 0.5 ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <Volume1 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{isMuted ? 'إلغاء الكتم (M)' : 'كتم الصوت (M)'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <div className={cn(
                  "overflow-hidden transition-all",
                  showVolumeSlider ? "w-24" : "w-0"
                )}>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.05}
                    className="w-24"
                  />
                </div>
              </div>

              {/* الوقت الحالي */}
              <div className="text-sm text-white/90 font-mono px-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* الجانب الأيمن */}
            <div className="flex items-center gap-1">
              {/* السرعة */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 gap-1"
                  >
                    <Gauge className="h-4 w-4" />
                    <span className="text-xs">{playbackRate}x</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/95 backdrop-blur-lg text-white border-white/10">
                  <DropdownMenuLabel>سرعة التشغيل</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {playbackRates.map(rate => (
                    <DropdownMenuItem
                      key={rate.value}
                      onClick={() => changePlaybackRate(rate.value)}
                      className={cn(
                        "hover:bg-white/20 cursor-pointer",
                        playbackRate === rate.value && "bg-white/10"
                      )}
                    >
                      {rate.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* الجودة */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 gap-1"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-xs">{quality === 'auto' ? 'تلقائي' : quality + 'p'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black/95 backdrop-blur-lg text-white border-white/10">
                  <DropdownMenuLabel>جودة الفيديو</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {qualityOptions.map(option => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setQuality(option.value)}
                      className={cn(
                        "hover:bg-white/20 cursor-pointer",
                        quality === option.value && "bg-white/10"
                      )}
                    >
                      <span className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        {option.bitrate > 0 && (
                          <span className="text-xs text-white/60 ml-2">
                            {option.bitrate}kbps
                          </span>
                        )}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Picture in Picture */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePiP}
                      className={cn(
                        "text-white hover:bg-white/20 transition-colors",
                        isPiP && "bg-white/20"
                      )}
                    >
                      <PictureInPicture className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>صورة داخل صورة</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* ملء الشاشة */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20 transition-colors"
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{isFullscreen ? 'خروج من ملء الشاشة (F)' : 'ملء الشاشة (F)'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
