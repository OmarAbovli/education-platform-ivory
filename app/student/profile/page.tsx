import SiteHeader from "@/components/site-header"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StudentProfilePicture } from "@/components/student-profile-picture"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentCredentialsForm } from "@/components/student-credentials-form"

export default async function StudentProfilePage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const user = await getCurrentUser(sessionCookie)

  if (!user || user.role !== 'student') {
    redirect('/')
  }

  return (
    <main>
      <SiteHeader />

      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة معلومات حسابك
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Picture */}
          <StudentProfilePicture
            currentAvatar={user.avatar_url}
            userName={user.name || undefined}
          />

          {/* User Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>المعلومات الأساسية</CardTitle>
                <CardDescription>بيانات حسابك على المنصة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">الاسم</label>
                  <p className="text-lg">{user.name || 'غير محدد'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
                  <p className="text-lg">{user.email || 'غير محدد'}</p>
                </div>

                {user.grade && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">الصف الدراسي</label>
                    <p className="text-lg">
                      الصف {user.grade === 1 ? 'الأول' : user.grade === 2 ? 'الثاني' : user.grade === 3 ? 'الثالث' : user.grade} الثانوي
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">نوع الحساب</label>
                  <p className="text-lg capitalize">طالب</p>
                </div>
              </CardContent>
            </Card>

            <StudentCredentialsForm currentUsername={user.username || undefined} />
          </div>
        </div>
      </div>
    </main>
  )
}
