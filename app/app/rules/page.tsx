import { RulesManagement } from "@/components/rules-management"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function RulesPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 px-4">
        <RulesManagement />
      </div>
    </ProtectedRoute>
  )
}
