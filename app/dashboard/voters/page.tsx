"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { VotersManager } from "@/components/voters-manager"

export default function VotersPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <DashboardLayout>
        <VotersManager />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
