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
      <Card className="lg:col-span-3 border-emerald-100 shadow-sm overflow-hidden h-[600px] flex flex-col">
        <CardHeader className="bg-emerald-50/50 border-b">
           <CardTitle className="text-lg flex items-center gap-2">
              <Layout className="h-5 w-5 text-emerald-600" />
              أختر الدروس (Choose Lessons)
           </CardTitle>
           <CardDescription>Select one or more lessons to include in your personalized exam.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
               <Accordion type="multiple" defaultValue={teachersData.map(t => t.teacherId)} className="w-full">
                  {teachersData.map((t) => (
                    <AccordionItem key={t.teacherId} value={t.teacherId} className="border-none mb-4">
                       <AccordionTrigger className="hover:no-underline p-3 rounded-lg bg-slate-100/50">
                          <span className="font-bold text-slate-700">MR. {t.teacherName.toUpperCase()}</span>
                       </AccordionTrigger>
                       <AccordionContent className="pt-4 px-2">
                          {t.packages.map((pkg) => (
                            <div key={pkg.id} className="mb-4">
                               <p className="text-xs font-bold text-emerald-600 uppercase tracking-tighter mb-2 flex items-center gap-1">
                                  <Zap className="h-3 w-3" /> {pkg.name}
                               </p>
                               <div className="space-y-2 pl-2">
                                  {pkg.videos.map((vid) => (
                                    <div key={vid.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-50 transition-colors">
                                       <Checkbox 
                                          id={vid.id} 
                                          checked={selectedVideos.includes(vid.id)} 
                                          onCheckedChange={() => toggleVideo(vid.id)}
                                          className="border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                       />
                                       <Label htmlFor={vid.id} className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                                          <Video className="h-3 w-3 text-slate-400" />
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
        <CardFooter className="bg-slate-50 border-t p-4 flex justify-between items-center text-xs text-slate-500">
           <span>{selectedVideos.length} Videos Selected</span>
           <Button variant="ghost" size="sm" onClick={() => setSelectedVideos([])}>Clear All</Button>
        </CardFooter>
      </Card>

      {/* Parameters Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-emerald-100 shadow-md">
          <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-amber-500" />
                إعدادات الاختبار (Exam Settings)
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
             {/* Difficulty */}
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <Label className="font-bold">مستوى الصعوبة (Difficulty)</Label>
                   <Badge className={cn(
                     "font-bold px-3 py-0.5",
                     difficultyText === "Easy" ? "bg-emerald-100 text-emerald-700" :
                     difficultyText === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
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
                   <Label className="font-bold leading-none">عدد الأسئلة (Count)</Label>
                   <span className="text-xs font-bold text-slate-500 italic">Recommend: 20-40</span>
                </div>
                <div className="flex items-center gap-4">
                   <Input 
                      type="number" 
                      min={10} 
                      max={100} 
                      value={questionCount} 
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="text-center font-bold text-lg h-12 border-emerald-100 focus-visible:ring-emerald-500"
                   />
                   <div className="flex flex-col text-[10px] text-slate-400 font-mono">
                      <span>MIN: 10</span>
                      <span>MAX: 100</span>
                   </div>
                </div>
             </div>

             {/* Focus Area */}
             <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                   <Target className="h-4 w-4 text-emerald-600" />
                   تريد التركيز على ماذا؟ (Focus Area)
                </Label>
                <Textarea 
                   placeholder="e.g. Focus on 'Grammar', or 'Only hard concepts'..." 
                   className="min-h-[100px] border-emerald-100 focus-visible:ring-emerald-500"
                   value={focusArea}
                   onChange={(e) => setFocusArea(e.target.value)}
                />
             </div>
          </CardContent>
          <CardFooter className="pt-2">
             <Button 
                onClick={handleSubmit}
                disabled={isPending || selectedVideos.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
             >
                {isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> ...جاري إنشاء الاختبار</>
                ) : (
                  <><Sparkles className="mr-2 h-5 w-5" /> إنشاء الاختبار بـ الـ AI</>
                )}
             </Button>
          </CardFooter>
        </Card>

        {/* AI Info Card */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 italic text-xs text-amber-800">
           <Zap className="h-5 w-5 shrink-0 text-amber-500" />
           <p>الذكاء الاصطناعي سيقوم الآن بقراءة سكريبت كل الدروس المختارة ودمجها في اختبار واحد يقيس مدى فهمك للمنهج بشكل شامل.</p>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
