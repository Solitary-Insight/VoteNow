"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CastVoteIndexPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Voting Link</h1>
          <p className="text-gray-600 mb-6">
            This page requires a valid voting token. Please use the complete voting link provided by the election
            administrator.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-700 mb-2">Valid voting links look like:</p>
            <p className="text-xs font-mono text-gray-600 break-all">https://yoursite.com/cast-vote/abc123token</p>
          </div>
          <Button onClick={() => router.push("/")} variant="outline">
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
