"use client"

import { useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"

function usePrefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false
}

export function HomeHeroFX({
  ctaPrimaryHref = "/teachers",
  ctaSecondaryHref = "/login",
}: {
  ctaPrimaryHref?: string
  ctaSecondaryHref?: string
}) {
  const reduce = usePrefersReducedMotion()
  const sceneRef = useRef<HTMLDivElement | null>(null)
  const layer1Ref = useRef<HTMLDivElement | null>(null)
  const layer2Ref = useRef<HTMLDivElement | null>(null)
  const layer3Ref = useRef<HTMLDivElement | null>(null)

  // Generate a sparkle field
  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => i), [])
  const confetti = useMemo(() => Array.from({ length: 30 }, (_, i) => i), [])

  useEffect(() => {
    if (reduce) return
    const scene = sceneRef.current
    const l1 = layer1Ref.current
    const l2 = layer2Ref.current
    const l3 = layer3Ref.current
    if (!scene || !l1 || !l2 || !l3) return

    const onMove = (e: MouseEvent) => {
      const rect = scene.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      l1.style.transform = `translate(${x * 12}px, ${y * 12}px) scale(1.02)`
      l2.style.transform = `translate(${x * -18}px, ${y * -18}px) scale(1.03)`
      l3.style.transform = `translate(${x * 8}px, ${y * -6}px)`
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [reduce])

  return (
    <div ref={sceneRef} className="relative h-screen w-full overflow-hidden">
      {/* Background animated gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        aria-hidden
        style={{
          background:
            "radial-gradient(1000px 500px at 20% 10%, rgba(16,185,129,0.28), transparent 60%), radial-gradient(1000px 500px at 80% 20%, rgba(45,212,191,0.24), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
        }}
      />

      {/* Layered blobs */}
      <div
        ref={layer1Ref}
        className="absolute -left-24 -top-28 h-[520px] w-[520px] rounded-[45%_55%_60%_40%/45%_45%_55%_55%] bg-emerald-200/60 blur-3xl"
        style={{
          animation: reduce ? undefined : "blobMorph 12s ease-in-out infinite",
        }}
      />
      <div
        ref={layer2Ref}
        className="absolute -right-24 top-10 h-[420px] w-[420px] rounded-[45%_55%_60%_40%/45%_45%_55%_55%] bg-teal-200/60 blur-3xl"
        style={{
          animation: reduce ? undefined : "blobMorphAlt 14s ease-in-out infinite",
        }}
      />
      <div
        ref={layer3Ref}
        className="absolute bottom-[-120px] left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl"
        style={{
          animation: reduce ? undefined : "pulseGlow 8s ease-in-out infinite",
        }}
      />

      {/* Sparkles */}
      <div className="absolute inset-0 -z-10">
        {stars.map((i) => {
          const top = Math.random() * 100
          const left = Math.random() * 100
          const size = Math.random() * 2 + 1
          const delay = Math.random() * 4
          const duration = 3 + Math.random() * 3
          return (
            <span
              key={i}
              className="absolute rounded-full bg-emerald-400/70 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                animation: reduce ? undefined : `twinkle ${duration}s ease-in-out ${delay}s infinite alternate`,
              }}
            />
          )
        })}
      </div>

      {/* Confetti gently floating up */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {confetti.map((i) => {
          const left = Math.random() * 100
          const time = 8 + Math.random() * 10
          const delay = Math.random() * 5
          const rot = Math.random() * 360
          const colors = ["#10b981", "#14b8a6", "#34d399", "#99f6e4"]
          const color = colors[i % colors.length]
          const size = 6 + Math.round(Math.random() * 8)
          return (
            <span
              key={i}
              className="absolute block"
              style={{
                left: `${left}%`,
                bottom: "-30px",
                width: size,
                height: size,
                background: color,
                transform: `rotate(${rot}deg)`,
                clipPath: i % 2 ? "polygon(0 0, 100% 0, 100% 70%, 0 100%)" : "polygon(0 30%, 100% 0, 80% 100%, 0 80%)",
                animation: reduce ? undefined : `rise ${time}s linear ${delay}s infinite`,
              }}
            />
          )
        })}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
          <div className="rounded-full border bg-white/70 px-3 py-1 text-xs text-emerald-700 shadow-sm backdrop-blur">
            Built for curious minds — from first day to finals
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Spark curiosity. Build confidence.
          </h1>
          <p className="mx-auto max-w-lg text-pretty text-sm text-slate-600">
            Fun meets focus: lessons, quests, and live sessions that keep you hooked while you learn.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={ctaPrimaryHref}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Explore Teachers</Button>
            </a>
            <a href={ctaSecondaryHref}>
              <Button variant="outline" className="border-emerald-300 text-emerald-700 bg-transparent">
                Login
              </Button>
            </a>
          </div>
          <div className="mt-2 flex gap-2 text-[11px] text-emerald-700/80">
            <span className="rounded-full border border-emerald-300/70 bg-white/60 px-2 py-0.5 shadow-sm">
              Daily streaks
            </span>
            <span className="rounded-full border border-emerald-300/70 bg-white/60 px-2 py-0.5 shadow-sm">Rewards</span>
            <span className="rounded-full border border-emerald-300/70 bg-white/60 px-2 py-0.5 shadow-sm">Quests</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-xs text-slate-500">
        Scroll to explore
      </div>

      {/* Local keyframes */}
      <style>
        {`
          @keyframes blobMorph {
            0% { border-radius: 45% 55% 60% 40% / 45% 45% 55% 55%; transform: scale(1); }
            50% { border-radius: 60% 40% 50% 50% / 40% 60% 40% 60%; transform: scale(1.05); }
            100% { border-radius: 45% 55% 60% 40% / 45% 45% 55% 55%; transform: scale(1); }
          }
          @keyframes blobMorphAlt {
            0% { border-radius: 55% 45% 40% 60% / 55% 55% 45% 45%; transform: scale(1); }
            50% { border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%; transform: scale(1.06); }
            100% { border-radius: 55% 45% 40% 60% / 55% 55% 45% 45%; transform: scale(1); }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.9; }
          }
          @keyframes twinkle {
            0% { opacity: 0.4; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes rise {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            100% { transform: translateY(-120vh) rotate(360deg); opacity: 0; }
          }
        `}
      </style>
    </div>
  )
}
