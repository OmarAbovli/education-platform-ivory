import { cookies } from "next/headers"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { getMyStudentsAdvanced } from "@/server/teacher-actions"
import { getTeacherPackages } from "@/server/package-actions"
import StudentsFilterBar from "@/components/students-filter-bar"
import StudentEditDialog from "@/components/student-edit-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function parseCsvNumbers(csv?: string | string[]): number[] {
  if (!csv) return []
  const str = Array.isArray(csv) ? csv.join(",") : csv
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
}

function parseCsvStrings(csv?: string | string[]): string[] {
  if (!csv) return []
  const str = Array.isArray(csv) ? csv.join(",") : csv
  return str
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams?: { q?: string; grades?: string | string[]; classes?: string | string[] }
}) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session_id")?.value
  const me = await getCurrentUser(sessionCookie)

  if (!me || me.role !== "teacher") {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>Please sign in as a teacher to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="underline" href="/login">
              Go to login
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const q = (searchParams?.q ?? "").trim()
  const gradeNums = parseCsvNumbers(searchParams?.grades)
  const classes = parseCsvStrings(searchParams?.classes) as ("center" | "online")[]
  const students = await getMyStudentsAdvanced({ grades: gradeNums, classifications: classes, q })
  const packages = await getTeacherPackages()

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Your Students</h1>
        <p className="text-sm text-muted-foreground">
          Filter by grade and classification. Click Edit to update a student&apos;s details and permissions.
        </p>
      </div>

      <StudentsFilterBar initialQuery={q} initialGrades={gradeNums} initialClasses={classes} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Showing {students.length} student{students.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students match your filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Student Name</th>
                  <th className="py-2 pr-3">Grade</th>
                  <th className="py-2 pr-3">Phone Number</th>
                  <th className="py-2 pr-3">Guardian’s Phone Number</th>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Classification</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => (
                  <tr key={s.id} className="border-t align-top">
                    <td className="py-2 pr-3">{s.name ?? "Unnamed"}</td>
                    <td className="py-2 pr-3">{s.grade ?? "—"}</td>
                    <td className="py-2 pr-3">{s.phone ?? "—"}</td>
                    <td className="py-2 pr-3">{s.guardian_phone ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <code className="rounded bg-muted px-2 py-0.5 text-xs">{s.id}</code>
                    </td>
                    <td className="py-2 pr-3 capitalize">{s.classification ?? "center"}</td>
                    <td className="py-2 pr-3">
                      <StudentEditDialog student={s} packages={packages} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
