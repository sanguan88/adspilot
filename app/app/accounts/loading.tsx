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
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="border rounded-xl">
                    <div className="p-4 border-b">
                        <Skeleton className="h-10 w-full max-w-sm" />
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-4 gap-4 pb-4 border-b">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <Skeleton className="h-6 flex-1" />
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-8 w-24 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
