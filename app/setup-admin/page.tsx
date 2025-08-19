"use client"

import { useState } from "react"
import { database } from "@/lib/firebase"
import { ref, set, get } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SetupAdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const initializeAdmin = async () => {
    setIsLoading(true)
    setMessage("")

    try {
      console.log("[v0] Starting admin initialization...")

      // Check if admin already exists
      const adminRef = ref(database, "admins/main_admin")
      const adminSnapshot = await get(adminRef)

      if (adminSnapshot.exists()) {
        setMessage("Admin already exists in database!")
        setIsSuccess(true)
        setIsLoading(false)
        return
      }

      const adminData = {
        admins: {
          main_admin: {
            email: "abdulhaseeb.solitarydeveloper@gmail.com",
            password: "admin123",
            role: "admin",
            createdAt: new Date().toISOString(),
          },
        },
        emailIndex: {
          "abdulhaseeb,solitarydeveloper,gmail,com": "main_admin",
        },
        categories: {},
        candidates: {},
        voters: {},
        votes: {},
        tokens: {},
        settings: {
          votingEnabled: false,
          allowMultipleVotes: false,
          requireTokens: true,
        },
      }

      console.log("[v0] Writing admin data to database...")

      // Write all data to Firebase
      await set(ref(database), adminData)

      console.log("[v0] Admin initialization completed successfully")
      setMessage(
        "Admin user initialized successfully! You can now login with abdulhaseeb.solitarydeveloper@gmail.com / admin123",
      )
      setIsSuccess(true)
    } catch (error) {
      console.error("[v0] Admin initialization failed:", error)
      setMessage(`Failed to initialize admin: ${error.message}`)
      setIsSuccess(false)
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Admin User</CardTitle>
          <CardDescription>Initialize the admin user in Firebase database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert className={isSuccess ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
              <AlertDescription className={isSuccess ? "text-green-700" : "text-red-700"}>{message}</AlertDescription>
            </Alert>
          )}

          <Button onClick={initializeAdmin} disabled={isLoading} className="w-full">
            {isLoading ? "Initializing..." : "Initialize Admin User"}
          </Button>

          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Email:</strong> abdulhaseeb.solitarydeveloper@gmail.com
            </p>
            <p>
              <strong>Password:</strong> admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
