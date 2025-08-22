"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, set, onValue, off, remove, update } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Copy,
  MessageCircle,
  Users,
  Vote,
  Search,
  Trash2,
  RotateCcw,
  UserX,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  UserCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Voter {
  id: string
  username: string
  phoneNumber: string
  active: boolean
  hasVoted: boolean
}

interface Category {
  id: string
  name: string
  description: string
  active: boolean
}


interface VotingLink {
  id: string
  categoryId: string
  categoryName: string
  linkType: "unified" | "particular"
  createdAt: number
  expiresAt: number
  active: boolean
  allowedVoters?: string[]
  voterData?: Array<{
    id: string
    username: string
    phoneNumber: string
    personalToken: string
  }>
}

export function SimpleVotingLinks() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [votingLinks, setVotingLinks] = useState<VotingLink[]>([])
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([])
  const [selectedVoters, setSelectedVoters] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "voted" | "not-voted">("all")
  const [unifiedLink, setUnifiedLink] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [expirySeconds, setExpirySeconds] = useState(60) // 1 minute default
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false)
  const [showLinksDialog, setShowLinksDialog] = useState(false)
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([])
  const [copiedItem, setCopiedItem] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    const votersRef = ref(database, "auth/voters")
    const categoriesRef = ref(database, "elections/categories")
    const linksRef = ref(database, "elections/voting-links")

    const unsubscribeVoters = onValue(votersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const votersArray = Object.entries(data).map(([id, voter]: [string, any]) => ({
          id,
          hasVoted: false,
          ...voter,
        }))

        setVoters(votersArray)
      } else {
        setVoters([])
      }
    })

    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const categoriesArray = Object.entries(data).map(([id, category]: [string, any]) => ({
          id,
          ...category,
        }))
        setCategories(categoriesArray.filter((c) => c.active))
      } else {
        setCategories([])
      }
    })

    const unsubscribeLinks = onValue(linksRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const linksArray = Object.entries(data).map(([id, link]: [string, any]) => ({
          id,
          ...link,
        }))
        setVotingLinks(linksArray)
      } else {
        setVotingLinks([])
      }
    })

    return () => {
      off(votersRef, "value", unsubscribeVoters)
      off(categoriesRef, "value", unsubscribeCategories)
      off(linksRef, "value", unsubscribeLinks)
    }
  }, [])

  useEffect(() => {
    let filtered = voters.filter(
      (voter) =>
        voter.username.toLowerCase().includes(searchTerm.toLowerCase()) || voter.phoneNumber.includes(searchTerm),
    )

    switch (filterStatus) {
      case "active":
        filtered = filtered.filter((voter) => voter.active)
        break
      case "voted":
        filtered = filtered.filter((voter) => voter.hasVoted)
        break
      case "not-voted":
        filtered = filtered.filter((voter) => !voter.hasVoted && voter.active)
        break
    }

    setFilteredVoters(filtered)
  }, [searchTerm, filterStatus, voters])

  const handleVoterSelect = (voterId: string, checked: boolean) => {
    if (checked) {
      setSelectedVoters((prev) => [...prev, voterId])
    } else {
      setSelectedVoters((prev) => prev.filter((id) => id !== voterId))
    }
  }

  const handleSelectAll = () => {
    const eligibleVoters = filteredVoters.filter((voter) => voter.active && !voter.hasVoted)
    if (selectedVoters.length === eligibleVoters.length) {
      setSelectedVoters([])
    } else {
      setSelectedVoters(eligibleVoters.map((voter) => voter.id))
    }
  }

  const generateLinks = async () => {
    if (!selectedCategory) {
      toast({
        title: "Error",
        description: "Please select a voting category first",
        variant: "destructive",
      })
      return
    }

    if (selectedVoters.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one voter to generate voting links",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const selectedCat = categories.find((c) => c.id === selectedCategory)
      const selcted_voters_phones= selectedVoters.map((voterId) => {
        const voter = voters.find((v) => v.id === voterId)
        return voter?.phoneNumber
      })
      const expiryTimestamp = Date.now() + expirySeconds * 1000
      const baseUrl = window.location.origin

      const unifiedLinkId = `unified_${selectedCategory}_${Date.now()}`
      const unifiedLinkRef = ref(database, `elections/voting-links/${unifiedLinkId}`)
      await set(unifiedLinkRef, {
        id: unifiedLinkId,
        categoryId: selectedCategory,
        categoryName: selectedCat?.name || "",
        selected_voters:selcted_voters_phones,
        linkType: "unified",
        createdAt: Date.now(),
        expiresAt: expiryTimestamp,
        active: true,
      })

      const unifiedUrl = `${baseUrl}/cast-vote/unified/${unifiedLinkId}`
      setUnifiedLink(unifiedUrl)

      const particularLinkId = `particular_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const selectedVoterData = selectedVoters.map((voterId) => {
        const voter = voters.find((v) => v.id === voterId)
        return {
          id: voterId,
          username: voter?.username || "",
          phoneNumber: voter?.phoneNumber || "",
          personalToken: `${voterId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        }
      })

      const particularLinkRef = ref(database, `elections/voting-links/${particularLinkId}`)
      await set(particularLinkRef, {
        id: particularLinkId,
        categoryId: selectedCategory,
        categoryName: selectedCat?.name || "",
        linkType: "particular",
        createdAt: Date.now(),
        expiresAt: expiryTimestamp,
        active: true,
        voterData: selectedVoterData,
      })

      const generatedUrls = selectedVoterData.map((voter) => {
        const url = `${baseUrl}/cast-vote/particular/${particularLinkId}?token=${voter.personalToken}`
        return `${voter.username} (${voter.phoneNumber}): ${url}`
      })

      setGeneratedLinks(generatedUrls)
      setShowLinksDialog(true)

      toast({
        title: "Success",
        description: `Unified link and ${selectedVoters.length} particular links generated for ${selectedCat?.name}!`,
      })

      setSelectedVoters([])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate voting links",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteToken = async (linkId: string) => {
    try {
      const linkRef = ref(database, `elections/voting-links/${linkId}`)
      await remove(linkRef)
      toast({
        title: "✅ Success!",
        description: "Voting link deleted successfully",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to delete voting link",
        variant: "destructive",
      })
    }
  }

  const resetAllTokens = async () => {
    try {
      const linksRef = ref(database, "elections/voting-links")
      await remove(linksRef)
      setUnifiedLink("")
      toast({
        title: "✅ Success!",
        description: "All voting links have been reset",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to reset all voting links",
        variant: "destructive",
      })
    }
  }

  const resetVoter = async (voterId: string) => {
    try {
      const voterRef = ref(database, `auth/voters/${voterId}`)
      await update(voterRef, { hasVoted: false })
      toast({
        title: "✅ Success!",
        description: "Voter reset successfully - can vote again",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to reset voter",
        variant: "destructive",
      })
    }
  }

  const resetAllVoters = async () => {
    try {
      const votersRef = ref(database, "auth/voters")
      const snapshot = await new Promise((resolve) => {
        onValue(votersRef, resolve, { onlyOnce: true })
      })

      if (snapshot.exists()) {
        const voters = snapshot.val()
        const updates = {}
        Object.keys(voters).forEach((voterId) => {
          updates[`${voterId}/hasVoted`] = false
        })
        await update(votersRef, updates)
        toast({
          title: "✅ Success!",
          description: "All voters have been reset - everyone can vote again",
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to reset all voters",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Enhanced fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        textArea.style.opacity = "0"
        textArea.style.pointerEvents = "none"
        textArea.setAttribute("readonly", "")
        textArea.setAttribute("contenteditable", "true")
        document.body.appendChild(textArea)

        // Focus and select the text
        textArea.focus()
        textArea.select()
        textArea.setSelectionRange(0, text.length)

        // Try to copy using execCommand
        const successful = document.execCommand("copy")
        document.body.removeChild(textArea)

        if (!successful) {
          throw new Error("execCommand failed")
        }
      }

      setCopiedItem(type)
      setTimeout(() => setCopiedItem(""), 2000)
      toast({
        title: "✅ Copied!",
        description: `${type} copied to clipboard`,
        duration: 2000,
      })
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      const fallbackCopy = () => {
        const result = prompt("Copy this link manually:", text)
        if (result !== null) {
          toast({
            title: "📋 Manual Copy",
            description: "Please copy the link from the prompt",
            duration: 3000,
          })
        }
      }

      // Try one more fallback method
      try {
        const textArea = document.createElement("input")
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)

        setCopiedItem(type)
        setTimeout(() => setCopiedItem(""), 2000)
        toast({
          title: "✅ Copied!",
          description: `${type} copied to clipboard (fallback method)`,
          duration: 2000,
        })
      } catch (fallbackError) {
        console.error("All copy methods failed:", fallbackError)
        fallbackCopy()
      }
    }
  }

  const copyIndividualVoterLink = (link: VotingLink, voterData: any) => {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/cast-vote/particular/${link.id}?token=${voterData.personalToken}`
    copyToClipboard(url, `${link.id}-${voterData.id}`)
  }

  const copyLinkUrl = async (link: VotingLink) => {
    const baseUrl = window.location.origin

    if (link.linkType === "unified") {
      const linkUrl = `${baseUrl}/cast-vote/unified/${link.id}`
      await copyToClipboard(linkUrl, `unified-${link.id}`)
    } else {
      if (link.voterData && link.voterData.length > 0) {
        const urls = link.voterData.map((voter) => {
          const url = `${baseUrl}/cast-vote/particular/${link.id}?token=${voter.personalToken}`
          return `${voter.username} (${voter.phoneNumber}): ${url}`
        })
        const allUrls = urls.join("\n\n")
        await copyToClipboard(allUrls, "All particular links")
      }
    }
  }

  const sendAllWhatsApp = () => {
    toast({
      title: "Coming Soon",
      description: "WhatsApp integration will be available soon!",
    })
  }

  const showWhatsAppBusinessPopup = () => {
    setShowWhatsAppDialog(true)
  }

  const isLinkExpired = (link: VotingLink) => Date.now() > link.expiresAt
  const eligibleVoters = filteredVoters.filter((voter) => voter.active && !voter.hasVoted)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row   items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Voting Links</h2>
          <p className="text-gray-600 mt-1">Generate and manage voting links for your election</p>
        </div>
        <div className="flex flex-col md:flex-row  gap-1 space-x-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All Voters
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Voters?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will allow all voters to cast their votes again. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAllVoters} className="bg-red-600 hover:bg-red-700">
                  Reset All Voters
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent">
                <Trash2 className="w-4 h-4 mr-2" />
                Reset All Tokens
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Voting Links?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all generated voting links. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAllTokens} className="bg-red-600 hover:bg-red-700">
                  Reset All Tokens
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Vote className="w-5 h-5 mr-2 text-purple-600" />
            Link Configuration
          </CardTitle>
          <CardDescription>Select voting category and link expiry settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Voting Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voting category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expiry">Link Expiry (seconds)</Label>
              <Input
                id="expiry"
                type="number"
                min="30"
                max="2592000"
                value={expirySeconds}
                onChange={(e) => setExpirySeconds(Number.parseInt(e.target.value) || 1800)}
                placeholder="e.g., 30 (30 sec), 1800 (30 min)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: 30 (30 sec), 1800 (30 min), 3600 (1 hour), 86400 (1 day)
              </p>
            </div>
          </div>
          <Button
            onClick={generateLinks}
            disabled={loading || !selectedCategory || selectedVoters.length === 0}
            className="w-full"
          >
            {loading ? "Generating..." : `Generate Links for ${selectedVoters.length} Voters`}
          </Button>
          {selectedCategory && selectedVoters.length > 0 && (
            <p className="text-sm text-gray-600">
              Will generate: 1 unified link (phone validation for{" "}
              {categories.find((c) => c.id === selectedCategory)?.name}) + {selectedVoters.length} particular links
              (direct access)
              <br />
              Links will expire in {expirySeconds} seconds ({Math.round(expirySeconds / 60)} minutes) after generation
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Select Voters (Required)
          </CardTitle>
          <CardDescription>Choose voters who will be authorized to use the voting links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row  gap-1 items-end space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search voters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Voters</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="voted">Already Voted</SelectItem>
                <SelectItem value="not-voted">Not Voted</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSelectAll}>
              {selectedVoters.length === eligibleVoters.length ? "Deselect All" : "Select All Eligible"}
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredVoters.map((voter) => {
              const isEligible = voter.active && !voter.hasVoted
              const isSelected = selectedVoters.includes(voter.id)

              return (
                <div
                  key={voter.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    !isEligible ? "bg-gray-50 opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleVoterSelect(voter.id, checked as boolean)}
                      disabled={!isEligible}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{voter.username}</p>
                      <p className="text-sm text-gray-500">{voter.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {voter.hasVoted && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 bg-transparent"
                          >
                            <UserX className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset Voter?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will allow {voter.username} to vote again. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => resetVoter(voter.id)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Reset Voter
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {voter.hasVoted && <Badge variant="secondary">Voted</Badge>}
                    {!voter.active && <Badge variant="outline">Inactive</Badge>}
                    {isEligible && <Badge variant="default">Eligible</Badge>}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredVoters.length === 0 && (
            <div className="text-center py-8 text-gray-500">No voters found matching your criteria</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row   items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-green-600" />
              Generated Voting Links
            </CardTitle>
            <CardDescription>Manage previously generated voting links</CardDescription>
          </div>
          <div className="flex flex-col md:flex-row   gap-1 space-x-2">
            <Button
              variant="outline"
              onClick={sendAllWhatsApp}
              disabled={votingLinks.filter((link) => !isLinkExpired(link)).length === 0}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Share All via WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={showWhatsAppBusinessPopup}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 bg-transparent"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send All Links
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {votingLinks.map((link) => (
              <div key={link.id} className="border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row   items-start justify-between p-4 border-b">
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row   gap-1  items-start space-x-2 mb-2">
                      <Badge variant={link.linkType === "unified" ? "default" : "secondary"}>
                        {link.linkType === "unified" ? (
                          <>
                            <Globe className="w-3 h-3 mr-1" />
                            Unified
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Particular
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline">{link.categoryName}</Badge>
                      {isLinkExpired(link) ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {link.linkType === "unified"
                        ? "Available for all registered voters with phone validation"
                        : `${link.voterData?.length || 0} specific voters with direct access`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Expires: {new Date(link.expiresAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Voting Link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this voting link. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteToken(link.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Link
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {link.linkType === "unified" && (
                  <div className="p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Unified Voting Link:</h4>
                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex-1 mr-3">
                        <p className="text-sm font-mono break-all text-gray-800">
                          {`${window.location.origin}/cast-vote/unified/${link.id}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Voters will need to enter their phone number for verification
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLinkUrl(link)}
                        disabled={isLinkExpired(link)}
                        className="hover:bg-blue-50 flex-shrink-0"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        {copiedItem === `unified-${link.id}` ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                )}

                {link.linkType === "particular" && link.voterData && (
                  <div className="p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Individual Voter Links:</h4>
                    <div className="space-y-2">
                      {link.voterData.map((voter, index) => (
                        <div key={index} className="p-3 bg-white rounded border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 mr-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="font-medium text-sm">{voter.username}</p>
                                <p className="text-xs text-gray-500">({voter.phoneNumber})</p>
                              </div>
                              <p className="text-xs font-mono break-all text-gray-700 bg-gray-50 p-2 rounded">
                                {`${window.location.origin}/cast-vote/particular/${link.id}?token=${voter.personalToken}`}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Category: {link.categoryName}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyIndividualVoterLink(link, voter)}
                              disabled={isLinkExpired(link)}
                              className="hover:bg-blue-50 flex-shrink-0"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              {copiedItem === `${link.id}-${voter.id}` ? "Copied!" : "Copy"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {votingLinks.length === 0 && (
              <div className="text-center py-8 text-gray-500">No voting links generated yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
              WhatsApp Business API
            </DialogTitle>
            <DialogDescription>Bulk messaging feature for voting invitations</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon!</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  WhatsApp Business API integration for bulk voting invitations will be available in a future update.
                  This feature will allow you to send voting links directly to multiple voters at once.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowWhatsAppDialog(false)} className="w-full">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLinksDialog} onOpenChange={setShowLinksDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generated Particular Links</DialogTitle>
            <DialogDescription>Individual voting links for selected voters</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {generatedLinks.map((link, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-mono break-all">{link}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(generatedLinks.join("\n\n"))
                toast({ title: "Copied!", description: "All links copied to clipboard" })
              }}
              variant="outline"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy All
            </Button>
            <Button onClick={() => setShowLinksDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
