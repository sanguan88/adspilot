import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function Loading() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>

                <div className="border rounded-xl">
                    <div className="p-4 border-b flex gap-4">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-10 w-40" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                    <div className="p-6 space-y-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex gap-4 items-center py-2 border-b last:border-0">
                                <Skeleton className="h-10 w-10 flex-shrink-0" />
                                <Skeleton className="h-6 flex-1" />
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-8 w-8" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
