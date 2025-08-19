"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CategoriesManager } from "@/components/categories-manager"

export default function CategoriesPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <DashboardLayout>
        <CategoriesManager />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
