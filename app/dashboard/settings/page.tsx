"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminSettings } from "@/components/admin-settings"

export default function SettingsPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <DashboardLayout>
        <AdminSettings />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
