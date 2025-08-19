"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { castVote } from "@/lib/token-utils"
import { castVoteWithNewSystem } from "@/lib/voting-cast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { TokenStatus } from "@/components/token-status"
import { UserCheck, CheckCircle, Clock, Vote, Trophy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VotingInterfaceProps {
  token: any
  voter: any
  category: any
  candidates: any[]
}

export function VotingInterface({ token, voter, category, candidates }: VotingInterfaceProps) {
  const [selectedCandidate, setSelectedCandidate] = useState("")
  const [loading, setLoading] = useState(false)
  const [voteSubmitted, setVoteSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [timeExpired, setTimeExpired] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Check if token is expired
    const checkExpiry = () => {
      if (token?.expiresAt && Date.now() > token.expiresAt) {
        setTimeExpired(true)
      }
    }

    checkExpiry()
    const interval = setInterval(checkExpiry, 1000)

    return () => clearInterval(interval)
  }, [token?.expiresAt])

  const handleVoteSubmit = async () => {
    if (!selectedCandidate) {
      setError("Please select a candidate before submitting your vote")
      return
    }

    if (timeExpired) {
      setError("Your voting session has expired. Please request a new voting link.")
      return
    }

    setLoading(true)
    setError("")

    try {
      let result

      if (token.linkType === "unified" || token.linkType === "particular") {
        result = await castVoteWithNewSystem(token.id, token.linkType, voter.id, selectedCandidate)
      } else {
        // Fallback to old system for legacy tokens
        result = await castVote(token.id, voter.id, selectedCandidate)
      }

      if (result.success) {
        setVoteSubmitted(true)
        toast({
          title: "Vote Submitted Successfully!",
          description: "Thank you for participating in the election.",
        })
      } else {
        setError(result.error || "Failed to submit vote")
      }
    } catch (error) {
      setError("An error occurred while submitting your vote. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (timeExpired) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-4">Voting Session Expired</h2>
            <p className="text-red-700 mb-6">
              Your voting link has expired. Please contact the election administrator for a new voting link.
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (voteSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-4">Vote Submitted Successfully!</h2>
            <p className="text-green-700 mb-6">
              Thank you for participating in the election. Your vote has been recorded securely.
            </p>
            <div className="bg-white p-4 rounded-lg border border-green-200 mb-6">
              <p className="text-sm text-gray-600 mb-2">Election Details:</p>
              <p className="font-medium text-gray-900">{category.name}</p>
              <p className="text-sm text-gray-600">Voter: {voter.username}</p>
              <p className="text-xs text-gray-500 mt-2">Vote submitted at {new Date().toLocaleString()}</p>
            </div>
            <Button onClick={() => router.push("/")} className="bg-green-600 hover:bg-green-700">
              Complete
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {token.linkType !== "unified" && <TokenStatus token={token} voter={voter} category={category} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Vote className="w-5 h-5 mr-2 text-blue-600" />
            Select Your Candidate
          </CardTitle>
          <CardDescription>Choose one candidate for {category?.name}. You can only vote once.</CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No candidates available for this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((candidate) => (
                <Card
                  key={candidate.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCandidate === candidate.id
                      ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200"
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedCandidate(candidate.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-5 h-5 text-green-600" />
                        <CardTitle className="text-lg">{candidate.name}</CardTitle>
                      </div>
                      {selectedCandidate === candidate.id && <CheckCircle className="w-5 h-5 text-blue-600" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-3">{candidate.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{category?.name}</Badge>
                      <span className="text-sm text-gray-500">
                        {candidate.votes || 0} vote{(candidate.votes || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {candidates.length > 0 && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleVoteSubmit}
                disabled={!selectedCandidate || loading}
                size="lg"
                className="bg-green-600 hover:bg-green-700 px-8"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting Vote...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Vote className="w-4 h-4" />
                    Submit Vote
                  </div>
                )}
              </Button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Your vote is anonymous and secure. Once submitted, it cannot be changed.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
