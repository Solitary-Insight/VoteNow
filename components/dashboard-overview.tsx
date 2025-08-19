"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { database } from "@/lib/firebase"
import { ref, onValue, off } from "firebase/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RealTimeResults } from "@/components/real-time-results"
import { LiveVoteNotification } from "@/components/live-vote-notification"
import { Vote, Users, UserCheck, Trophy, Activity, Clock, Plus, UserPlus, Link2 } from "lucide-react"

export function DashboardOverview() {
  const router = useRouter()
  const [stats, setStats] = useState({
    categories: 0,
    candidates: 0,
    voters: 0,
    totalVotes: 0,
    activeTokens: 0,
    votersWhoVoted: 0,
  })

  useEffect(() => {
    const categoriesRef = ref(database, "elections/categories")
    const candidatesRef = ref(database, "elections/candidates")
    const votersRef = ref(database, "auth/voters")
    const votesRef = ref(database, "elections/votes")
    const tokensRef = ref(database, "elections/tokens")

    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val()
      setStats((prev) => ({ ...prev, categories: data ? Object.keys(data).length : 0 }))
    })

    const unsubscribeCandidates = onValue(candidatesRef, (snapshot) => {
      const data = snapshot.val()
      setStats((prev) => ({ ...prev, candidates: data ? Object.keys(data).length : 0 }))
    })

    const unsubscribeVoters = onValue(votersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const votersArray = Object.values(data) as any[]
        const votersWhoVoted = votersArray.filter((voter) => voter.hasVoted).length
        setStats((prev) => ({
          ...prev,
          voters: votersArray.length,
          votersWhoVoted,
        }))
      } else {
        setStats((prev) => ({ ...prev, voters: 0, votersWhoVoted: 0 }))
      }
    })

    const unsubscribeVotes = onValue(votesRef, (snapshot) => {
      const data = snapshot.val()
      setStats((prev) => ({ ...prev, totalVotes: data ? Object.keys(data).length : 0 }))
    })

    const unsubscribeTokens = onValue(tokensRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const tokensArray = Object.values(data) as any[]
        const activeTokens = tokensArray.filter((token) => Date.now() < token.expiresAt && !token.used).length
        setStats((prev) => ({ ...prev, activeTokens }))
      } else {
        setStats((prev) => ({ ...prev, activeTokens: 0 }))
      }
    })

    return () => {
      off(categoriesRef, "value", unsubscribeCategories)
      off(candidatesRef, "value", unsubscribeCandidates)
      off(votersRef, "value", unsubscribeVoters)
      off(votesRef, "value", unsubscribeVotes)
      off(tokensRef, "value", unsubscribeTokens)
    }
  }, [])

  const statCards = [
    {
      title: "Election Categories",
      value: stats.categories,
      description: "Active election categories",
      icon: Vote,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Candidates",
      value: stats.candidates,
      description: "Total registered candidates",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Registered Voters",
      value: stats.voters,
      description: `${stats.votersWhoVoted} have voted`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Votes",
      value: stats.totalVotes,
      description: "Votes cast so far",
      icon: Trophy,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      pulse: true,
    },
    {
      title: "Active Tokens",
      value: stats.activeTokens,
      description: "Valid voting tokens",
      icon: Clock,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Voter Turnout",
      value: stats.voters > 0 ? `${((stats.votersWhoVoted / stats.voters) * 100).toFixed(1)}%` : "0%",
      description: `${stats.votersWhoVoted} of ${stats.voters} voters`,
      icon: Activity,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Monitor your election system performance and real-time statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold text-gray-900 ${stat.pulse ? "animate-pulse" : ""}`}>
                {stat.value}
              </div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push("/dashboard/categories")}
              className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <Plus className="w-4 h-4 mr-2 text-blue-600 group-hover:scale-110 transition-transform" />
                <div className="font-medium">Create New Category</div>
              </div>
              <div className="text-sm text-gray-500 ml-6">Add a new election category</div>
            </button>
            <button
              onClick={() => router.push("/dashboard/candidates")}
              className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 hover:border-green-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <UserPlus className="w-4 h-4 mr-2 text-green-600 group-hover:scale-110 transition-transform" />
                <div className="font-medium">Add Candidates</div>
              </div>
              <div className="text-sm text-gray-500 ml-6">Register new candidates</div>
            </button>
            <button
              onClick={() => router.push("/dashboard/tokens")}
              className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 hover:border-purple-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <Link2 className="w-4 h-4 mr-2 text-purple-600 group-hover:scale-110 transition-transform" />
                <div className="font-medium">Generate Tokens</div>
              </div>
              <div className="text-sm text-gray-500 ml-6">Create voting tokens</div>
            </button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" />
              System Status
              <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </CardTitle>
            <CardDescription>Current system health and activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Connection</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Authentication</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Real-time Updates</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Vote Processing</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <LiveVoteNotification />

      <RealTimeResults />
    </div>
  )
}
