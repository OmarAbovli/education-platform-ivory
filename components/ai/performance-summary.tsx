"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ArrowRight, 
  RefreshCcw,
  BookOpen,
  PieChart
} from "lucide-react"
import Link from "next/link"

type Result = {
  score: number
  totalQuestions: number
  correctCount: number
  weakPoints: {
    lessonTitle: string
    videoId: string
    errorCount: number
    totalInLesson: number
    topicName?: string
  }[]
}

export function PerformanceSummary({ result }: { result: Result }) {
  const isPassing = result.score >= 60

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Score Header */}
      <Card className={cn(
        "border-2 overflow-hidden",
        isPassing ? "border-emerald-200 bg-emerald-50/20" : "border-amber-200 bg-amber-50/20"
      )}>
        <CardContent className="pt-6 pb-6 text-center space-y-4">
          <div className="flex justify-center">
             <div className={cn(
               "h-24 w-24 rounded-full border-[6px] flex items-center justify-center text-2xl font-bold shadow-inner bg-white",
               isPassing ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"
             )}>
                {result.score}%
             </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-800">
              {isPassing ? "برافو! عمل رائع 🎉" : "محاولة جيدة، استمر في المراجعة! 💪"}
            </h2>
            <p className="text-sm text-slate-500 italic">
              {isPassing ? "You've mastered the key concepts of this lesson." : "You're close! Review your weak points to improve."}
            </p>
          </div>
          <div className="flex justify-center gap-4 text-xs font-medium text-slate-600">
             <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                {result.correctCount} Correct
             </div>
             <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {result.totalQuestions - result.correctCount} Incorrect
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Weak Points Section */}
      {result.weakPoints.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
             <AlertTriangle className="h-5 w-5 text-amber-500" />
             نقاط تحتاج للمراجعة (Weak Points)
          </h3>
          <div className="grid gap-3">
             {result.weakPoints.map((wp, i) => {
                const accuracy = Math.round((1 - (wp.errorCount / wp.totalInLesson)) * 100)
                return (
                  <Card key={i} className="bg-white border-slate-200 hover:border-amber-200 transition-colors shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg shrink-0",
                            accuracy < 50 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          )}>
                             <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{wp.lessonTitle}</p>
                            <p className="text-[10px] text-muted-foreground italic">You missed {wp.errorCount} questions in this topic.</p>
                          </div>
                       </div>
                       <Link href={`/watch/${wp.videoId}`}>
                          <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                             Re-watch Lesson <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                       </Link>
                    </CardContent>
                    <Progress value={accuracy} className="h-1 bg-slate-100 rounded-none rounded-b-lg overflow-hidden" 
                       indicatorClassName={accuracy < 50 ? "bg-red-500" : "bg-amber-500"} 
                    />
                  </Card>
                )
             })}
          </div>
        </div>
      )}

      {/* Recommendation Card */}
      <Card className="bg-slate-900 text-white border-none">
        <CardContent className="p-6 text-center space-y-4">
           <PieChart className="mx-auto h-8 w-8 text-emerald-400" />
           <div className="space-y-1">
             <h4 className="font-bold">Next Recommendation</h4>
             <p className="text-xs text-slate-400">Based on your performance, the AI suggests focusing on Irregular Verbs before taking the next level exam.</p>
           </div>
           <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
              Try Advanced Quiz <RefreshCcw className="ml-2 h-4 w-4" />
           </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
