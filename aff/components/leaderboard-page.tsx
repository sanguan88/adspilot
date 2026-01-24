"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Medal, Award, TrendingUp } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"

interface LeaderboardEntry {
  rank: number
  affiliateId: string
  affiliateName: string
  affiliateCode: string
  totalCommission: number
  totalReferrals: number
  conversionRate: number
  isCurrentUser: boolean
}

export function LeaderboardPage() {
  const { user } = useAuth()
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overall")

  useEffect(() => {
    fetchLeaderboard('overall')
    fetchLeaderboard('monthly')
  }, [])

  const fetchLeaderboard = async (type: 'overall' | 'monthly') => {
    try {
      const response = await authenticatedFetch(`/api/leaderboard?type=${type}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          if (type === 'overall') {
            setOverallLeaderboard(data.data || [])
          } else {
            setMonthlyLeaderboard(data.data || [])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      toast.error('Gagal memuat leaderboard')
    } finally {
      setIsLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }

  const renderLeaderboard = (entries: LeaderboardEntry[]) => {
    if (isLoading) {
      return <TableSkeleton />
    }

    if (entries.length === 0) {
      return (
        <EmptyState
          icon={<Trophy className="w-12 h-12" />}
          title="Belum ada data leaderboard"
          description="Leaderboard akan muncul setelah ada affiliate yang aktif"
        />
      )
    }

    return (
      <div className="space-y-3">
        {entries.map((entry) => (
          <Card
            key={entry.affiliateId}
            className={entry.isCurrentUser ? 'border-primary bg-primary/5' : ''}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">
                      {entry.affiliateName}
                    </p>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Code: {entry.affiliateCode}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-semibold">
                    Rp{(entry.totalCommission / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.totalReferrals} referrals • {entry.conversionRate}% CR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Ranking affiliate berdasarkan performance
        </p>
      </div>

      {/* Top 3 Podium */}
      {!isLoading && overallLeaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd Place */}
          {overallLeaderboard[1] && (
            <Card className="border-gray-300">
              <CardContent className="p-4 text-center">
                <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="font-semibold text-sm mb-1">2nd</p>
                <p className="text-xs font-medium truncate">{overallLeaderboard[1].affiliateName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rp{(overallLeaderboard[1].totalCommission / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>
          )}

          {/* 1st Place */}
          {overallLeaderboard[0] && (
            <Card className="border-yellow-400 bg-yellow-50">
              <CardContent className="p-4 text-center">
                <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                <p className="font-bold text-sm mb-1">1st</p>
                <p className="text-xs font-medium truncate">{overallLeaderboard[0].affiliateName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rp{(overallLeaderboard[0].totalCommission / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>
          )}

          {/* 3rd Place */}
          {overallLeaderboard[2] && (
            <Card className="border-amber-300">
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="font-semibold text-sm mb-1">3rd</p>
                <p className="text-xs font-medium truncate">{overallLeaderboard[2].affiliateName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rp{(overallLeaderboard[2].totalCommission / 1000).toFixed(0)}K
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Leaderboard Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Full Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="monthly">This Month</TabsTrigger>
            </TabsList>
            <TabsContent value="overall" className="mt-4">
              {renderLeaderboard(overallLeaderboard)}
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
              {renderLeaderboard(monthlyLeaderboard)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

