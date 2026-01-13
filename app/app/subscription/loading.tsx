import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function Loading() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 max-w-5xl mx-auto">
                <div className="text-center space-y-4">
                    <Skeleton className="h-10 w-64 mx-auto" />
                    <Skeleton className="h-4 w-96 mx-auto" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="border rounded-2xl p-6 space-y-6 flex flex-col h-[500px]">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-10 w-48" />
                            </div>
                            <div className="space-y-4 flex-1">
                                {[...Array(5)].map((_, j) => (
                                    <div key={j} className="flex gap-2">
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <Skeleton className="h-5 w-full" />
                                    </div>
                                ))}
                            </div>
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    )
}
