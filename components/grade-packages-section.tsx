"use client"

import { useEffect, useState } from "react"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, GraduationCap, MessageCircle, Sparkles } from "lucide-react"
import RedeemCodeDialog from "@/components/redeem-code-dialog"

type GradeKey = 1 | 2 | 3

type ApiPackage = {
  id: string
  teacher_id: string
  name: string
  description: string | null
  price: number
  thumbnail_url: string | null
  grades: number[] | null
}

type GradeMeta = {
  label: string
  short: string
  accentClass: string
}

const WHATSAPP_PHONE = "201503860035"

const gradeMeta: Record<GradeKey, GradeMeta> = {
  1: {
    label: "First Secondary",
    short: "Grade 1",
    accentClass: "from-emerald-400 via-teal-300 to-sky-400",
  },
  2: {
    label: "Second Secondary",
    short: "Grade 2",
    accentClass: "from-sky-400 via-blue-400 to-violet-400",
  },
  3: {
    label: "Third Secondary",
    short: "Grade 3",
    accentClass: "from-violet-400 via-fuchsia-400 to-rose-400",
  },
}

type GradeState = {
  data: ApiPackage[] | null
  loading: boolean
  error: string | null
}

const initialGradeState: Record<GradeKey, GradeState> = {
  1: { data: null, loading: false, error: null },
  2: { data: null, loading: false, error: null },
  3: { data: null, loading: false, error: null },
}

