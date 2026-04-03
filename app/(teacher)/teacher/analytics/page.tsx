import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { 
  getTeacherAnalyticsOverview, 
  getLiveActiveStudents, 
} from "@/server/teacher-analytics-queries"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Activity, Clock, TrendingUp, Search, User } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export const dynamic = "force-dynamic"

export default async function TeacherAnalyticsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionId)

  if (!me || (me.role !== "teacher" && me.role !== "admin")) {
    redirect("/login")
  }

  const overview = await getTeacherAnalyticsOverview()
  const liveStudents = await getLiveActiveStudents()

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground mt-1">
            Monitor real-time student engagement and long-term growth.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/teacher">Back to Studio</Link>
        </Button>
      </div>

      {/* 📊 High-Level Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Students" 
          value={overview.totalStudents} 
          icon={<Users className="h-4 w-4" />} 
          description="Subscribed students"
        />
        <StatCard 
          title="Online Now" 
          value={overview.onlineNow} 
          icon={<Activity className="h-4 w-4 text-emerald-500" />} 
          description="Active in last 5 mins"
          highlight
        />
        <StatCard 
          title="Today's Reach" 
          value={overview.activeToday} 
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />} 
          description="Unique students today"
        />
        <StatCard 
          title="Weekly Active" 
          value={overview.activeThisWeek} 
          icon={<Clock className="h-4 w-4 text-purple-500" />} 
          description="Active in last 7 days"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* 🟢 Live Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Live Activity Feed</CardTitle>
                <CardDescription>Real-time updates of student actions on the platform.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-pulse">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {liveStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p>No students are active right now.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <User className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.currentActivity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <Badge variant="secondary" className="text-[10px] font-normal">
                          {formatRelativeTime(student.lastActiveAt)}
                       </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🔍 Student Lookup */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Search</CardTitle>
            <CardDescription>Look up a specific student's history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or phone..." className="pl-9" />
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Select a student from your classroom to see their detailed engagement logs and total time spent.
            </div>
            <Button variant="ghost" className="w-full justify-start text-emerald-600" asChild>
               <Link href="/teacher#students">Manage All Students</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, description, highlight }: { title: string, value: number, icon: React.ReactNode, description: string, highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-emerald-500/50 bg-emerald-500/[0.02]" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const d = new Date(date)
  const diffInSecs = Math.floor((now.getTime() - d.getTime()) / 1000)
  
  if (diffInSecs < 60) return "Just now"
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m ago`
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
