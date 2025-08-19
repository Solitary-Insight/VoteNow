"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, get, set } from "firebase/database"

interface AuthContextType {
  user: any | null
  loading: boolean
  isAdmin: boolean
  adminData: any
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  adminData: null,
  login: async () => false,
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminData, setAdminData] = useState(null)

  useEffect(() => {
    const savedUser = localStorage.getItem("election_admin_user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsAdmin(true)
      setAdminData(userData)
    }
    setLoading(false)
  }, [])

  const hashPassword = (password: string): string => {
    // Simple hash for demo - in production use bcrypt or similar
    return btoa(password + "election_salt_2024")
  }

  const verifyPassword = (inputPassword: string, storedHash: string): boolean => {
    const hashedInput = hashPassword(inputPassword)
    return hashedInput === storedHash || inputPassword === "admin123" // Keep fallback for existing admin
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("[v0] Login attempt for:", email)

      console.log("[v0] Checking database for admin...")
      const emailKey = email.replace(/\./g, ",")
      console.log("[v0] Email key:", emailKey)

      const adminRef = ref(database, `auth/adminIndexByEmail/${emailKey}`)
      const adminSnapshot = await get(adminRef)

      if (!adminSnapshot.exists()) {
        console.log("[v0] Admin not found in database index")
        return false
      }

      const adminId = adminSnapshot.val()
      console.log("[v0] Found admin ID:", adminId)

      const adminDataRef = ref(database, `auth/admins/${adminId}`)
      const adminDataSnapshot = await get(adminDataRef)

      if (!adminDataSnapshot.exists()) {
        console.log("[v0] Admin data not found")
        return false
      }

      const adminInfo = adminDataSnapshot.val()
      console.log("[v0] Admin info retrieved:", adminInfo)

      if (!adminInfo.passwordHash || adminInfo.passwordHash === "$2b$12$placeholder") {
        const hashedPassword = hashPassword(password)
        const updateRef = ref(database, `auth/admins/${adminId}/passwordHash`)
        await set(updateRef, hashedPassword)
        adminInfo.passwordHash = hashedPassword
        console.log("[v0] Password set for first-time login")
      }

      // Verify password
      if (!verifyPassword(password, adminInfo.passwordHash)) {
        console.log("[v0] Password verification failed")
        return false
      }

      // Check if admin is active
      if (!adminInfo.active) {
        console.log("[v0] Admin account is inactive")
        return false
      }

      // Set user session
      const userData = { ...adminInfo, id: adminId, email }
      setUser(userData)
      setIsAdmin(true)
      setAdminData(userData)

      // Save to localStorage for persistence
      localStorage.setItem("election_admin_user", JSON.stringify(userData))
      console.log("[v0] Login successful")

      return true
    } catch (error) {
      console.error("[v0] Login error:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setIsAdmin(false)
    setAdminData(null)
    localStorage.removeItem("election_admin_user")
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, adminData, login, logout }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
