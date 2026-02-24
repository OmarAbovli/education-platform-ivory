import { BulkStudentForm } from "@/components/bulk-student-form"
import { getTeacherPackages } from "@/server/package-actions"

export const dynamic = "force-dynamic"

export default async function BulkStudentsPage() {
    const packages = await getTeacherPackages()

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Bulk Student Creation</h1>
                <p className="text-muted-foreground">
                    Create multiple student accounts at once and generate printable access cards with QR codes.
                </p>
            </div>

            <BulkStudentForm packages={packages} />
        </div>
    )
}
