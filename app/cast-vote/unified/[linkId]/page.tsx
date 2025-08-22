"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Globe, Phone } from "lucide-react"
import { ref, get } from "firebase/database"
import { database } from "@/lib/firebase"
import {generatePakistaniNumberVariants} from '@/lib/get_pakistani_numbers_varient'

export default function UnifiedVotePage() {
  const params = useParams()
  const router = useRouter()
  const linkId = params.linkId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [linkData, setLinkData] = useState<any>(null)

  useEffect(() => {
    if (linkId) {
      validateLinkExists()
    }
  }, [linkId])

  const validateLinkExists = async () => {
    try {
      console.log("[SOLITAY_DEBUG_TOKEN]:  Checking if unified link exists:", linkId)
      const linkRef = ref(database, `elections/voting-links/${linkId}`)
      const snapshot = await get(linkRef)

      if (!snapshot.exists()) {
        setError("Invalid or expired voting link")
        setLoading(false)
        return
      }

      const data = snapshot.val()
      if (data.linkType !== "unified") {
        setError("This is not a valid unified voting link")
        setLoading(false)
        return
      }

      if (!data.active || Date.now() > data.expiresAt) {
        setError("This voting link has expired")
        setLoading(false)
        return
      }

      console.log("[SOLITAY_DEBUG_TOKEN]:  Link validation successful for category:", data.categoryName)


      setLinkData(data)

      setLoading(false)
    } catch (error) {
      console.error("[SOLITAY_DEBUG_TOKEN]:  Error validating link:", error)
      setError("Failed to validate voting link")
      setLoading(false)
    }
  }

  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setError("")

    try {
      console.log("[SOLITAY_DEBUG_TOKEN]:  Starting phone verification for:", phoneNumber)

      const normalizePhone = (phone: string) => phone.replace(/[^\d]/g, "")
      const normalizedPhone = normalizePhone(phoneNumber)

      const phoneFormats = [
        phoneNumber.trim(),
        normalizedPhone,
        `+92${normalizedPhone.startsWith("0") ? normalizedPhone.substring(1) : normalizedPhone}`,
        `92${normalizedPhone.startsWith("0") ? normalizedPhone.substring(1) : normalizedPhone}`,
        normalizedPhone.startsWith("0") ? normalizedPhone : `0${normalizedPhone}`,
      ]


      var isListed = false
      for (const format of generatePakistaniNumberVariants(phoneNumber)) {
        for (const allowedPhones of linkData.selected_voters){
          if(allowedPhones==format){
            isListed=true
          }
        }
      }
      if(!isListed){

        setError("Sorry! You are listed to use this token. Please contact adminstrator.")

        return
      }

      let foundVoter = null
      let voterKey = null

      console.log("[SOLITAY_DEBUG_TOKEN]:  Searching for voter with phone formats:", phoneFormats)

      // First try using the phone index for faster lookup
      for (const format of phoneFormats) {
        const indexKey = normalizePhone(format)
        const phoneIndexRef = ref(database, `auth/voterIndexByPhone/${indexKey}`)
        const indexSnapshot = await get(phoneIndexRef)

        if (indexSnapshot.exists()) {
          voterKey = indexSnapshot.val()
          const voterRef = ref(database, `auth/voters/${voterKey}`)
          const voterSnapshot = await get(voterRef)

          if (voterSnapshot.exists()) {
            foundVoter = voterSnapshot.val()
            console.log("[SOLITAY_DEBUG_TOKEN]:  Found voter via index:", foundVoter.username, "with key:", voterKey)
            break
          }
        }
      }

      // Fallback: search through all voters if index lookup fails
      if (!foundVoter) {
        console.log("[SOLITAY_DEBUG_TOKEN]:  Index lookup failed, searching all voters...")
        const votersRef = ref(database, "auth/voters")
        const snapshot = await get(votersRef)

        if (snapshot.exists()) {
          const voters = snapshot.val()
          for (const [key, voter] of Object.entries(voters)) {
            const voterData = voter as any
            const voterPhone = normalizePhone(voterData.phoneNumber)

            for (const format of phoneFormats) {
              const formatNormalized = normalizePhone(format)
              if (voterPhone === formatNormalized || voterData.phoneNumber === format) {
                foundVoter = voterData
                voterKey = key
                console.log("[SOLITAY_DEBUG_TOKEN]:  Found voter via full search:", voterData.username, "with phone:", format)
                break
              }
            }
            if (foundVoter) break
          }
        }
      }

      if (!foundVoter) {
        console.log("[SOLITAY_DEBUG_TOKEN]:  No voter found with phone number:", phoneNumber)
        setError("Phone number not found. Please check your number or contact the administrator.")
        setVerifying(false)
        return
      }

      if (!foundVoter.active) {
        setError("Your account is not active. Please contact the administrator.")
        setVerifying(false)
        return
      }

      if (foundVoter.hasVoted) {
        setError("You have already cast your vote for this election.")
        setVerifying(false)
        return
      }

      console.log("[SOLITAY_DEBUG_TOKEN]:  Phone verification successful, redirecting to vote")
      router.push(`/cast-vote/unified/${linkId}/vote?voterId=${voterKey}`)
    } catch (error) {
      console.error("[SOLITAY_DEBUG_TOKEN]:  Phone verification error:", error)
      setError("An error occurred during phone verification. Please try again.")
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-200 border-t-cyan-600 mx-auto mb-6"></div>
          </div>
          <p className="text-gray-700 text-lg font-medium">Validating your voting link...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full mb-6">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Unified Voting</h1>
          <p className="text-gray-600 text-lg">
            {linkData?.categoryName ? `Voting for: ${linkData.categoryName}` : "Enter your phone number to vote"}
          </p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-6">
            <form onSubmit={handlePhoneVerification} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Enter your registered phone number</p>
              </div>

              <Button type="submit" className="w-full" disabled={verifying || !phoneNumber.trim()}>
                {verifying ? "Verifying..." : "Verify & Vote"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