function formatPrice(cents: number | null | undefined) {
  if (!cents || cents <= 0) {
    return "Free"
  }
  return (cents / 100).toLocaleString("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function makeWhatsAppUrl(pkgName: string, gradeLabel: string) {
  const text = `Hi, I would like to join the "${pkgName}" English package for ${gradeLabel} from El-Helal.`
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
}

export default function GradePackagesSection() {
  const [activeGrade, setActiveGrade] = useState<GradeKey>(1)
  const [state, setState] = useState<Record<GradeKey, GradeState>>(initialGradeState)

  async function loadGrade(grade: GradeKey) {
    setState((prev) => ({
      ...prev,
      [grade]: { ...prev[grade], loading: true, error: null },
    }))

    try {
      const res = await fetch(`/api/packages?grade=${grade}`)
      if (!res.ok) {
        throw new Error("Failed to load packages.")
      }
      const json = (await res.json()) as ApiPackage[]
      setState((prev) => ({
        ...prev,
        [grade]: { data: json, loading: false, error: null },
      }))
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        [grade]: {
          ...prev[grade],
          loading: false,
          error: error?.message || "Could not load packages.",
        },
      }))
    }
  }

  useEffect(() => {
    if (!state[1].data && !state[1].loading) {
      void loadGrade(1)
    }
  }, [])

  function handleSelectGrade(grade: GradeKey) {
    setActiveGrade(grade)
    if (!state[grade].data && !state[grade].loading) {
      void loadGrade(grade)
    }
  }

  const activeState = state[activeGrade]
  const meta = gradeMeta[activeGrade]

  return (
    <section className="relative py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-40 top-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl orbit-slow" />
        <div className="absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl orbit" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-[40%] bg-gradient-to-br from-emerald-500/10 via-cyan-400/5 to-fuchsia-500/10 blur-3xl pulse-soft" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 sm:px-4 lg:flex-row lg:items-start lg:gap-12">
        <div className="relative lg:flex-[0.85] xl:flex-[0.75] space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/40 dark:border-white/10 bg-slate-100/60 dark:bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-100/90 shadow-[0_0_0_1px_rgba(15,23,42,0.4)] backdrop-blur-xl">
            <Sparkles className="h-3 w-3" />
            English packages for high school
          </div>

          <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Choose your
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
              {" "}
              English journey
            </span>{" "}
            by grade.
          </h2>

          <p className="max-w-xl text-sm text-slate-700 dark:text-emerald-50/80">
            Each package groups videos, live sessions, and exam-style practice tailored to your grade. Pick your level,
            then talk to us on WhatsApp to unlock the full experience.
          </p>

          <div className="mt-4 grid max-w-md grid-cols-2 gap-3 text-xs text-slate-700 dark:text-emerald-50/80">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-white/5 px-3 py-2 shadow-[0_0_0_1px_rgba(16,185,129,0.45)] backdrop-blur-xl">
              <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-200" />
              <span>Grammar, vocabulary and exam skills</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-white/5 px-3 py-2 shadow-[0_0_0_1px_rgba(59,130,246,0.45)] backdrop-blur-xl">
              <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-200" />
              <span>Designed for Egyptian high school grades</span>
            </div>
          </div>
        </div>

        <div className="relative lg:flex-[1.15] xl:flex-[1.25] space-y-4 sm:space-y-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[1, 2, 3].map((grade) => {
              const g = grade as GradeKey
              const gMeta = gradeMeta[g]
              const isActive = activeGrade === g
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleSelectGrade(g)}
                  className={`group relative h-32 sm:h-36 lg:h-40 overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-br ${gMeta.accentClass
                    } p-[1px] shadow-[0_18px_60px_rgba(15,23,42,0.9)] transition-transform duration-500 hover:-translate-y-2 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${isActive ? "scale-[1.02]" : "scale-100 opacity-80"
                    }`}
                >
                  <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-950/70 text-center shadow-[0_0_0_1px_rgba(148,163,184,0.25)] backdrop-blur-2xl floating-card">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.35),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.35),transparent_55%)] opacity-70" />
                    <div className="pointer-events-none absolute -left-8 -top-10 h-20 w-20 rounded-full bg-white/10 blur-xl orbit" />
                    <div className="pointer-events-none absolute -right-10 -bottom-12 h-24 w-24 rounded-full bg-emerald-400/15 blur-xl orbit-reverse" />

                    <div className="relative flex flex-col items-center gap-1">
                      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-emerald-700 dark:text-emerald-100/80">
                        {gMeta.short}
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{gMeta.label}</p>
                      <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-600 dark:text-emerald-50/70 px-1">
                        Focused path for {gMeta.short.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-slate-950/80 p-2.5 sm:p-4 lg:p-5 shadow-[0_22px_80px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-emerald-500/20 via-emerald-400/10 to-transparent blur-3xl" />

            <div className="relative flex items-center justify-between gap-2 sm:gap-4">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Packages for {meta.label}</h3>
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-emerald-50/80">
                  Real packages priced in EGP. Tap to talk on WhatsApp.
                </p>
              </div>
              <div className="hidden items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 dark:bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-800 dark:text-emerald-100/90 shadow-inner backdrop-blur-xl sm:inline-flex">
                <MessageCircle className="mr-1 h-3 w-3" />
                <span>WhatsApp-first purchase</span>
              </div>
            </div>

            <div className="relative mt-3 sm:mt-4 lg:mt-5 grid grid-cols-1 gap-2.5 sm:gap-3 lg:gap-4 xl:gap-5 2xl:gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {activeState.loading && !activeState.data && (
                <div className="col-span-full flex items-center justify-center py-6 text-xs text-slate-600 dark:text-emerald-50/80">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-[2px] border-emerald-400/60 border-t-transparent" />
                  Loading packages for {meta.short}...
                </div>
              )}

              {activeState.error && !activeState.loading && (
                <p className="col-span-full text-xs text-rose-300/90">{activeState.error}</p>
              )}

              {activeState.data && activeState.data.length === 0 && !activeState.loading && !activeState.error && (
                <p className="col-span-full text-xs text-slate-600 dark:text-emerald-50/80">
                  No packages are currently configured for this grade.
                </p>
              )}

              {activeState.data?.map((pkg) => (
                <div key={pkg.id} className="h-full w-full">
                  <Card className="group relative flex h-full w-full flex-col overflow-hidden border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 via-slate-950/85 to-sky-500/15 text-emerald-50 shadow-[0_20px_70px_rgba(6,95,70,0.8)] backdrop-blur-2xl transition-transform duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(6,95,70,0.9)] gap-0 py-0">
                    <Link href={`/packages/${pkg.id}`} className="absolute inset-0 z-0">
                      <span className="sr-only">View Package {pkg.name}</span>
                    </Link>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.45),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.45),transparent_55%)] opacity-70" />
                    <CardContent className="relative z-10 flex flex-1 flex-col gap-2.5 sm:gap-3 p-2.5 sm:p-4 lg:p-5 pointer-events-none">
                      <div className="flex gap-2 sm:gap-3 pointer-events-auto">
                        {pkg.thumbnail_url && (
                          <div className="relative h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-400/40 bg-slate-900/80">
                            <img
                              src={pkg.thumbnail_url}
                              alt={pkg.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                          <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 min-w-0 w-full">
                            <div className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-slate-950/60 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.08em] sm:tracking-[0.12em] text-emerald-100/90 max-w-[65%] sm:max-w-[70%] overflow-hidden">
                              <span className="shrink-0">{meta.short}</span>
                              <span className="h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full bg-emerald-300 shrink-0" />
                              <span className="hidden sm:inline truncate">English package</span>
                              <span className="inline sm:hidden truncate">Eng</span>
                            </div>
                            <div className="rounded-xl bg-slate-950/80 px-1.5 py-0.5 text-right text-[10px] sm:text-[11px] text-emerald-100/90 shadow-inner shrink-0">
                              <div className="font-semibold leading-tight whitespace-nowrap">{formatPrice(pkg.price)}</div>
                              <div className="text-[9px] sm:text-[10px] leading-tight text-emerald-100/70 whitespace-nowrap">per package</div>
                            </div>
                          </div>

                          <h4 className="mt-0.5 sm:mt-1 text-sm lg:text-base font-semibold text-white leading-snug break-words line-clamp-2">{pkg.name}</h4>
                          {pkg.description && (
                            <p className="mt-0.5 text-[11px] lg:text-xs text-emerald-50/80 leading-relaxed break-words line-clamp-3">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-1 text-[10px] sm:text-[11px] lg:text-xs text-emerald-50/80 pointer-events-auto">
                        <span className="rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[9px] sm:text-[10px]">Listening</span>
                        <span className="rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[9px] sm:text-[10px]">Exam practice</span>
                        <span className="rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[9px] sm:text-[10px]">Grammar</span>
                      </div>

                      <div className="mt-1.5 sm:mt-2 lg:mt-3 flex flex-wrap gap-2 pointer-events-auto">
                        <Button
                          asChild
                          className="relative z-20 inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 text-xs lg:text-sm font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(15,23,42,0.35)] hover:from-emerald-400 hover:via-teal-300 hover:to-sky-300 hover:text-slate-950 lg:py-2.5"
                        >
                          <a href={makeWhatsAppUrl(pkg.name, meta.label)} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                            Talk on WhatsApp
                          </a>
                        </Button>
                        <div className="relative z-20 shrink-0">
                          <RedeemCodeDialog />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .orbit-slow {
          animation: orbit 18s ease-in-out infinite alternate;
        }
        .orbit {
          animation: orbit 14s ease-in-out infinite alternate;
        }
        .orbit-reverse {
          animation: orbit-reverse 16s ease-in-out infinite alternate;
        }
        .pulse-soft {
          animation: pulse-soft 20s ease-in-out infinite alternate;
        }
        .floating-card {
          animation: float-card 16s ease-in-out infinite alternate;
        }
        @keyframes orbit {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(10px, -12px, 0) rotate(3deg);
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
        }
        @keyframes orbit-reverse {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(-12px, 10px, 0) rotate(-3deg);
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
        }
        @keyframes pulse-soft {
          0% {
            transform: translate3d(-6px, 4px, 0) scale(1);
            opacity: 0.45;
          }
          50% {
            transform: translate3d(4px, -6px, 0) scale(1.06);
            opacity: 0.85;
          }
          100% {
            transform: translate3d(-6px, 4px, 0) scale(1);
            opacity: 0.45;
          }
        }
        @keyframes float-card {
          0% {
            transform: translate3d(0, 0, 0) rotateX(8deg) rotateY(-8deg);
          }
          50% {
            transform: translate3d(0, -8px, 0) rotateX(12deg) rotateY(-4deg);
          }
          100% {
            transform: translate3d(0, 0, 0) rotateX(8deg) rotateY(-8deg);
          }
        }
      `}</style>
    </section>
  )
}
