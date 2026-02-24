import { getPackageById } from "@/server/package-actions"
import { EditPackageForm } from "@/components/edit-package-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function EditPackagePage({ params }: { params: { id: string } }) {
  const pkg = await getPackageById(params.id)

  if (!pkg) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Package Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The package you are looking for does not exist or you do not have permission to view it.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Package: {pkg.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditPackageForm pkg={pkg} />
        </CardContent>
      </Card>
    </div>
  )
}
