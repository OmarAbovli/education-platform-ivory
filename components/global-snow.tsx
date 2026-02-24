"use client"

import Snowfall from "react-snowfall"
import { usePathname } from "next/navigation"
import { useRef, useState, useEffect } from "react"
import { Volume2, VolumeX } from "lucide-react"

// A gentle winter ambient loop (Placeholder)
// Replacing with a known working raw file or similar. 
const WINTER_AUDIO_URL = "https://www.orangefreesounds.com/wp-content/uploads/2014/12/Jingle-Bells.mp3"

export function GlobalSnow({ enabled }: { enabled: boolean }) {
  const pathname = usePathname()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Don't show on teacher dashboard to keep it professional/clean for work
  // Show on login, home, student pages
  const isTeacherPage = pathname?.startsWith("/teacher")

  const shouldShow = enabled && !isTeacherPage

  // Mounted check to avoid hydration mismatch with localStorage if we were persisting state
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!shouldShow || !audioRef.current) {
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
      return
    }

    const audio = audioRef.current
    audio.volume = 0.15 // Very low volume by default

    // Try to auto-play
    const playPromise = audio.play()

    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(error => {
          // Auto-play was prevented by browser policy
          console.log("Audio autoplay prevented by browser:", error)
          setIsPlaying(false)
        })
    }
  }, [shouldShow])

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.volume = 0.15
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error)
    }
  }

  if (!shouldShow || !isClient) return null

  return (
    <>
      {/* Snow Container - Click through */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <Snowfall
          style={{
            position: 'fixed',
            width: '100vw',
            height: '100vh',
          }}
          snowflakeCount={150}
          radius={[0.5, 2.5]}
          speed={[0.5, 2.5]}
          wind={[-0.5, 1.5]}
          color="#fff"
          opacity={[0.2, 0.4]}
        />
      </div>

      <audio
        ref={audioRef}
        src={WINTER_AUDIO_URL}
        loop
        preload="auto"
      />

      {/* Audio Toggle Button - high z-index, clickable */}
      {/* Audio Toggle Button - high z-index, clickable, slightly raised to avoid other widgets */}
      <button
        onClick={toggleAudio}
        className="fixed bottom-20 left-4 z-[9999] flex items-center gap-3 rounded-full bg-slate-900/90 py-2 px-4 text-slate-200 shadow-2xl ring-2 ring-emerald-500/50 backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white hover:scale-105 active:scale-95"
        title={isPlaying ? "Mute Winter Sounds" : "Play Winter Sounds"}
      >
        {isPlaying ? <Volume2 className="h-5 w-5 text-emerald-400" /> : <VolumeX className="h-5 w-5 text-slate-400" />}
        <span className="text-sm font-semibold">{isPlaying ? "On" : "Off"}</span>
        <span className="sr-only">Toggle Audio</span>
      </button>
    </>
  )
}
