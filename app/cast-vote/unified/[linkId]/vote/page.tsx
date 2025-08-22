"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { VotingInterface } from "@/components/voting-interface"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Vote, AlertCircle, Loader2 } from "lucide-react"
import { ref, get } from "firebase/database"
import { database } from "@/lib/firebase"

export default function UnifiedVotePage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const linkId = params.linkId as string
  const voterId = searchParams.get("voterId")

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [voterData, setVoterData] = useState<any>(null)
  const [linkData, setLinkData] = useState<any>(null)
  const [categoryData, setCategoryData] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])

  useEffect(() => {
    const loadVoterData = async () => {
      if (!voterId) {
        setError("Invalid access - voter ID missing")
        setIsLoading(false)
        return
      }

      try {
        console.log("[v0] Loading voter data for:", voterId)

        const voterRef = ref(database, `auth/voters/${voterId}`)
        const snapshot = await get(voterRef)

        if (!snapshot.exists()) {
          setError("Voter not found")
          setIsLoading(false)
          return
        }

        const voter = snapshot.val()

        if (!voter.active) {
          setError("Voter account is not active")
          setIsLoading(false)
          return
        }

        if (voter.hasVoted) {
          setError("You have already cast your vote")
          setIsLoading(false)
          return
        }

        const linkRef = ref(database, `elections/voting-links/${linkId}`)
        const linkSnapshot = await get(linkRef)

        if (!linkSnapshot.exists()) {
          setError("Voting link not found")
          setIsLoading(false)
          return
        }

        const linkData = linkSnapshot.val()
        console.log('linkData', JSON.stringify(linkData, null, 2))
        if (linkData.linkType !== "unified" || !linkData.active) {
          setError("Voting link is no longer valid")
          setIsLoading(false)
          return
        }

        if (linkData.expiresAt && Date.now() > linkData.expiresAt) {
          setError("Voting link has expired")
          setIsLoading(false)
          return
        }

        const categoryRef = ref(database, `elections/categories/${linkData.categoryId}`)
        const categorySnapshot = await get(categoryRef)

        if (!categorySnapshot.exists()) {
          setError("Election category not found")
          setIsLoading(false)
          return
        }

        const category = categorySnapshot.val()

        const candidatesRef = ref(database, `elections/candidates`)
        const candidatesSnapshot = await get(candidatesRef)

        let categoryCandidate = []
        if (candidatesSnapshot.exists()) {
          const allCandidates = candidatesSnapshot.val()
          categoryCandidate = Object.entries(allCandidates)
            .filter(([_, candidate]: [string, any]) => candidate.categoryId === linkData.categoryId && candidate.active)
            .map(([id, candidate]: [string, any]) => ({
              id,
              ...candidate,
            }))
        }

        console.log("[v0] Voter data loaded successfully")
        setVoterData({ ...voter, id: voterId })
        setLinkData(linkData)
        setCategoryData({ ...category, id: linkData.categoryId })
        setCandidates(categoryCandidate)
        setIsLoading(false)
      } catch (error) {
        console.error("[v0] Error loading voter:", error)
        setError("Failed to load voter data")
        setIsLoading(false)
      }
    }

    loadVoterData()
  }, [voterId, linkId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-200 border-t-cyan-600 mx-auto"></div>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
            <span className="text-gray-700 font-medium">Loading voting interface...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Error</h1>
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">
                If you believe this is an error, please contact the election administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-cyan-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-600 to-cyan-600 rounded-full mb-6">
            <Vote className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Cast Your Vote</h1>
          <p className="text-gray-600 text-lg">Select your preferred candidate</p>
          <div className="mt-4 p-4 bg-white/50 backdrop-blur-sm rounded-lg inline-block">
            <p className="text-gray-700 font-medium">
              Voter: <span className="text-cyan-600">{voterData.username}</span>
            </p>
            <p className="text-gray-600 text-sm">Phone: {voterData.phoneNumber}</p>
          </div>
        </div>

        <VotingInterface token={linkData} voter={voterData} category={categoryData} candidates={candidates} />
      </div>
    </div>
  )
}
