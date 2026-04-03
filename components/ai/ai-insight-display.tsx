"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FileText, Sparkles, Languages, Download, Loader2, PlayCircle, Trophy, Brain, ArrowLeft } from "lucide-react"
import { generateVideoInsights, generateStudyGuidePDF, generateLessonAiQuiz } from "@/server/video-ai-actions"
import { useToast } from "@/hooks/use-toast"
import { AiQuizPlayer } from "./ai-quiz-player"
import { getQuizForStudent } from "@/server/quiz-queries"
import { Progress } from "@/components/ui/progress"

type Props = {
  videoId: string
  isTeacher: boolean
  initialInsights?: any
}

export function AiInsightDisplay({ videoId, isTeacher, initialInsights }: Props) {
  const { toast } = useToast()
  const [insights, setInsights] = useState(initialInsights)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPdfGeneratingAr, setIsPdfGeneratingAr] = useState(false)
  const [isPdfGeneratingEn, setIsPdfGeneratingEn] = useState(false)
  const [activeQuiz, setActiveQuiz] = useState<any>(null)
  const [isQuizLoading, setIsQuizLoading] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    const res = await generateVideoInsights(videoId)
    if (res.ok) {
      setInsights(res.insights)
      toast({ title: "Success ✨", description: "AI Insights generated successfully!" })
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    }
    setIsGenerating(false)
  }

  const handleDownloadPdf = async (lang: 'ar' | 'en') => {
    const isAr = lang === 'ar'
    if (isAr) setIsPdfGeneratingAr(true)
    else setIsPdfGeneratingEn(true)

    const res = await generateStudyGuidePDF(videoId, lang)
    if (res.ok && res.url) {
      window.open(res.url, "_blank")
      toast({ title: "Success", description: "PDF is ready!" })
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    }

    if (isAr) setIsPdfGeneratingAr(false)
    else setIsPdfGeneratingEn(false)
  }

  const handleStartQuiz = async (difficulty: 'easy' | 'medium' | 'hard') => {
    setIsQuizLoading(true)
    const res = await generateLessonAiQuiz(videoId, difficulty)
    if (res.ok && res.quizId) {
      // Fetch the full quiz data
      const quiz = await getQuizForStudent(res.quizId)
      setActiveQuiz(quiz)
      toast({ title: `Starting ${difficulty} Quiz`, description: "Good luck!" })
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" })
    }
    setIsQuizLoading(false)
  }

  if (!insights) {
    if (!isTeacher) return null
    return (
      <Card className="border-emerald-100 bg-emerald-50/20">
        <CardContent className="pt-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
          <h3 className="font-semibold text-emerald-900">AI Learning Suite</h3>
          <p className="text-sm text-emerald-700/70 mb-4">
            Generate smart summaries, key points, and study guides for this video.
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-emerald-600 hover:bg-emerald-700">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Insights Now
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (activeQuiz) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <Button variant="ghost" size="sm" onClick={() => setActiveQuiz(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Exit Quiz
           </Button>
           <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{activeQuiz.title}</Badge>
        </div>
        <AiQuizPlayer quiz={activeQuiz} onComplete={(sid) => window.location.href = `/quiz/submission/${sid}`} />
      </div>
    )
  }

  return (
    <Card className="border-emerald-100 overflow-hidden">
      <CardHeader className="bg-emerald-50/30 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg text-emerald-900">AI Smart Insight</CardTitle>
          </div>
          {isTeacher && (
             <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isGenerating} className="text-[10px] h-7">
                {isGenerating ? "Refresing..." : "Update AI"}
             </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="ar" className="w-full">
          <div className="px-4 pt-2 border-b">
            <TabsList className="bg-transparent gap-4">
              <TabsTrigger value="ar" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none px-0">العربية</TabsTrigger>
              <TabsTrigger value="en" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none px-0">English</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ar" className="p-4 space-y-4 rtl text-right" dir="rtl">
            <div className="space-y-2">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <FileText className="h-4 w-4" /> ملخص الدرس
              </h4>
              <p className="text-sm leading-relaxed text-slate-700">{insights.summaryAr || insights.summary_ar}</p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="points">
                <AccordionTrigger className="text-emerald-800 font-semibold">أهم النقاط الأساسية</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1">
                    {(insights.keyPointsAr || insights.key_points_ar || []).map((p: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="questions">
                <AccordionTrigger className="text-emerald-800 font-semibold">أسئلة للمراجعة</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {(insights.questionsAr || insights.questions_ar || []).map((q: any, i: number) => (
                      <div key={i} className="border-r-2 border-emerald-200 pr-3">
                        <p className="text-sm font-bold">{q.q}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">{q.a}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button 
                onClick={() => handleDownloadPdf('ar')} 
                disabled={isPdfGeneratingAr}
                className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
            >
              {isPdfGeneratingAr ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="ml-2 h-4 w-4" />}
              تحميل ملزمة المراجعة (PDF)
            </Button>
          </TabsContent>

          <TabsContent value="en" className="p-4 space-y-4">
            <div className="space-y-2">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Lesson Summary
              </h4>
              <p className="text-sm leading-relaxed text-slate-700">{insights.summaryEn || insights.summary_en}</p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="points-en">
                <AccordionTrigger className="text-emerald-800 font-semibold">Key Takeaways</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1">
                    {(insights.keyPointsEn || insights.key_points_en || []).map((p: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="questions-en">
                <AccordionTrigger className="text-emerald-800 font-semibold">Review Questions</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {(insights.questionsEn || insights.questions_en || []).map((q: any, i: number) => (
                      <div key={i} className="border-l-2 border-emerald-200 pl-3">
                        <p className="text-sm font-bold">{q.q}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">{q.a}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button 
                onClick={() => handleDownloadPdf('en')} 
                disabled={isPdfGeneratingEn}
                className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
            >
              {isPdfGeneratingEn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download Study Guide (PDF)
            </Button>
          </TabsContent>

          <TabsContent value="quiz" className="p-4 space-y-6">
             <div className="text-center space-y-2">
                <Brain className="mx-auto h-10 w-10 text-amber-500" />
                <h3 className="text-lg font-bold">AI Assessment Center</h3>
                <p className="text-xs text-muted-foreground px-4">
                   Challenge yourself with AI-generated questions based specifically on this video explanation.
                </p>
             </div>

             <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={() => handleStartQuiz('easy')} 
                  variant="outline" 
                  disabled={isQuizLoading}
                  className="flex flex-col h-auto py-4 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200"
                >
                   <span className="text-emerald-600 text-xs font-bold uppercase mb-1">Easy</span>
                   <span className="text-[10px] text-muted-foreground">Fundamentals</span>
                </Button>
                <Button 
                  onClick={() => handleStartQuiz('medium')} 
                  variant="outline" 
                  disabled={isQuizLoading}
                  className="flex flex-col h-auto py-4 border-amber-100 hover:bg-amber-50 hover:border-amber-200"
                >
                   <span className="text-amber-600 text-xs font-bold uppercase mb-1">Medium</span>
                   <span className="text-[10px] text-muted-foreground">Main Concepts</span>
                </Button>
                <Button 
                   onClick={() => handleStartQuiz('hard')} 
                   variant="outline" 
                   disabled={isQuizLoading}
                   className="flex flex-col h-auto py-4 border-red-100 hover:bg-red-50 hover:border-red-200"
                >
                   <span className="text-red-600 text-xs font-bold uppercase mb-1">Hard</span>
                   <span className="text-[10px] text-muted-foreground">Advanced logic</span>
                </Button>
             </div>

             {isQuizLoading && (
                <div className="flex flex-col items-center gap-3 py-6 animate-pulse">
                   <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                   <p className="text-[10px] text-amber-700 font-medium">✨ الـ AI يقوم بإنشاء الاختبار الآن...</p>
                </div>
             )}

             <div className="rounded-xl bg-slate-50 border p-4">
                <div className="flex items-center gap-2 mb-2">
                   <Trophy className="h-4 w-4 text-emerald-500" />
                   <h4 className="text-sm font-bold">Your Progress</h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                       <span>Total Attempts</span>
                       <span>2 Attempts</span>
                    </div>
                    <Progress value={65} className="h-1 bg-slate-200" indicatorClassName="bg-emerald-500" />
                  </div>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
