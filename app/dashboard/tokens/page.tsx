"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SimpleVotingLinks } from "@/components/simple-voting-links"

export default function TokensPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <DashboardLayout>
        <SimpleVotingLinks />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
