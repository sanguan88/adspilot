import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96 font-medium" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-10 flex-1 max-w-md" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="flex-1 overflow-auto p-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-0 overflow-hidden">
              <div className="space-y-4 p-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
