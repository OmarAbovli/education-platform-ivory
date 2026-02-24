import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import SiteHeader from '@/components/site-header'
import { PracticeInterface } from '@/components/practice-interface'
import { getPracticeStats } from '@/server/ai-practice-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, MessageSquare, Clock, TrendingUp, Award } from 'lucide-react'

export default async function PracticePage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  const user = await getCurrentUser(sessionId)

  if (!user || user.role !== 'student') {
    redirect('/login')
  }

  // جلب الإحصائيات
  const statsResult = await getPracticeStats(user.id)
  const stats = statsResult.success ? statsResult.stats : null

  return (
    <main>
      <SiteHeader />
      
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">مارس اللغة مع AI</h1>
              <p className="text-muted-foreground">تحدث مع الذكاء الصناعي وحسّن لغتك الإنجليزية</p>
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        {stats && stats.totalSessions > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">جلسة ممارسة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalDurationMinutes}</p>
                    <p className="text-xs text-muted-foreground">دقيقة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                    <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.streakDays}</p>
                    <p className="text-xs text-muted-foreground">يوم متتالي</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Math.round(stats.avgOverallScore)}</p>
                    <p className="text-xs text-muted-foreground">متوسط الدرجة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* واجهة الممارسة */}
        <PracticeInterface userId={user.id} userName={user.name || 'Student'} />

        {/* معلومات إضافية */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                كيف تستخدم المنصة؟
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">1</Badge>
                <p>اختر موضوع المحادثة أو ابدأ محادثة حرة</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">2</Badge>
                <p>تحدث مع AI بالكتابة أو الصوت (قريباً)</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">3</Badge>
                <p>AI سيصحح أخطاءك ويقترح كلمات أفضل</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">4</Badge>
                <p>احصل على تقرير مفصل بعد كل جلسة</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                نصائح للتحسن السريع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• مارس يومياً لمدة 10-15 دقيقة على الأقل</p>
              <p>• ركز على الأخطاء الشائعة في تقاريرك</p>
              <p>• حاول استخدام الكلمات الجديدة في المحادثات</p>
              <p>• لا تخف من الأخطاء - هذا جزء من التعلم!</p>
              <p>• راجع تقاريرك السابقة بانتظام</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
