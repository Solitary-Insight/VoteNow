"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, push, onValue, off, set } from "firebase/database"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Users,
  Link,
  Clock,
  Copy,
  Share,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  Settings,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { encryptTokenData } from "@/lib/encryption"

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

interface VotingToken {
  id: string
  voterIds: string[]
  categoryId: string
  categoryName: string
  tokenType: "individual" | "collective"
  expiresAt: number
  createdAt: number
  used: boolean
  voterNames: string[]
}

export function TokenManager() {
  const [voters, setVoters] = useState<Voter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tokens, setTokens] = useState<VotingToken[]>([])
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([])
  const [selectedVoters, setSelectedVoters] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "voted" | "not-voted">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [tokenDuration, setTokenDuration] = useState(30)
  const [tempTokenDuration, setTempTokenDuration] = useState(30)
  const [isUpdatingDuration, setIsUpdatingDuration] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const votersRef = ref(database, "auth/voters")
    const categoriesRef = ref(database, "elections/categories")
    const tokensRef = ref(database, "elections/tokens")
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

    const unsubscribeTokens = onValue(tokensRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const tokensArray = Object.entries(data).map(([id, token]: [string, any]) => ({
          id,
          ...token,
        }))
        setTokens(tokensArray)
      } else {
        setTokens([])
      }
    })

    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const duration = snapshot.val()
      if (duration) {
        setTokenDuration(duration)
        setTempTokenDuration(duration)
      }
    })

    return () => {
      off(votersRef, "value", unsubscribeVoters)
      off(categoriesRef, "value", unsubscribeCategories)
      off(tokensRef, "value", unsubscribeTokens)
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

  const generateToken = async (tokenType: "individual" | "collective") => {
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
      const selectedVoterData = voters.filter((voter) => selectedVoters.includes(voter.id))
      const category = categories.find((cat) => cat.id === selectedCategory)

      if (tokenType === "individual") {
        const generatedUrls: string[] = []

        for (const voter of selectedVoterData) {
          const tokenData = {
            voterId: voter.id,
            phoneNumber: voter.phoneNumber,
            categoryId: selectedCategory,
            tokenType: "individual",
            expiresAt: Date.now() + tokenDuration * 1000,
          }

          const encryptedToken = encryptTokenData(tokenData)
          const baseUrl = window.location.origin
          const tokenUrl = `${baseUrl}/cast-vote/${encryptedToken}`
          generatedUrls.push(`${voter.username}: ${tokenUrl}`)
        }

        await navigator.clipboard.writeText(generatedUrls.join("\n\n"))

        toast({
          title: "✅ Success!",
          description: `${selectedVoterData.length} individual voting links generated and copied to clipboard!`,
          duration: 3000,
        })
      } else {
        const tokenData = {
          voterIds: selectedVoters,
          voterNames: selectedVoterData.map((voter) => voter.username),
          categoryId: selectedCategory,
          categoryName: category?.name || "",
          tokenType,
          expiresAt: Date.now() + tokenDuration * 1000,
          createdAt: Date.now(),
          used: false,
        }

        const tokensRef = ref(database, "elections/tokens")
        const newTokenRef = await push(tokensRef, tokenData)

        const tokenId = newTokenRef.key
        const baseUrl = window.location.origin
        const tokenUrl = `${baseUrl}/cast-vote/${tokenId}`

        await navigator.clipboard.writeText(tokenUrl)

        toast({
          title: "✅ Success!",
          description: "Collective voting link generated and copied to clipboard!",
          duration: 3000,
        })
      }

      setIsDialogOpen(false)
      setSelectedVoters([])
      setSelectedCategory("")
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to generate token",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyTokenUrl = async (tokenId: string) => {
    const baseUrl = window.location.origin
    const tokenUrl = `${baseUrl}/cast-vote/${tokenId}`

    try {
      await navigator.clipboard.writeText(tokenUrl)
      toast({
        title: "✅ Copied!",
        description: "Voting link copied to clipboard",
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

  const shareWhatsApp = (tokenId: string, token: VotingToken) => {
    const baseUrl = window.location.origin
    const tokenUrl = `${baseUrl}/cast-vote/${tokenId}`
    const message = `🗳️ Election Voting Link\n\nCategory: ${token.categoryName}\nExpires: ${new Date(token.expiresAt).toLocaleString()}\n\nClick to vote: ${tokenUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const shareAllWhatsApp = () => {
    const activeTokens = tokens.filter((token) => !isTokenExpired(token))
    if (activeTokens.length === 0) {
      toast({
        title: "No Active Tokens",
        description: "No active tokens available to share",
        variant: "destructive",
      })
      return
    }

    const baseUrl = window.location.origin
    let message = "🗳️ Election Voting Links\n\n"

    activeTokens.forEach((token, index) => {
      const tokenUrl = `${baseUrl}/cast-vote/${token.id}`
      message += `${index + 1}. ${token.categoryName} (${token.tokenType})\n`
      message += `Voters: ${token.voterNames.join(", ")}\n`
      message += `Link: ${tokenUrl}\n`
      message += `Expires: ${new Date(token.expiresAt).toLocaleString()}\n\n`
    })

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const showWhatsAppBusinessPopup = () => {
    setShowWhatsAppDialog(true)
  }

  const isTokenExpired = (token: VotingToken) => Date.now() > token.expiresAt

  const eligibleVoters = filteredVoters.filter((voter) => voter.active && !voter.hasVoted)

  const updateTokenDuration = async () => {
    if (tempTokenDuration < 10 || tempTokenDuration > 3600) {
      toast({
        title: "❌ Invalid Duration",
        description: "Duration must be between 10 and 3600 seconds",
        variant: "destructive",
      })
      return
    }

    setIsUpdatingDuration(true)

    try {
      const settingsRef = ref(database, "settings/tokenDurationSeconds")
      await set(settingsRef, tempTokenDuration)

      toast({
        title: "✅ Success!",
        description: `Token expiry time updated to ${tempTokenDuration} seconds`,
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "❌ Failed!",
        description: "Failed to update token expiry time",
        variant: "destructive",
      })
      setTempTokenDuration(tokenDuration)
    } finally {
      setIsUpdatingDuration(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voting Token Management</h1>
          <p className="text-gray-600 mt-2">Generate and manage voting tokens for selected voters</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={selectedVoters.length === 0}>
              <Link className="w-4 h-4 mr-2" />
              Generate Token ({selectedVoters.length})
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-600" />
            Token Settings
          </CardTitle>
          <CardDescription>Configure voting token expiry duration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="duration">Expiry Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="10"
                max="3600"
                value={tempTokenDuration}
                onChange={(e) => setTempTokenDuration(Number.parseInt(e.target.value) || 30)}
                className="mt-1"
                placeholder="Enter duration in seconds"
              />
              <p className="text-xs text-gray-500 mt-1">Range: 10 seconds to 1 hour (3600 seconds)</p>
            </div>
            <Button
              onClick={updateTokenDuration}
              disabled={isUpdatingDuration || tempTokenDuration === tokenDuration}
              className="mt-6"
            >
              {isUpdatingDuration ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isUpdatingDuration ? "Updating..." : "Update Duration"}
            </Button>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Current Duration:</strong> {tokenDuration} seconds
              {tempTokenDuration !== tokenDuration && (
                <span className="ml-2 text-orange-600">→ Will change to: {tempTokenDuration} seconds</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Select Voters
          </CardTitle>
          <CardDescription>Choose voters to generate voting tokens for</CardDescription>
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
              Generated Tokens
            </CardTitle>
            <CardDescription>Manage previously generated voting tokens</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={shareAllWhatsApp}
            disabled={tokens.filter((token) => !isTokenExpired(token)).length === 0}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Share All via WhatsApp
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant={token.tokenType === "individual" ? "default" : "secondary"}>
                      {token.tokenType}
                    </Badge>
                    <Badge variant="outline">{token.categoryName}</Badge>
                    {isTokenExpired(token) ? (
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
                    {token.voterNames.length} voter{token.voterNames.length !== 1 ? "s" : ""}:{" "}
                    {token.voterNames.join(", ")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Expires: {new Date(token.expiresAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyTokenUrl(token.id)}
                    disabled={isTokenExpired(token)}
                    className="hover:bg-blue-50"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareWhatsApp(token.id, token)}
                    disabled={isTokenExpired(token)}
                    className="hover:bg-green-50"
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={showWhatsAppBusinessPopup}
                    disabled={isTokenExpired(token)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 bg-transparent"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {tokens.length === 0 && <div className="text-center py-8 text-gray-500">No tokens generated yet</div>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Voting Token</DialogTitle>
            <DialogDescription>
              Create voting tokens for {selectedVoters.length} selected voter{selectedVoters.length !== 1 ? "s" : ""}
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Token Settings:</p>
              <p className="text-sm text-gray-600">
                Duration: {tokenDuration} second{tokenDuration !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-gray-600">Selected voters: {selectedVoters.length}</p>
            </div>
          </div>
          <DialogFooter className="flex-col space-y-2">
            <div className="flex space-x-2 w-full">
              <Button
                onClick={() => generateToken("individual")}
                disabled={loading || !selectedCategory}
                className="flex-1"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
                Individual Links
              </Button>
              <Button
                onClick={() => generateToken("collective")}
                disabled={loading || !selectedCategory}
                variant="outline"
                className="flex-1"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Share className="w-4 h-4 mr-2" />}
                Collective Link
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Individual: One link per voter | Collective: Single link for all selected voters
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
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Planned Features:</strong>
                  <br />• Bulk message sending
                  <br />• Custom message templates
                  <br />• Delivery status tracking
                  <br />• Automated reminders
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
    </div>
  )
}
