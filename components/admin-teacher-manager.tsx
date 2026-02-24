import { getTeachersList } from "@/server/admin-actions"
import { AdminTeacherRow } from "@/components/admin-teacher-row"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function AdminTeacherManager() {
  const teachers = await getTeachersList()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Teachers</CardTitle>
        <CardDescription>Edit info, reset credentials, or delete accounts</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teachers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Teacher</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <AdminTeacherRow key={t.id} teacher={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
