import { DashboardSkeleton } from "@/components/ui/loading-skeleton"

export default function TeacherLoading() {
    return (
        <div className="container mx-auto p-8 space-y-8">
            <DashboardSkeleton />
        </div>
    )
}
