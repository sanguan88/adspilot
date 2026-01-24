"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Filter, AlertCircle, CheckCircle, Clock, XCircle, Loader2, RefreshCw } from "lucide-react"

interface Log {
  id: string
  timestamp: string
  rule: string
  action: string
  target: string
  status: "success" | "failed" | "pending"
  details: string
  account: string
  category?: string
  rule_id?: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [ruleFilter, setRuleFilter] = useState("all-rules")

  // Fetch logs from API
  const fetchLogs = async (customSearch?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (ruleFilter !== "all-rules") {
        params.append("ruleFilter", ruleFilter)
      }
      const searchValue = customSearch !== undefined ? customSearch : searchQuery
      if (searchValue) {
        params.append("search", searchValue)
      }

      const response = await authenticatedFetch(`/api/logs?${params.toString()}`)
      
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      
      const result = await response.json()

      if (result.success) {
        setLogs(result.data || [])
      } else {
        console.error("Failed to fetch logs:", result.error)
        setLogs([])
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch logs on mount and when filters change
  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, ruleFilter])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs()
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const filteredLogs = useMemo(() => {
    let filtered = [...logs]

    // Filter berdasarkan search query (client-side filtering sebagai backup)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.rule.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.target.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query) ||
          log.account.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [logs, searchQuery])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "bg-success/10 text-success",
      failed: "bg-destructive/10 text-destructive",
      pending: "bg-warning/10 text-warning",
    }
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Activity Logs</h1>
              <p className="text-sm text-gray-600 mt-1">Track all automation rule executions and system activities</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="tertiary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search logs..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ruleFilter} onValueChange={setRuleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-rules">All Rules</SelectItem>
                <SelectItem value="budget">Budget Rules</SelectItem>
                <SelectItem value="performance">Performance Rules</SelectItem>
                <SelectItem value="notification">Notifications</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="bg-white mx-6 my-6 rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule & Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-gray-500">Loading logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="text-sm text-gray-500">No logs found</div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.timestamp}</div>
                        <div className="text-xs text-gray-500">{log.account}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{log.rule}</div>
                        <div className="text-sm text-gray-500">{log.action}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{log.target}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Badge className={getStatusBadge(log.status)}>{log.status}</Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">{log.details}</div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
