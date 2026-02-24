import SiteHeader from "@/components/site-header"
import { CreateTeacherForm } from "@/components/create-teacher-form"
import AdminTeacherManager from "@/components/admin-teacher-manager"
import AdminStudentsManager from "@/components/admin-students-manager"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function AdminPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q ?? ""
  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Super Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage teachers and students. Reset credentials or edit account details.
        </p>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Important</CardTitle>
            <CardDescription>
              If you want an account to watch your teacher’s videos, contact them and get your username and password.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This dashboard is for platform administrators only.
          </CardContent>
        </Card>

        <div className="grid gap-6 mt-8">
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-tr from-emerald-200/30 to-teal-200/30" />
            <CardHeader>
              <CardTitle>Create Teacher Account</CardTitle>
              <CardDescription>
                Upload photo, set subject and colors. We’ll generate a username and password automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateTeacherForm />
            </CardContent>
          </Card>

          <AdminTeacherManager />

          {/* New: Manage Students */}
          <AdminStudentsManager q={q} />
        </div>
      </div>
    </main>
  )
}
