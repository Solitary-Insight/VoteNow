"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Vote, Shield, Lock, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { user, isAdmin, login } = useAuth()

  useEffect(() => {
    setMounted(true)
    if (user && isAdmin) {
      router.push("/dashboard")
    }
  }, [user, isAdmin, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const success = await login(email, password)

      if (success) {
        router.push("/dashboard")
      } else {
        setError("Invalid email or password. Please check your credentials.")
      }
    } catch (error: any) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-card to-muted">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full animate-float"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/4 w-32 h-32 bg-accent/5 rounded-full animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl mb-4 sm:mb-6 shadow-lg animate-pulse-glow">
              <Vote className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-3 tracking-tight">
              Election Admin
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">Secure access to election management</p>
          </div>

          <Card className="shadow-2xl border border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-xl sm:text-2xl text-center text-card-foreground font-semibold">
                Sign In
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-card-foreground font-medium">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 sm:h-12 pl-10 bg-input border-border focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-card-foreground font-medium">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 sm:h-12 pl-10 pr-12 bg-input border-border focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 text-sm sm:text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-slide-up border-destructive/50 bg-destructive/10">
                    <AlertDescription className="text-destructive-foreground text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-primary-foreground/30 border-t-primary-foreground"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                      Sign In
                    </div>
                  )}
                </Button>
              </form>

              {/* <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="text-center text-xs sm:text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Default Admin Credentials (Auto-filled):</p>
                  <div className="space-y-1">
                    <p className="font-mono text-xs bg-background/50 px-2 py-1 rounded border break-all">
                      abdulhaseeb.solitarydeveloper@gmail.com
                    </p>
                    <p className="font-mono text-xs bg-background/50 px-2 py-1 rounded border">admin123</p>
                  </div>
                </div>
              </div> */}
            </CardContent>
          </Card>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Secured with end-to-end encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
