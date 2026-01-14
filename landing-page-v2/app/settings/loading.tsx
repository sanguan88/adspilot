import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function Loading() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 max-w-4xl mx-auto">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>

                <div className="border rounded-xl">
                    <div className="p-6 space-y-8">
                        {/* Profile Section */}
                        <div className="flex items-center gap-6 pb-8 border-b">
                            <Skeleton className="h-24 w-24 rounded-full" />
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-48" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                        </div>

                        {/* Form Fields Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-10 w-full rounded-md" />
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Skeleton className="h-10 w-32 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
