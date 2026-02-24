"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Trophy, Zap } from "lucide-react"
import { motion } from "framer-motion"

interface XPProgressCardProps {
    xp: number
    level: number
    percentage: number
    nextLevelXP: number
    streakCount?: number
    rank?: number
}

const getLevelName = (level: number) => {
    if (level >= 50) return "أسطى اللغة"
    if (level >= 30) return "نابغة الهلال"
    if (level >= 20) return "خبير تعليمي"
    if (level >= 10) return "طالب متميز"
    if (level >= 5) return "طالب مجتهد"
    return "مبتدئ طموح"
}

export function XPProgressCard({ xp, level, percentage, nextLevelXP, streakCount = 0, rank }: XPProgressCardProps) {
    const levelName = getLevelName(level)

    return (
        <Card className="overflow-hidden border-none shadow-2xl bg-[#0f172a] text-white relative group">
            {/* Dynamic Background Gradient Blob */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full group-hover:bg-indigo-500/30 transition-colors duration-700" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-600/10 blur-[100px] rounded-full group-hover:bg-pink-500/20 transition-colors duration-700" />

            <CardContent className="p-0 relative z-10">
                <div className="flex flex-col lg:flex-row">
                    {/* Left Section: Level & Badge */}
                    <div className="p-6 flex flex-col items-center justify-center bg-white/5 border-b lg:border-b-0 lg:border-r border-white/10 min-w-[200px] backdrop-blur-sm">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse" />
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl border border-white/20 relative z-10 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                <span className="text-4xl font-black italic tracking-tighter">{level}</span>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300 mb-1">المرحلة الحالية</p>
                            <h2 className="text-xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{levelName}</h2>
                        </div>
                    </div>

                    {/* Middle Section: Progress */}
                    <div className="p-6 flex-1 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                    <span className="text-2xl font-black tabular-nums">{xp.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">XP Total</span>
                                </div>
                                <p className="text-xs text-white/50 font-medium">
                                    يتبقى لك <span className="text-white font-bold">{Math.round(nextLevelXP - xp)} XP</span> للوصول للمستوى التالي
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">الترتيب</p>
                                    <p className="text-lg font-black text-emerald-400">#{rank || '--'}</p>
                                </div>
                                <div className="h-8 w-px bg-white/10 mx-2" />
                                <div className="flex flex-col items-end">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">السلسلة</p>
                                    <p className="text-lg font-black text-orange-500">🔥 {streakCount}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="relative h-4 w-full bg-white/5 rounded-full p-1 border border-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative"
                                >
                                    {/* Scanline effect on progress */}
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] w-20 animate-[shimmer_2s_infinite]" />
                                </motion.div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                <span>LVL {level}</span>
                                <span>LVL {level + 1}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>

            <style jsx global>{`
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(500%); }
                }
            `}</style>
        </Card>
    )
}
