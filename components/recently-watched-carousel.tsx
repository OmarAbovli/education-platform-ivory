"use client"

import { useRef } from "react"
import Link from "next/link"
import { Play, ChevronRight, ChevronLeft, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface RecentlyWatchedVideo {
  id: string
  title: string
  thumbnailUrl: string
  teacherName: string
  progress: number // 0-100
  lastWatchedAt: Date
}

interface Props {
  videos: RecentlyWatchedVideo[]
}

export function RecentlyWatchedCarousel({ videos }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (videos.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
    }
  }

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Continue Watching
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video) => (
          <Link 
            key={video.id} 
            href={`/watch/${video.id}`}
            className="group relative min-w-[280px] sm:min-w-[320px] aspect-video rounded-2xl overflow-hidden snap-start shadow-xl ring-1 ring-white/5 hover:ring-indigo-500/50 transition-all duration-300"
          >
            {/* Thumbnail */}
            <img 
              src={video.thumbnailUrl || "/course-thumbnail.png"} 
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Content Labels */}
            <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{video.teacherName}</p>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-200 transition-colors leading-snug">
                        {video.title}
                    </h3>
                </div>
            </div>

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-6 h-6 text-white fill-current" />
                </div>
            </div>

            {/* Progress Bar Container */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                <div 
                    className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.max(2, video.progress)}%` }}
                />
            </div>
            
            {/* Floating Percentage Badge */}
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-white/90 border border-white/10">
                {Math.round(video.progress)}% Watched
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
