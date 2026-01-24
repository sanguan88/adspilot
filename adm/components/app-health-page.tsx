"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Monitor, Zap } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts } from "@/lib/design-tokens"
import { getStatusBadgeVariant } from "@/components/ui/badge-variants"

interface HealthStatus {
  status: string
  timestamp: string
  services: {
    database: {
      status: string
      responseTime: number
    }
    mainApp: {
      status: string
      uptime: number
    }
    worker: {
      status: string
      uptime: number
    }
  }
}

export function AppHealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch("/api/health")
      const data = await response.json()

      if (data.success) {
        setHealth(data.data)
        setLastChecked(new Date())
      } else {
        toast.error("Gagal memuat health status")
      }
    } catch (error) {
      console.error("Error fetching health:", error)
      toast.error("Terjadi kesalahan saat memuat health status")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Auto refresh every 10 seconds for real-time monitoring
    const interval = setInterval(fetchHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-success" />
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-destructive" />
      default:
        return <AlertCircle className="w-5 h-5 text-warning" />
    }
  }

  const getStatusBadge = (status: string) => {
    return getStatusBadgeVariant(status)
  }

  if (loading && !health) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={pageLayout.container}>
      <div className={pageLayout.content}>
        <div className={pageLayout.header}>
          <div>
            <h1 className={pageLayout.headerTitle}>Application Health</h1>
            <p className={pageLayout.headerDescription}>
              Monitor status aplikasi dan worker
            </p>
          </div>
          <div className={`flex items-center ${standardSpacing.gap.lg}`}>
            {lastChecked && (
              <span className={typography.muted}>
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status & Services Status */}
        <div className={gridLayouts.threeColumn}>
          <Card>
            <CardHeader>
              <CardTitle>Overall Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {health && getStatusIcon(health.status)}
                  <div>
                    <p className="text-lg font-semibold text-foreground capitalize">{health?.status || 'Unknown'}</p>
                    <p className={typography.mutedSmall}>
                      {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>
                {health && (
                  <Badge className={getStatusBadge(health.status)}>
                    {health.status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={standardSpacing.card}>
                <div className="flex items-center justify-between">
                  <span className={typography.body}>Status</span>
                  {health && getStatusIcon(health.services.database.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className={typography.muted}>Response Time</span>
                  <span className={`${typography.label} text-foreground`}>
                    {health?.services.database.responseTime || 0}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  {health && (
                    <Badge className={getStatusBadge(health.services.database.status)}>
                      {health.services.database.status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Main Application
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  {health && getStatusIcon(health.services.mainApp.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-semibold">
                    {health?.services.mainApp.uptime || 0}s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  {health && (
                    <Badge className={getStatusBadge(health.services.mainApp.status)}>
                      {health.services.mainApp.status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Automation Worker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  {health && getStatusIcon(health.services.worker.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-semibold">
                    {health?.services.worker.uptime || 0}s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  {health && (
                    <Badge className={getStatusBadge(health.services.worker.status)}>
                      {health.services.worker.status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={typography.muted}>CPU Usage</span>
                  <span className={`${typography.label} text-foreground`}>0%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={typography.muted}>Memory Usage</span>
                  <span className={`${typography.label} text-foreground`}>0%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={typography.muted}>Disk Usage</span>
                  <span className={`${typography.label} text-foreground`}>0%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
