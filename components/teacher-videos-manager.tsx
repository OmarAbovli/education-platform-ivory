import { getMyVideos } from "@/server/teacher-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TeacherVideoRow } from "@/components/teacher-video-row"

export default async function TeacherVideosManager() {
  const videos = await getMyVideos()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Videos</CardTitle>
        <CardDescription>Edit the title, description, or video link.</CardDescription>
      </CardHeader>
      <CardContent>
        {videos.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven’t uploaded any videos yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Link</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <TeacherVideoRow key={v.id} video={v} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
