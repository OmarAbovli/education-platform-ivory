"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { 
  Dna, 
  Settings2, 
  Target, 
  HelpCircle, 
  Sparkles, 
  Zap,
  Loader2,
  Video,
  Layout,
  ArrowRight
} from "lucide-react"
import { generateCustomAiExam } from "@/server/video-ai-actions"
import { useToast } from "@/hooks/use-toast"

type VideoInfo = {
  id: string
  title: string
}

type PackageInfo = {
  id: string
  name: string
  videos: VideoInfo[]
}

type TeacherData = {
  teacherId: string
  teacherName: string
  packages: PackageInfo[]
}

type Props = {
  teachersData: TeacherData[]
}

export function CustomExamForm({ teachersData }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  
  // Form State
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState(50) // 0-100
  const [questionCount, setQuestionCount] = useState(20)
  const [focusArea, setFocusArea] = useState("")

  const toggleVideo = (id: string) => {
    setSelectedVideos(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    )
  }

  const difficultyText = difficulty < 30 ? "Easy" : difficulty < 70 ? "Medium" : "Hard"

  const handleSubmit = () => {
    if (selectedVideos.length === 0) {
      toast({ title: "No Videos Selected", description: "Please pick at least one lesson.", variant: "destructive" })
      return
    }

    startTransition(async () => {
      try {
        const res = await generateCustomAiExam(selectedVideos, {
          difficulty: difficultyText,
          count: questionCount,
          focus: focusArea
        })

        if (res.ok && res.quizId) {
          toast({ title: "Exam Created! ✨", description: "Redirecting you to the test..." })
          router.push(`/quiz/${res.quizId}`)
        } else {
          toast({ title: "Generation Failed", description: res.error, variant: "destructive" })
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" })
      }
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5 items-start">
      {/* Selection Column */}
      <Card className="lg:col-span-3 border-emerald-100 dark:border-slate-800 shadow-sm overflow-hidden h-[600px] flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b dark:border-slate-800">
           <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
              <Layout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              أختر الدروس (Choose Lessons)
           </CardTitle>
           <CardDescription className="dark:text-slate-400">Select one or more lessons to include in your personalized exam.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
               <Accordion type="multiple" defaultValue={teachersData.map(t => t.teacherId)} className="w-full">
                  {teachersData.map((t) => (
                    <AccordionItem key={t.teacherId} value={t.teacherId} className="border-none mb-4">
                       <AccordionTrigger className="hover:no-underline p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 border border-transparent hover:border-emerald-500/30 transition-all">
                          <span className="font-black text-slate-700 dark:text-slate-200 tracking-tight">MR. {t.teacherName.toUpperCase()}</span>
                       </AccordionTrigger>
                       <AccordionContent className="pt-4 px-2">
                          {t.packages.map((pkg) => (
                            <div key={pkg.id} className="mb-6">
                               <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {pkg.name}
                               </div>
                               <div className="space-y-1 pl-2">
                                  {pkg.videos.map((vid) => (
                                    <div key={vid.id} className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-emerald-500/10 transition-colors group">
                                       <Checkbox 
                                          id={vid.id} 
                                          checked={selectedVideos.includes(vid.id)} 
                                          onCheckedChange={() => toggleVideo(vid.id)}
                                          className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                       />
                                       <Label htmlFor={vid.id} className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-none cursor-pointer flex items-center gap-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                          <Video className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                          {vid.title}
                                       </Label>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          ))}
                       </AccordionContent>
                    </AccordionItem>
                  ))}
               </Accordion>
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="bg-slate-50/50 dark:bg-slate-950/50 border-t dark:border-slate-800 p-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
           <span className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {selectedVideos.length} Videos Selected
           </span>
           <Button variant="ghost" size="sm" onClick={() => setSelectedVideos([])} className="text-[10px] h-7 hover:bg-red-500/10 hover:text-red-500 transition-colors">Clear All</Button>
        </CardFooter>
      </Card>

      {/* Parameters Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-emerald-100 dark:border-slate-800 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2 dark:text-white font-black">
                <Settings2 className="h-5 w-5 text-amber-500" />
                إعدادات الاختبار (Exam Settings)
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-10">
             {/* Difficulty */}
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <Label className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">مستوى الصعوبة (Difficulty)</Label>
                   <Badge className={cn(
                     "font-black text-[10px] uppercase px-3 py-1 tracking-widest rounded-full",
                     difficultyText === "Easy" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                     difficultyText === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                   )}>
                      {difficultyText}
                   </Badge>
                </div>
                <Slider 
                  value={[difficulty]} 
                  onValueChange={(v) => setDifficulty(v[0])} 
                  max={100} 
                  step={1} 
                  className="py-2"
                />
             </div>

             {/* Question Count */}
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <Label className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">عدد الأسئلة (Count)</Label>
                   <span className="text-[10px] font-black text-slate-400 italic">Recommend: 20-40</span>
                </div>
                <div className="flex items-center gap-4">
                   <Input 
                      type="number" 
                      min={10} 
                      max={100} 
                      value={questionCount} 
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="text-center font-black text-2xl h-16 border-emerald-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus-visible:ring-emerald-500 rounded-2xl"
                   />
                   <div className="flex flex-col text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                      <span>MIN: 10</span>
                      <span>MAX: 100</span>
                   </div>
                </div>
             </div>

             {/* Focus Area */}
             <div className="space-y-3">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                   <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                   تريد التركيز على ماذا؟ (Focus Area)
                </Label>
                <Textarea 
                   placeholder="e.g. Focus on 'Grammar', or 'Only hard concepts'..." 
                   className="min-h-[120px] border-emerald-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus-visible:ring-emerald-500 rounded-2xl p-4 text-sm font-medium"
                   value={focusArea}
                   onChange={(e) => setFocusArea(e.target.value)}
                />
             </div>
          </CardContent>
          <CardFooter className="pt-4 pb-8">
             <Button 
                onClick={handleSubmit}
                disabled={isPending || selectedVideos.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-16 text-xl font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] hover:scale-[1.02]"
             >
                {isPending ? (
                  <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> ...جاري إنشاء الاختبار</>
                ) : (
                  <><Sparkles className="mr-2 h-6 w-6" /> إنشاء الاختبار بـ الـ AI</>
                )}
             </Button>
          </CardFooter>
        </Card>

        {/* AI Info Card */}
        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4 italic text-sm text-amber-800 dark:text-amber-400 shadow-sm">
           <Zap className="h-6 w-6 shrink-0 text-amber-500 animate-pulse" />
           <p className="leading-relaxed font-medium">الذكاء الاصطناعي سيقوم الآن بقراءة سكريبت كل الدروس المختارة ودمجها في اختبار واحد يقيس مدى فهمك للمنهج بشكل شامل.</p>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
