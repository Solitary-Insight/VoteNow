"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, push, set, remove, onValue, off } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Settings, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface Admin {
  id: string
  email: string
  role: string
  active: boolean
  createdAt: number
}

export function AdminSettings() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin",
    active: true,
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { adminData } = useAuth()

  useEffect(() => {
    const adminsRef = ref(database, "auth/admins")

    const unsubscribeAdmins = onValue(adminsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const adminsArray = Object.entries(data).map(([id, admin]: [string, any]) => ({
          id,
          ...admin,
        }))
        setAdmins(adminsArray)
      } else {
        setAdmins([])
      }
    })

    return () => {
      off(adminsRef, "value", unsubscribeAdmins)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const hashPassword = (password: string): string => {
        return btoa(password + "election_salt_2024")
      }

      if (editingAdmin) {
        const updateData: any = {
          email: formData.email,
          role: formData.role,
          active: formData.active,
          updatedAt: Date.now(),
        }

        if (formData.password.trim()) {
          updateData.passwordHash = hashPassword(formData.password)
        }

        const adminRef = ref(database, `auth/admins/${editingAdmin.id}`)
        await set(adminRef, updateData)

        const emailKey = formData.email.replace(/[.@]/g, ",")
        const emailIndexRef = ref(database, `auth/adminIndexByEmail/${emailKey}`)
        await set(emailIndexRef, editingAdmin.id)

        toast({
          title: "Success",
          description: "Admin updated successfully",
        })
      } else {
        if (!formData.password.trim()) {
          toast({
            title: "Error",
            description: "Password is required for new admin",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        const adminsRef = ref(database, "auth/admins")
        const newAdminRef = await push(adminsRef, {
          email: formData.email,
          passwordHash: hashPassword(formData.password),
          role: formData.role,
          active: formData.active,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        const emailKey = formData.email.replace(/[.@]/g, ",")
        const emailIndexRef = ref(database, `auth/adminIndexByEmail/${emailKey}`)
        await set(emailIndexRef, newAdminRef.key)

        toast({
          title: "Success",
          description: "Admin created successfully with individual password.",
        })
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save admin",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin)
    setFormData({
      email: admin.email,
      password: "",
      role: admin.role,
      active: admin.active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (adminId: string, email: string) => {
    if (adminData?.role !== "super-admin") {
      toast({
        title: "Error",
        description: "Only super-admin can delete other admins",
        variant: "destructive",
      })
      return
    }

    if (confirm("Are you sure you want to delete this admin?")) {
      try {
        const adminRef = ref(database, `auth/admins/${adminId}`)
        await remove(adminRef)

        const emailKey = email.replace(/[.@]/g, ",")
        const emailIndexRef = ref(database, `auth/adminIndexByEmail/${emailKey}`)
        await remove(emailIndexRef)

        toast({
          title: "Success",
          description: "Admin deleted successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete admin",
          variant: "destructive",
        })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      role: "admin",
      active: true,
    })
    setEditingAdmin(null)
  }

  const canManageAdmins = adminData?.role === "super-admin"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage system administrators</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-600" />
                Administrator Management
              </CardTitle>
              <CardDescription>Manage system administrators and their permissions</CardDescription>
            </div>
            {canManageAdmins && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">{admin.email.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{admin.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          admin.role === "super-admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {admin.role}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          admin.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {admin.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                {canManageAdmins && admin.role !== "super-admin" && (
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(admin)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(admin.id, admin.email)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? "Edit Administrator" : "Add New Administrator"}</DialogTitle>
            <DialogDescription>
              {editingAdmin ? "Update the administrator information below." : "Add a new administrator to the system."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">
                  Password {editingAdmin ? "(leave blank to keep current)" : "(required)"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter secure password"
                  required={!editingAdmin}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super-admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="active">Active (can access system)</Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingAdmin ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!canManageAdmins && (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Limited Access</h3>
            <p className="text-gray-500">Only super-administrators can manage other admin accounts.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
