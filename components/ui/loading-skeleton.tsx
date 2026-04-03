import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col space-y-10 animate-pulse pb-20">
            {/* Premium Hero Skeleton */}
            <div className="relative h-[280px] w-full rounded-3xl bg-slate-900/40 border border-white/5 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
                <div className="relative h-full flex flex-col justify-center px-10 p-6 space-y-4">
                    <Skeleton className="h-12 w-[350px] bg-white/5" />
                    <Skeleton className="h-5 w-[450px] bg-white/5" />
                    <Skeleton className="h-10 w-[180px] bg-indigo-500/20" />
                </div>
            </div>

            <div className="mx-auto w-full space-y-12">
                {/* Recently Watched Skeleton */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-7 w-[220px]" />
                        <Skeleton className="h-4 w-[100px]" />
                    </div>
                    <div className="flex gap-4 overflow-hidden">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="min-w-[280px] flex-shrink-0 space-y-3">
                                <Skeleton className="aspect-video w-full rounded-2xl" />
                                <Skeleton className="h-4 w-[70%]" />
                                <Skeleton className="h-2 w-full" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="grid gap-8 grid-cols-1 md:grid-cols-7">
                    {/* Left: XP & Stats */}
                    <div className="md:col-span-3 space-y-6">
                        <Skeleton className="h-[200px] w-full rounded-2xl" />
                        <Skeleton className="h-[300px] w-full rounded-2xl" />
                    </div>

                    {/* Right: Video Categories & List Skeletons */}
                    <div className="md:col-span-4 space-y-8">
                        <div className="flex items-center gap-2">
                             {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-[100px] rounded-full" />)}
                        </div>
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="aspect-video w-full rounded-2xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-[80%]" />
                                        <Skeleton className="h-3 w-[40%]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
