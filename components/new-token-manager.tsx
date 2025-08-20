"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, off, remove, update } from "firebase/database"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Users,
  Link,
  Clock,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  Globe,
  UserCheck,
  Trash2,
  RotateCcw,
  UserX,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateUnifiedLink, generateParticularLinks, generateParticularLinkUrl } from "@/lib/voting-links"

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
  voterData?: Array<{
    id: string
    username: string
    phoneNumber: string
    personalToken: string
  }>
}

export function NewTokenManager() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [votingLinks, setVotingLinks] = useState<VotingLink[]>([])
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([])
  const [selectedVoters, setSelectedVoters] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "voted" | "not-voted">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [tokenDuration, setTokenDuration] = useState(1800) // 30 minutes default
  const [loading, setLoading] = useState(false)
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false)
  const [showLinksDialog, setShowLinksDialog] = useState(false)
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const votersRef = ref(database, "auth/voters")
    const categoriesRef = ref(database, "elections/categories")
    const linksRef = ref(database, "elections/voting-links")
    const settingsRef = ref(database, "settings/tokenDurationSeconds")

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
        setCategories(categoriesArray.filter((cat) => cat.active))
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

    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const duration = snapshot.val()
      if (duration) {
        setTokenDuration(duration)
      }
    })

    return () => {
      off(votersRef, "value", unsubscribeVoters)
      off(categoriesRef, "value", unsubscribeCategories)
      off(linksRef, "value", unsubscribeLinks)
      off(settingsRef, "value", unsubscribeSettings)
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

  const generateUnifiedVotingLink = async () => {
    if (!selectedCategory) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const unifiedUrl = await generateUnifiedLink(selectedCategory, tokenDuration, selectedVoters)

      await navigator.clipboard.writeText(unifiedUrl)

      toast({
        title: "✅ Success!",
        description:
          selectedVoters.length > 0
            ? `Unified voting link generated for ${selectedVoters.length} selected voters and copied to clipboard!`
            : "Unified voting link generated for all voters and copied to clipboard!",
        duration: 3000,
      })

      setIsDialogOpen(false)
      setSelectedCategory("")
      setSelectedVoters([])
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to generate unified link",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateParticularVotingLinks = async () => {
    if (selectedVoters.length === 0 || !selectedCategory) {
      toast({
        title: "Error",
        description: "Please select voters and a category",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const linkData = await generateParticularLinks(selectedVoters, selectedCategory, tokenDuration)

      const generatedUrls = linkData.voterData.map((voter) => {
        const url = generateParticularLinkUrl(linkData.id, voter.personalToken)
        return `${voter.username} (${voter.phoneNumber}): ${url}`
      })

      setGeneratedLinks(generatedUrls)
      setShowLinksDialog(true)

      await navigator.clipboard.writeText(generatedUrls.join("\n\n"))

      toast({
        title: "✅ Success!",
        description: `${selectedVoters.length} particular voting links generated and copied to clipboard!`,
        duration: 3000,
      })

      setIsDialogOpen(false)
      setSelectedVoters([])
      setSelectedCategory("")
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to generate particular links",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyLinkUrl = async (link: VotingLink) => {
    const baseUrl = window.location.origin
    let linkUrl = ""

    if (link.linkType === "unified") {
      linkUrl = `${baseUrl}/cast-vote/unified/${link.id}`
    } else {
      // For particular links, copy all individual URLs
      if (link.voterData) {
        const urls = link.voterData.map((voter) => {
          const url = generateParticularLinkUrl(link.id, voter.personalToken)
          return `${voter.username}: ${url}`
        })
        linkUrl = urls.join("\n\n")
      }
    }

    try {
      await navigator.clipboard.writeText(linkUrl)
      toast({
        title: "✅ Copied!",
        description: "Voting link(s) copied to clipboard",
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to copy URL",
        variant: "destructive",
      })
    }
  }

  const shareAllWhatsApp = () => {
    const activeLinks = votingLinks.filter((link) => link.active && Date.now() < link.expiresAt)
    if (activeLinks.length === 0) {
      toast({
        title: "No Active Links",
        description: "No active voting links available to share",
        variant: "destructive",
      })
      return
    }

    const baseUrl = window.location.origin
    let message = "🗳️ Election Voting Links\n\n"

    activeLinks.forEach((link, index) => {
      if (link.linkType === "unified") {
        const linkUrl = `${baseUrl}/cast-vote/unified/${link.id}`
        message += `${index + 1}. ${link.categoryName} (Unified Link)\n`
        message += `Link: ${linkUrl}\n`
        message += `Expires: ${new Date(link.expiresAt).toLocaleString()}\n\n`
      } else if (link.voterData) {
        message += `${index + 1}. ${link.categoryName} (Particular Links)\n`
        link.voterData.forEach((voter) => {
          const url = generateParticularLinkUrl(link.id, voter.personalToken)
          message += `${voter.username}: ${url}\n`
        })
        message += `Expires: ${new Date(link.expiresAt).toLocaleString()}\n\n`
      }
    })

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const showWhatsAppBusinessPopup = () => {
    setShowWhatsAppDialog(true)
  }

  const isLinkExpired = (link: VotingLink) => Date.now() > link.expiresAt

  const eligibleVoters = filteredVoters.filter((voter) => voter.active && !voter.hasVoted)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Voting Link Management</h1>
          <p className="text-gray-600 mt-2">Generate unified and particular voting links</p>
        </div>
        <div className="flex space-x-2">
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

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Link className="w-4 h-4 mr-2" />
                Generate Links
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Select Voters (Optional for Unified Links)
          </CardTitle>
          <CardDescription>Choose voters for particular links, or leave empty for unified links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-green-600" />
              Generated Voting Links
            </CardTitle>
            <CardDescription>Manage previously generated voting links</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={shareAllWhatsApp}
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
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
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
                      ? "Available for all registered voters"
                      : `${link.voterData?.length || 0} specific voters`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Expires: {new Date(link.expiresAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLinkUrl(link)}
                    disabled={isLinkExpired(link)}
                    className="hover:bg-blue-50"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
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
                        <AlertDialogAction onClick={() => deleteToken(link.id)} className="bg-red-600 hover:bg-red-700">
                          Delete Link
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {votingLinks.length === 0 && (
              <div className="text-center py-8 text-gray-500">No voting links generated yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Voting Links</DialogTitle>
            <DialogDescription>
              Create unified links (for all voters) or particular links (for selected voters)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Election Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="60"
                max="86400"
                value={tokenDuration}
                onChange={(e) => setTokenDuration(Number.parseInt(e.target.value) || 1800)}
                placeholder="Enter duration in seconds"
              />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Link Types:</p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <strong>Unified Link:</strong> Single link for selected voters (or all if none selected), requires
                  phone verification
                </p>
                <p>
                  <strong>Particular Links:</strong> Individual links for selected voters, no verification needed
                </p>
              </div>
              {selectedVoters.length > 0 && (
                <p className="text-sm text-blue-600 mt-2">Selected voters: {selectedVoters.length}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col space-y-2">
            <div className="flex space-x-2 w-full">
              <Button onClick={generateUnifiedVotingLink} disabled={loading || !selectedCategory} className="flex-1">
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                Unified Link
              </Button>
              <Button
                onClick={generateParticularVotingLinks}
                disabled={loading || !selectedCategory || selectedVoters.length === 0}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                Particular Links
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Unified: Phone verification required | Particular: Direct access with personal tokens
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
