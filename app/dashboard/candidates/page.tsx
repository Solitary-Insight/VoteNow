"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CandidatesManager } from "@/components/candidates-manager"

export default function CandidatesPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <DashboardLayout>
        <CandidatesManager />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
