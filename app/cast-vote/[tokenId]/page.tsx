"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { validateToken } from "@/lib/token-utils"
import { PhoneVerification } from "@/components/phone-verification"
import { VotingInterface } from "@/components/voting-interface"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Vote, AlertCircle } from "lucide-react"

export default function CastVotePage() {
  const params = useParams()
  const tokenId = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [validationResult, setValidationResult] = useState<any>(null)
  const [phoneVerified, setPhoneVerified] = useState(false)

  useEffect(() => {
    if (tokenId) {
      handleInitialValidation()
    }
  }, [tokenId])

  const handleInitialValidation = async () => {
    setLoading(true)
    setError("")

    try {
      const result = await validateToken(tokenId)

      if (!result.isValid) {
        setError(result.error || "Invalid token")
        setLoading(false)
        return
      }
      setValidationResult(result)

      // For individual tokens, proceed directly to voting
      if (result.token?.tokenType === "individual") {
        setPhoneVerified(true)
      }

      setLoading(false)
    } catch (error) {
      setError("An error occurred while validating the token")
      setLoading(false)
    }
    console.log('"first"', JSON.stringify("first", null, 2))
  }

  const handlePhoneVerification = async (phoneNumber: string) => {
    setLoading(true)
    setError("")

    try {
      const result = await validateToken(tokenId, phoneNumber)

      if (!result.isValid) {
        setError(result.error || "Phone verification failed")
        setLoading(false)
        return
      }

      setValidationResult(result)
      setPhoneVerified(true)
      setLoading(false)
    } catch (error) {
      setError("An error occurred during phone verification")
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
          <p className="text-gray-700 text-lg font-medium">Validating your voting link...</p>
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

  if (!phoneVerified && validationResult?.token?.tokenType === "collective") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100 p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full mb-6 animate-pulse">
              <Vote className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 animate-fade-in">Group Voting</h1>
            <p className="text-gray-600 text-lg">Verify your phone number to continue</p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-700 text-sm">
                📱 Enter your registered phone number to access the voting interface
              </p>
            </div>
          </div>
          <PhoneVerification onVerify={handlePhoneVerification} loading={loading} />
        </div>
      </div>
    )
  }

  if (phoneVerified && validationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-cyan-100 p-4">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-600 to-cyan-600 rounded-full mb-6 animate-bounce">
              <Vote className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Cast Your Vote</h1>
            <p className="text-gray-600 text-lg">Select your preferred candidate</p>
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
            token={validationResult.token}
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
