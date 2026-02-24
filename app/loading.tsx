import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="container mx-auto p-8 flex flex-col space-y-8 h-screen justify-center items-center">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
    )
}
