"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBunnyConfig, saveBunnyConfig, saveBunnyAccountKey, listBunnyLibraries } from "@/server/bunny-actions"
import { getSnowSetting, toggleSnowSetting, updateTeacherSelf, getTeacherUser } from "@/server/teacher-actions"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
    Loader2, 
    Sparkles, 
    Brain, 
    Code, 
    CheckCircle2, 
    Info,
    Lightbulb
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Manual / Specific Lib Config
    const [apiKey, setApiKey] = useState("")
    const [libraryId, setLibraryId] = useState("")

    // Account Level Config
    const [mainKey, setMainKey] = useState("")
    const [libraries, setLibraries] = useState<{ id: number, name: string, apiKey: string }[]>([])
    const [fetchingLibs, setFetchingLibs] = useState(false)

    // AI Settings
    const [geminiKey, setGeminiKey] = useState("")
    const [isKeySaved, setIsKeySaved] = useState(false)
    const [savingAi, setSavingAi] = useState(false)

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const bunRes = await getBunnyConfig()
                if (bunRes) {
                    if (bunRes.apiKey) setApiKey(bunRes.apiKey)
                    if (bunRes.libraryId) setLibraryId(bunRes.libraryId)
                    if (bunRes.mainKey) setMainKey(bunRes.mainKey)
                }

                // Fetch AI Config via Server Action
                const user = await getTeacherUser()
                if (user?.gemini_api_key) {
                    setGeminiKey(user.gemini_api_key)
                    setIsKeySaved(true)
                }
            } catch (err) {
                console.error("Failed to load settings:", err)
            } finally {
                setLoading(false)
            }
        }

        loadConfig()
    }, [])

    async function handleFetchLibraries() {
        if (!mainKey) return toast.error("Enter Account API Key first")
        setFetchingLibs(true)
        await saveBunnyAccountKey(mainKey)

        const res = await listBunnyLibraries(mainKey)
        setFetchingLibs(false)

        if (res.ok && res.libraries) {
            setLibraries(res.libraries)
            toast.success(`Found ${res.libraries.length} libraries`)
        } else {
            toast.error("Failed to fetch: " + res.error)
        }
    }

    async function handleSave() {
        if (!apiKey || !libraryId) return toast.error("Missing Library fields")
        setSaving(true)
        if (mainKey) await saveBunnyAccountKey(mainKey)

        const res = await saveBunnyConfig(apiKey, libraryId)
        setSaving(false)
        if (res.ok) toast.success("Configuration saved successfully!")
        else toast.error("Failed to save: " + res.error)
    }

    async function handleSaveAi() {
        if (!geminiKey) return toast.error("Please enter a key before saving")
        setSavingAi(true)
        const ok = await updateTeacherSelf({ gemini_api_key: geminiKey })
        setSavingAi(false)
        if (ok) {
            setIsKeySaved(true)
            toast.success("AI Configuration updated! 🧠")
        } else {
            toast.error("Failed to update AI settings")
        }
    }

    return (
        <div className="container max-w-2xl py-12 px-4 space-y-12">
            <header className="space-y-2" dir="rtl">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">إعدادات المنصة</h1>
                <p className="text-slate-500 font-bold">تحكم في تخزين الفيديوهات، ذكاء المنصة، والمؤثرات البصرية.</p>
            </header>

            <div className="grid gap-10">
                {/* 1. Video Storage (Bunny.net) */}
                <Card className="bg-white dark:bg-slate-900/40 border-slate-200 dark:border-white/5 backdrop-blur-xl shadow-xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="pb-4" dir="rtl">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-2">
                                <Code className="h-5 w-5" /> إعدادات تخزين الفيديو
                            </CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 font-bold">
                            اربط حسابك في Bunny.net Stream لاستضافة الفيديوهات التعليمية.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8" dir="rtl">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
                            </div>
                        ) : (
                            <>
                                {/* Account Level */}
                                <div className="space-y-4 p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-white/5 shadow-inner">
                                    <div className="space-y-3">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 pr-1">1. مفتاح الحساب الرئيسي (Account API Key)</Label>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Input
                                                type="password"
                                                value={mainKey}
                                                onChange={e => setMainKey(e.target.value)}
                                                placeholder="••••••••••••••••••••••••"
                                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono py-6 h-14 rounded-2xl shadow-sm text-left"
                                                dir="ltr"
                                            />
                                            <Button variant="outline" onClick={handleFetchLibraries} disabled={fetchingLibs} className="h-14 px-8 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 transition-all font-black shrink-0">
                                                {fetchingLibs ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> : "جلب المكتبات"}
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-extrabold pr-1 uppercase tracking-tight">
                                            <Info className="h-3 w-3 text-emerald-500" /> موجود في إعدادات الحساب ← API Key.
                                        </div>
                                    </div>

                                    {libraries.length > 0 && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 pr-1">اختر المكتبة المراد استخدامها</Label>
                                            <select
                                                className="w-full h-14 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer shadow-sm appearance-none"
                                                onChange={(e) => {
                                                    const lib = libraries.find(l => String(l.id) === e.target.value)
                                                    if (lib) {
                                                        setLibraryId(String(lib.id))
                                                        setApiKey(lib.apiKey)
                                                        toast.info(`تم اختيار مكنبة "${lib.name}"`)
                                                    }
                                                }}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>-- اختر مكتبة من القائمة --</option>
                                                {libraries.map(lib => (
                                                    <option key={lib.id} value={lib.id}>{lib.name} (ID: {lib.id})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Active Library Config */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">2. إعدادات المكتبة النشطة</Label>
                                        <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase border-slate-200 dark:border-white/10 opacity-70">Configuration</Badge>
                                    </div>

                                    <div className="grid gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pr-1">Library API Key (Write Access)</Label>
                                            <Input
                                                type="password"
                                                value={apiKey}
                                                onChange={e => setApiKey(e.target.value)}
                                                placeholder="••••••••••••••••••••••••"
                                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono py-6 h-14 rounded-2xl shadow-sm text-left"
                                                dir="ltr"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pr-1">Library ID</Label>
                                            <Input
                                                value={libraryId}
                                                onChange={e => setLibraryId(e.target.value)}
                                                placeholder="e.g. 123456"
                                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-black py-6 h-14 rounded-2xl shadow-sm text-left"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-16 rounded-[1.5rem] shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.98] text-lg mt-2">
                                        {saving ? <Loader2 className="animate-spin h-6 w-6" /> : "حفظ إعدادات التخزين"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* 2. AI Intelligence (Gemini) */}
                <Card className={cn(
                    "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-white/5 backdrop-blur-xl shadow-xl rounded-[2.5rem] overflow-hidden relative group transition-all duration-700",
                    isKeySaved ? "border-emerald-500/30 dark:border-emerald-500/30 shadow-emerald-500/10" : "border-slate-200 dark:border-slate-800"
                )}>
                    <div className="absolute top-0 left-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Brain className="h-32 w-32 text-emerald-500" />
                    </div>
                    
                    <CardHeader className="pb-4 relative z-10" dir="rtl">
                        <div className="flex items-center gap-2 mb-2">
                           <Badge className="bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-black text-[9px] uppercase tracking-widest border-none px-4 py-1 shadow-lg">إعدادات متقدمة</Badge>
                        </div>
                        <CardTitle className="text-2xl text-indigo-600 dark:text-emerald-400 flex items-center gap-2 font-black tracking-tight">
                           <Sparkles className="h-6 w-6 animate-pulse text-indigo-500 dark:text-emerald-500" /> جناح التعلم الذكي (Gemini API)
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 font-bold text-base leading-relaxed">
                            قم بتفعيل قوة Google Gemini لإنشاء ملخصات الدروس والاختبارات التلقائية.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-8 relative z-10" dir="rtl">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">مفتاح الوصول (Gemini API Key)</Label>
                                {isKeySaved && (
                                   <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] px-3 py-1 flex items-center gap-1 border-none shadow-lg shadow-emerald-500/30">
                                      <CheckCircle2 className="h-3 w-3" /> تم التكوين (CONFIGURED)
                                   </Badge>
                                )}
                            </div>
                            
                            <div className="relative group/input">
                                <Input
                                    type="password"
                                    value={geminiKey}
                                    onChange={e => {
                                        setGeminiKey(e.target.value)
                                        setIsKeySaved(false)
                                    }}
                                    placeholder={isKeySaved ? "••••••••••••••••••••••••••••••••••••" : "AIzaSy..."}
                                    className={cn(
                                        "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-emerald-500 transition-all font-mono py-8 h-18 text-lg rounded-[2rem] pl-40 shadow-sm text-left",
                                        isKeySaved && "border-emerald-500/30 dark:border-emerald-500/50"
                                    )}
                                    dir="ltr"
                                />
                                {isKeySaved && (
                                   <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping absolute -right-1" />
                                      <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">Saved & Hidden</span>
                                   </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs font-bold bg-slate-50 dark:bg-white/5 p-5 rounded-[1.8rem] border border-slate-100 dark:border-white/5">
                                <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-amber-500/10 shrink-0">
                                    <Lightbulb className="h-6 w-6 text-amber-600 animate-pulse" />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                                   يمكنك الحصول على مفتاحك المجاني من <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 dark:text-emerald-500 underline ml-1 hover:text-emerald-400 transition-colors">Google AI Studio</a> لتمكين ميزات التقييم الذكي.
                                </p>
                            </div>
                        </div>

                        <Button 
                            onClick={handleSaveAi} 
                            disabled={savingAi} 
                            className="w-full bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-black h-20 rounded-[2rem] shadow-2xl shadow-indigo-500/10 dark:shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.98] text-xl"
                        >
                            {savingAi ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                               <span className="flex items-center gap-3">
                                  <Brain className="h-7 w-7" /> حفظ إعدادات الذكاء الاصطناعي
                               </span>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* 3. Seasonal Effects */}
                <Card className="bg-white dark:bg-slate-900/40 border-slate-200 dark:border-white/5 backdrop-blur-xl shadow-xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="pb-6" dir="rtl">
                        <CardTitle className="text-xl text-blue-600 dark:text-blue-400 font-black flex items-center gap-2">
                           <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                            جماليات المنصة
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold">
                            تفعيل المؤثرات البصرية الموسمية لصفحات الطلاب.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-10" dir="rtl">
                        <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-white/5">
                            <SnowToggle />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function SnowToggle() {
    const [enabled, setEnabled] = useState(true)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getSnowSetting().then(val => {
            setEnabled(val)
            setLoading(false)
        })
    }, [])

    async function handleToggle(val: boolean) {
        setEnabled(val)
        await toggleSnowSetting(val)
        toast.success(val ? "تم تفعيل تساقط الثلوج! ❄️" : "تم إيقاف المؤثرات ☀️")
    }

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Label className="text-base font-black text-slate-800 dark:text-white">تأثير تساقط الثلوج</Label>
                <p className="text-sm text-slate-500 font-bold">إظهار الرسوم المتحركة للثلوج في جميع لوحات تحكم الطلاب.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} className="data-[state=checked]:bg-blue-500 scale-125" />
        </div>
    )
}
