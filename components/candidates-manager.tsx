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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, UserCheck, Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: string
  name: string
  description: string
  active: boolean
}

interface Candidate {
  id: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  active: boolean
  votes: number
  createdAt: number
}

export function CandidatesManager() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    active: true,
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const categoriesRef = ref(database, "elections/categories")
    const candidatesRef = ref(database, "elections/candidates")

    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const categoriesArray = Object.entries(data).map(([id, category]: [string, any]) => ({
          id,
          ...category,
        }))
        setCategories(categoriesArray)
      } else {
        setCategories([])
      }
    })

    const unsubscribeCandidates = onValue(candidatesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const candidatesArray = Object.entries(data).map(([id, candidate]: [string, any]) => ({
          id,
          votes: 0,
          ...candidate,
        }))
        setCandidates(candidatesArray)
      } else {
        setCandidates([])
      }
    })

    return () => {
      off(categoriesRef, "value", unsubscribeCategories)
      off(candidatesRef, "value", unsubscribeCandidates)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const selectedCategory = categories.find((cat) => cat.id === formData.categoryId)

      if (editingCandidate) {
        // Update existing candidate
        const candidateRef = ref(database, `elections/candidates/${editingCandidate.id}`)
        await set(candidateRef, {
          ...formData,
          categoryName: selectedCategory?.name || "",
          updatedAt: Date.now(),
        })
        toast({
          title: "Success",
          description: "Candidate updated successfully",
        })
      } else {
        // Create new candidate
        const candidatesRef = ref(database, "elections/candidates")
        await push(candidatesRef, {
          ...formData,
          categoryName: selectedCategory?.name || "",
          votes: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        toast({
          title: "Success",
          description: "Candidate created successfully",
        })
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save candidate",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate)
    setFormData({
      name: candidate.name,
      description: candidate.description,
      categoryId: candidate.categoryId,
      active: candidate.active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (candidateId: string) => {
    if (confirm("Are you sure you want to delete this candidate?")) {
      try {
        const candidateRef = ref(database, `elections/candidates/${candidateId}`)
        await remove(candidateRef)
        toast({
          title: "Success",
          description: "Candidate deleted successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete candidate",
          variant: "destructive",
        })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      active: true,
    })
    setEditingCandidate(null)
  }

  const groupedCandidates = candidates.reduce(
    (acc, candidate) => {
      if (!acc[candidate.categoryName]) {
        acc[candidate.categoryName] = []
      }
      acc[candidate.categoryName].push(candidate)
      return acc
    },
    {} as Record<string, Candidate[]>,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600 mt-2">Manage election candidates and their information</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCandidate ? "Edit Candidate" : "Add New Candidate"}</DialogTitle>
              <DialogDescription>
                {editingCandidate
                  ? "Update the candidate information below."
                  : "Add a new candidate to an election category."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Candidate Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter candidate's full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Election Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((cat) => cat.active)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description or qualifications"
                    rows={3}
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
                  <Label htmlFor="active">Active (available for voting)</Label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingCandidate ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(groupedCandidates).map(([categoryName, categoryCandidates]) => (
        <div key={categoryName} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Award className="w-5 h-5 mr-2 text-blue-600" />
            {categoryName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryCandidates.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      <CardTitle className="text-lg">{candidate.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(candidate)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(candidate.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{candidate.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        candidate.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {candidate.active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-sm font-medium text-blue-600">{candidate.votes || 0} votes</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {candidates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates yet</h3>
            <p className="text-gray-500 mb-4">Add candidates to your election categories to get started.</p>
            <Button onClick={() => setIsDialogOpen(true)} disabled={categories.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
            {categories.length === 0 && <p className="text-sm text-gray-400 mt-2">Create election categories first</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
