import { getStudentsList } from "@/server/admin-actions"
import AdminStudentRow from "@/components/admin-student-row"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default async function AdminStudentsManager({ q = "" }: { q?: string }) {
  const students = await getStudentsList(q)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Students</CardTitle>
        <CardDescription>Search and edit student accounts across the platform</CardDescription>
        <form action="/admin" className="mt-3 flex gap-2">
          <Input name="q" placeholder="Search name, username, email, phone..." defaultValue={q} className="w-full" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </CardHeader>
      <CardContent className="grid gap-4">
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Creator</th>
                  <th className="py-2 pr-3">Permissions With</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <AdminStudentRow key={s.id} student={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
