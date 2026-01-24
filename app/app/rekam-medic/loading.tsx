import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function Loading() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-[500px] md:col-span-2 rounded-xl" />
                    <Skeleton className="h-[500px] rounded-xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        </DashboardLayout>
    )
}
