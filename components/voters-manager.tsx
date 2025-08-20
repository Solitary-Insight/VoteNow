"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Users, Upload, Download, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Voter {
  id: string
  username: string
  phoneNumber: string
  active: boolean
  hasVoted: boolean
  createdAt: number
}

export function VotersManager() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    phoneNumber: "",
    active: true,
  })
  const [bulkData, setBulkData] = useState("")
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const votersRef = ref(database, "auth/voters")

    const unsubscribe = onValue(votersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const votersArray = Object.entries(data).map(([id, voter]: [string, any]) => ({
          id,
          hasVoted: false,
          ...voter,
        }))
        setVoters(votersArray)
        setFilteredVoters(votersArray)
      } else {
        setVoters([])
        setFilteredVoters([])
      }
    })

    return () => off(votersRef, "value", unsubscribe)
  }, [])

  useEffect(() => {
    const filtered = voters.filter(
      (voter) =>
        voter.username.toLowerCase().includes(searchTerm.toLowerCase()) || voter.phoneNumber.includes(searchTerm),
    )
    setFilteredVoters(filtered)
  }, [searchTerm, voters])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate phone number format
      const phoneRegex = /^\+?[\d\s-()]+$/
      if (!phoneRegex.test(formData.phoneNumber)) {
        toast({
          title: "Error",
          description: "Please enter a valid phone number",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (editingVoter) {
        // Update existing voter
        const voterRef = ref(database, `auth/voters/${editingVoter.id}`)
        await set(voterRef, {
          ...formData,
          updatedAt: Date.now(),
        })

        // Update phone index
        const phoneKey = formData.phoneNumber.replace(/[^\d]/g, "")
        const phoneIndexRef = ref(database, `auth/voterIndexByPhone/${phoneKey}`)
        await set(phoneIndexRef, editingVoter.id)

        toast({
          title: "Success",
          description: "Voter updated successfully",
        })
      } else {
        // Create new voter
        const votersRef = ref(database, "auth/voters")
        const newVoterRef = await push(votersRef, {
          ...formData,
          hasVoted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Add to phone index
        const phoneKey = formData.phoneNumber.replace(/[^\d]/g, "")
        const phoneIndexRef = ref(database, `auth/voterIndexByPhone/${phoneKey}`)
        await set(phoneIndexRef, newVoterRef.key)

        toast({
          title: "Success",
          description: "Voter created successfully",
        })
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save voter",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkImport = async () => {
    setLoading(true)

    try {
      const lines = bulkData.trim().split("\n")
      let successCount = 0
      let errorCount = 0

      for (const line of lines) {
        const [username, phoneNumber] = line.split(",").map((s) => s.trim())

        if (username && phoneNumber) {
          try {
            const votersRef = ref(database, "auth/voters")
            const newVoterRef = await push(votersRef, {
              username,
              phoneNumber,
              active: true,
              hasVoted: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })

            // Add to phone index
            const phoneKey = phoneNumber.replace(/[^\d]/g, "")
            const phoneIndexRef = ref(database, `auth/voterIndexByPhone/${phoneKey}`)
            await set(phoneIndexRef, newVoterRef.key)

            successCount++
          } catch (error) {
            errorCount++
          }
        }
      }

      toast({
        title: "Bulk Import Complete",
        description: `${successCount} voters imported successfully. ${errorCount} errors.`,
      })

      setIsBulkDialogOpen(false)
      setBulkData("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import voters",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const csv = event.target?.result as string
        setBulkData(csv)
        setIsBulkDialogOpen(true)
      }
      reader.readAsText(file)
    }
  }

  const handleEdit = (voter: Voter) => {
    setEditingVoter(voter)
    setFormData({
      username: voter.username,
      phoneNumber: voter.phoneNumber,
      active: voter.active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (voterId: string, phoneNumber: string) => {
    if (confirm("Are you sure you want to delete this voter?")) {
      try {
        const voterRef = ref(database, `auth/voters/${voterId}`)
        await remove(voterRef)

        // Remove from phone index
        const phoneKey = phoneNumber.replace(/[^\d]/g, "")
        const phoneIndexRef = ref(database, `auth/voterIndexByPhone/${phoneKey}`)
        await remove(phoneIndexRef)

        toast({
          title: "Success",
          description: "Voter deleted successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete voter",
          variant: "destructive",
        })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      phoneNumber: "",
      active: true,
    })
    setEditingVoter(null)
  }

  const downloadTemplate = () => {
    const csvContent = "username,phoneNumber\nJohn Doe,+1234567890\nJane Smith,+0987654321"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "voters_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row  items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voters Management</h1>
          <p className="text-gray-600 mt-2">Manage registered voters and their information</p>
        </div>
        <div className="flex flex-col md:flex-row  gap-1 space-x-2">
          <input type="file" accept=".csv" onChange={handleCSVUpload} ref={fileInputRef} className="hidden" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Voter
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search voters by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredVoters.length} of {voters.length} voters
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVoters.map((voter) => (
          <Card key={voter.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">{voter.username}</CardTitle>
                </div>
                <div className="flex flex-col md:flex-row items-center space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(voter)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(voter.id, voter.phoneNumber)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{voter.phoneNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    voter.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {voter.active ? "Active" : "Inactive"}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    voter.hasVoted ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {voter.hasVoted ? "Voted" : "Not Voted"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Voter Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVoter ? "Edit Voter" : "Add New Voter"}</DialogTitle>
            <DialogDescription>
              {editingVoter ? "Update the voter information below." : "Add a new voter to the election system."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Full Name</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter voter's full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="active">Active (eligible to vote)</Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingVoter ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Voters</DialogTitle>
            <DialogDescription>
              Import multiple voters using CSV format. Each line should contain: username,phoneNumber
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulkData">CSV Data</Label>
              <textarea
                id="bulkData"
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder="John Doe,+1234567890&#10;Jane Smith,+0987654321"
                className="w-full h-40 p-3 border rounded-md resize-none"
              />
            </div>
            <div className="text-sm text-gray-500">
              Format: Each line should contain username and phone number separated by comma
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={loading || !bulkData.trim()}>
              {loading ? "Importing..." : "Import Voters"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredVoters.length === 0 && voters.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No voters yet</h3>
            <p className="text-gray-500 mb-4">Add voters individually or import them in bulk using CSV.</p>
            <div className="flex justify-center space-x-2">
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Voter
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
