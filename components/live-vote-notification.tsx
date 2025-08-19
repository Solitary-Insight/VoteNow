"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, off } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, TrendingUp } from "lucide-react"

interface RecentVote {
  id: string
  candidateName: string
  categoryName: string
  timestamp: number
}

export function LiveVoteNotification() {
  const [recentVotes, setRecentVotes] = useState<RecentVote[]>([])
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    const votesRef = ref(database, "elections/votes")

    const unsubscribe = onValue(votesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const votesArray = Object.entries(data).map(([id, vote]: [string, any]) => ({
          id,
          candidateName: vote.candidateName,
          categoryName: vote.categoryName,
          timestamp: vote.timestamp,
        }))

        // Sort by timestamp and get last 5
        const sortedVotes = votesArray.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

        setRecentVotes(sortedVotes)

        // Show notification for new votes
        if (votesArray.length > 0) {
          setShowNotification(true)
          setTimeout(() => setShowNotification(false), 3000)
        }
      }
    })

    return () => off(votesRef, "value", unsubscribe)
  }, [])

  if (recentVotes.length === 0) return null

  return (
    <Card className={`transition-all duration-500 ${showNotification ? "ring-2 ring-green-500 shadow-lg" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Recent Votes</span>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <div className="space-y-2">
          {recentVotes.map((vote) => (
            <div key={vote.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-gray-700">{vote.candidateName}</span>
                <Badge variant="outline" className="text-xs">
                  {vote.categoryName}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">{new Date(vote.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
