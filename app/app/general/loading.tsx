import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function Loading() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-8">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                </div>

                {/* Summary Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>

                {/* Charts/Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-[400px] lg:col-span-2 rounded-xl" />
                    <Skeleton className="h-[400px] rounded-xl" />
                </div>

                {/* Table Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <div className="border rounded-xl p-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 py-4 border-b last:border-0">
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
