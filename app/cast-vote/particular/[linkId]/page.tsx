"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { validateParticularLink } from "@/lib/voting-links"
import { VotingInterface } from "@/components/voting-interface"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, UserCheck } from "lucide-react"

export default function ParticularVotePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const linkId = params.linkId as string
  const personalToken = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [validationResult, setValidationResult] = useState<any>(null)

  useEffect(() => {
    if (linkId && personalToken) {
      handleValidation()
    } else {
      setError("Invalid voting link. Missing required parameters.")
      setLoading(false)
    }
  }, [linkId, personalToken])

  const handleValidation = async () => {
    setLoading(true)
    setError("")

    try {
      const result = await validateParticularLink(linkId, personalToken!)

      if (!result.isValid) {
        setError(result.error || "Invalid voting link")
        setLoading(false)
        return
      }

      setValidationResult(result)
      setLoading(false)
    } catch (error) {
      setError("An error occurred while validating the voting link")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-200 border-t-cyan-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-cyan-400 mx-auto animate-pulse"></div>
          </div>
          <p className="text-gray-700 text-lg font-medium">Validating your personal voting link...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we verify your access</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
        <Card className="w-full max-w-md shadow-xl animate-slide-up">
          <CardContent className="text-center py-12">
            <div className="animate-bounce mb-6">
              <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <Alert variant="destructive" className="mb-6 animate-fade-in">
              <AlertDescription className="text-left">{error}</AlertDescription>
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

  if (validationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-cyan-100 p-4">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-600 to-cyan-600 rounded-full mb-6 animate-bounce">
              <UserCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Cast Your Vote</h1>
            <p className="text-gray-600 text-lg">Your personal voting link</p>
            <div className="mt-4 p-4 bg-white/50 backdrop-blur-sm rounded-lg inline-block">
              <p className="text-gray-700 font-medium">
                Category: <span className="text-cyan-600">{validationResult.category.name}</span>
              </p>
              <p className="text-gray-600 text-sm">
                Voter: <span className="font-medium">{validationResult.voter.username}</span>
              </p>
            </div>
          </div>
          <VotingInterface
            token={validationResult.linkData}
            voter={validationResult.voter}
            category={validationResult.category}
            candidates={validationResult.candidates}
          />
        </div>
      </div>
    )
  }

  return null
}
