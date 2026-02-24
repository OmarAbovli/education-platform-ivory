import { getLeaderboard, getStudentXPStatus } from "@/server/xp-actions"
import SiteHeader from "@/components/site-header"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Medal, Star, TrendingUp, Users } from "lucide-react"

export default async function LeaderboardPage({ searchParams }: { searchParams: { grade?: string } }) {
    const selectedGrade = searchParams.grade ? parseInt(searchParams.grade) : undefined
    const { leaderboard = [] } = await getLeaderboard({ grade: selectedGrade, limit: 100 })
    const currentUserStatus = await getStudentXPStatus(undefined, selectedGrade)

    const topThree = leaderboard.slice(0, 3)
    const others = leaderboard.slice(3)

    return (
        <main className="min-h-screen bg-muted/30">
            <SiteHeader />

            <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-8">
                {/* Header Section */}
                <div className="text-center space-y-2 py-4">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                        لوحة الشرف (Leaderboard)
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        تحدَّ زملائك، اجمع النقاط (XP)، وكن بطل منصة الهلال!
                    </p>
                </div>

                {/* Grade Filter */}
                <div className="flex justify-center gap-2">
                    {[undefined, 1, 2, 3].map((g) => (
                        <a
                            key={g || 'all'}
                            href={g ? `/student/leaderboard?grade=${g}` : '/student/leaderboard'}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${(selectedGrade === g)
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-background hover:bg-muted'
                                }`}
                        >
                            {g ? `الصف ${g}` : 'الكل'}
                        </a>
                    ))}
                </div>

                {/* Podium for Top 3 */}
                <div className="grid grid-cols-3 gap-4 pb-12 pt-8 items-end max-w-2xl mx-auto">
                    {/* 2nd Place */}
                    {topThree[1] && (
                        <div className="flex flex-col items-center space-y-3 group transition-transform hover:-translate-y-1">
                            <div className="relative">
                                <Avatar className="h-16 w-16 border-4 border-slate-300 shadow-xl">
                                    <AvatarImage src={topThree[1].avatar_url} />
                                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">{topThree[1].name?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 bg-slate-400 text-white rounded-full p-1.5 shadow-lg">
                                    <Medal className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-sm truncate w-24">{topThree[1].name}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-tighter">LVL {topThree[1].level}</p>
                            </div>
                            <div className="w-full bg-slate-200 h-24 rounded-t-xl flex flex-col justify-center items-center">
                                <span className="text-slate-600 font-black text-2xl italic">2nd</span>
                                <Badge variant="outline" className="text-[10px] mt-1 bg-white/50 text-slate-700 font-bold border-slate-300">{topThree[1].xp} XP</Badge>
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {topThree[0] && (
                        <div className="flex flex-col items-center space-y-3 group transition-transform hover:-translate-y-2">
                            <div className="relative">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                                    <Trophy className="h-8 w-8 text-yellow-500" />
                                </div>
                                <Avatar className="h-24 w-24 border-4 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                                    <AvatarImage src={topThree[0].avatar_url} />
                                    <AvatarFallback className="bg-yellow-50 text-yellow-700 font-bold text-xl">{topThree[0].name?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-3 -right-3 bg-yellow-500 text-white rounded-full p-2 shadow-lg">
                                    <Star className="h-5 w-5 fill-current" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-black text-base truncate w-32">{topThree[0].name}</p>
                                <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Level {topThree[0].level}</p>
                            </div>
                            <div className="w-full bg-yellow-400 h-36 rounded-t-2xl flex flex-col justify-center items-center shadow-lg border-x border-t border-yellow-300">
                                <span className="text-white font-black text-4xl italic drop-shadow-md">1st</span>
                                <Badge className="mt-2 bg-white text-yellow-600 font-bold">{topThree[0].xp} XP</Badge>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {topThree[2] && (
                        <div className="flex flex-col items-center space-y-3 group transition-transform hover:-translate-y-1">
                            <div className="relative">
                                <Avatar className="h-16 w-16 border-4 border-amber-600 shadow-xl">
                                    <AvatarImage src={topThree[2].avatar_url} />
                                    <AvatarFallback className="bg-amber-50 text-amber-700 font-bold">{topThree[2].name?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 bg-amber-700 text-white rounded-full p-1.5 shadow-lg">
                                    <Medal className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-sm truncate w-24">{topThree[2].name}</p>
                                <p className="text-xs text-amber-600 uppercase tracking-tighter">LVL {topThree[2].level}</p>
                            </div>
                            <div className="w-full bg-amber-200 h-20 rounded-t-xl flex flex-col justify-center items-center">
                                <span className="text-amber-700 font-black text-2xl italic">3rd</span>
                                <Badge variant="outline" className="text-[10px] mt-1 bg-white/50 text-amber-800 font-bold border-amber-400">{topThree[2].xp} XP</Badge>
                            </div>
                        </div>
                    )}
                </div>

                {/* Others Table */}
                <Card className="border-none shadow-xl bg-background/50 backdrop-blur overflow-hidden">
                    <CardHeader className="border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                الترتيب العام (باقي المتسابقين)
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">{leaderboard.length} مُتعلّم</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <div className="divide-y">
                                {others.map((p, idx) => (
                                    <div key={p.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-black text-muted-foreground w-6">{idx + 4}</span>
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={p.avatar_url} />
                                                <AvatarFallback>{p.name?.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-sm">{p.name}</p>
                                                <p className="text-[10px] text-muted-foreground">الصف {p.grade} • Level {p.level}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-primary">{p.xp}</p>
                                            <p className="text-[10px] uppercase text-muted-foreground tracking-widest">XP</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Current User Floating Status (if logged in as student) */}
                {currentUserStatus && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-5">
                        <Card className="bg-primary text-primary-foreground shadow-2xl border-none">
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                                        #{currentUserStatus.rank || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">مركزك الحالي</p>
                                        <p className="text-[10px] text-white/70">تفاعل أكثر لترفع مستواك!</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                    <div>
                                        <p className="text-lg font-black">{currentUserStatus.xp}</p>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-white/70">Points</p>
                                    </div>
                                    <div className="h-10 w-1 bg-white/20 rounded-full" />
                                    <div>
                                        <p className="text-lg font-black">{currentUserStatus.level}</p>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-white/70">Level</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            <div className="h-24" /> {/* Spacer for floating status */}
        </main>
    )
}
