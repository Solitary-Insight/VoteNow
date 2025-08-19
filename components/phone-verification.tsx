"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Phone, ArrowRight } from "lucide-react"

interface PhoneVerificationProps {
  onVerify: (phoneNumber: string) => Promise<void>
  loading: boolean
}

export function PhoneVerification({ onVerify, loading }: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!phoneNumber.trim()) {
      setError("Please enter your phone number")
      return
    }

    const phoneRegex = /^\+?[\d\s\-$$$$.]+$/
    if (!phoneRegex.test(phoneNumber)) {
      setError("Please enter a valid phone number")
      return
    }

    const cleanedPhone = phoneNumber.replace(/[\s\-$$$$.]/g, "")
    if (cleanedPhone.length < 10) {
      setError("Phone number must be at least 10 digits")
      return
    }

    try {
      await onVerify(phoneNumber.trim())
    } catch (error) {
      setError("Verification failed. Please try again.")
    }
  }

  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center flex items-center justify-center">
          <Phone className="w-6 h-6 mr-2 text-blue-600" />
          Phone Verification
        </CardTitle>
        <CardDescription className="text-center">
          Enter your registered phone number to access the unified voting link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890 or 1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="h-11"
            />
            <p className="text-xs text-gray-500">
              Enter the phone number you registered with (with or without country code)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Verifying...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Verify & Continue
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>This is a secure unified voting link.</p>
          <p className="mt-1">Only registered voters can access this election.</p>
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> Make sure to use the same phone number format you registered with
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
