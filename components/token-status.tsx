"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, XCircle, Users, Vote } from "lucide-react"
import { formatTimeRemaining } from "@/lib/token-utils"

interface TokenStatusProps {
  token: any
  voter?: any
  category?: any
}

export function TokenStatus({ token, voter, category }: TokenStatusProps) {
  const [timeRemaining, setTimeRemaining] = useState("")

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(formatTimeRemaining(token.expiresAt))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [token.expiresAt])

  const isExpired = Date.now() > token.expiresAt

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Vote className="w-5 h-5 mr-2 text-blue-600" />
          Voting Information
        </CardTitle>
        <CardDescription>Your voting session details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Election Category</p>
            <p className="text-lg font-semibold text-gray-900">{category?.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Token Type</p>
            <Badge variant={token.tokenType === "individual" ? "default" : "secondary"}>
              {token.tokenType === "individual" ? "Individual" : "Group"}
            </Badge>
          </div>
        </div>

        {voter && (
          <div>
            <p className="text-sm font-medium text-gray-700">Voter</p>
            <div className="flex items-center space-x-2 mt-1">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-900">{voter.username}</span>
              <span className="text-gray-500">({voter.phoneNumber})</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Time Remaining</span>
          </div>
          <div className="flex items-center space-x-2">
            {isExpired ? (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-600 font-medium">Expired</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-medium">{timeRemaining}</span>
              </>
            )}
          </div>
        </div>

        {token.tokenType === "collective" && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium text-blue-800 mb-1">Group Voting Link</p>
            <p>This link can be used by multiple authorized voters. Each voter can only vote once.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
