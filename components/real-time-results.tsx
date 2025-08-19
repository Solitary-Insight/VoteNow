"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, off } from "firebase/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Users, Trophy } from "lucide-react"

interface VoteResult {
  candidateId: string
  candidateName: string
  categoryId: string
  categoryName: string
  votes: number
}

interface CategoryResults {
  [categoryId: string]: {
    categoryName: string
    candidates: VoteResult[]
    totalVotes: number
  }
}

export function RealTimeResults() {
  const [results, setResults] = useState<CategoryResults>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const votesRef = ref(database, "elections/votes")
    const candidatesRef = ref(database, "elections/candidates")

    const unsubscribeVotes = onValue(votesRef, (votesSnapshot) => {
      const votesData = votesSnapshot.val()

      // Get candidates data to build complete results
      const unsubscribeCandidates = onValue(candidatesRef, (candidatesSnapshot) => {
        const candidatesData = candidatesSnapshot.val()

        if (!candidatesData) {
          setResults({})
          setTotalVotes(0)
          setLoading(false)
          return
        }

        // Initialize vote counts
        const voteCount: { [candidateId: string]: number } = {}
        const candidateInfo: { [candidateId: string]: any } = {}

        // Build candidate info map
        Object.entries(candidatesData).forEach(([id, candidate]: [string, any]) => {
          candidateInfo[id] = candidate
          voteCount[id] = 0
        })

        // Count votes
        let total = 0
        if (votesData) {
          Object.values(votesData).forEach((vote: any) => {
            if (voteCount.hasOwnProperty(vote.candidateId)) {
              voteCount[vote.candidateId]++
              total++
            }
          })
        }

        // Group by category
        const categoryResults: CategoryResults = {}
        Object.entries(candidateInfo).forEach(([candidateId, candidate]) => {
          const categoryId = candidate.categoryId

          if (!categoryResults[categoryId]) {
            categoryResults[categoryId] = {
              categoryName: candidate.categoryName,
              candidates: [],
              totalVotes: 0,
            }
          }

          categoryResults[categoryId].candidates.push({
            candidateId,
            candidateName: candidate.name,
            categoryId,
            categoryName: candidate.categoryName,
            votes: voteCount[candidateId],
          })

          categoryResults[categoryId].totalVotes += voteCount[candidateId]
        })

        // Sort candidates by votes within each category
        Object.values(categoryResults).forEach((category) => {
          category.candidates.sort((a, b) => b.votes - a.votes)
        })

        setResults(categoryResults)
        setTotalVotes(total)
        setLoading(false)
      })

      return () => off(candidatesRef, "value", unsubscribeCandidates)
    })

    return () => off(votesRef, "value", unsubscribeVotes)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading real-time results...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Live Election Results
          </CardTitle>
          <CardDescription>Real-time vote counts and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Total Votes Cast:</span>
                <Badge variant="default" className="animate-pulse">
                  {totalVotes}
                </Badge>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">LIVE</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(results).map(([categoryId, categoryData]) => (
        <Card key={categoryId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-orange-600" />
                {categoryData.categoryName}
              </div>
              <Badge variant="outline">
                {categoryData.totalVotes} vote{categoryData.totalVotes !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryData.candidates.map((candidate, index) => {
              const percentage = categoryData.totalVotes > 0 ? (candidate.votes / categoryData.totalVotes) * 100 : 0
              const isLeading = index === 0 && candidate.votes > 0

              return (
                <div key={candidate.candidateId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{candidate.candidateName}</span>
                      {isLeading && (
                        <Badge variant="default" className="bg-green-600">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Leading
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {candidate.votes} vote{candidate.votes !== 1 ? "s" : ""}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2"
                    style={{
                      background: isLeading ? "linear-gradient(to right, #10b981, #059669)" : undefined,
                    }}
                  />
                </div>
              )
            })}

            {categoryData.candidates.length === 0 && (
              <div className="text-center py-4 text-gray-500">No candidates in this category</div>
            )}
          </CardContent>
        </Card>
      ))}

      {Object.keys(results).length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
            <p className="text-gray-500">Results will appear here as votes are cast.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
