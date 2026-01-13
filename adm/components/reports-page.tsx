"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, TrendingUp, DollarSign, Users, Download, Calendar } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, filterPanel } from "@/lib/design-tokens"

export function ReportsPage() {
  const [reportType, setReportType] = useState("revenue")
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date
  })
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const generateReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("type", reportType)
      if (startDate) {
        params.append("startDate", format(startDate, "yyyy-MM-dd"))
      }
      if (endDate) {
        params.append("endDate", format(endDate, "yyyy-MM-dd"))
      }

      const response = await authenticatedFetch(`/api/reports?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setReportData(data.data)
        toast.success("Report generated successfully")
      } else {
        toast.error(data.error || "Gagal generate report")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Terjadi kesalahan saat generate report")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateReport()
  }, [reportType, startDate, endDate])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className={pageLayout.container}>
      <div className={pageLayout.content}>
        <div className={pageLayout.header}>
          <div>
            <h1 className={pageLayout.headerTitle}>Reports & Analytics</h1>
            <p className={pageLayout.headerDescription}>
              Generate reports dan analytics
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className={filterPanel.container}>
          <CardContent className={filterPanel.content}>
            <div className={filterPanel.grid4}>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue Report</SelectItem>
                  <SelectItem value="users">User Growth Report</SelectItem>
                  <SelectItem value="usage">Usage Report</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="h-4 w-4" />
                    {startDate ? format(startDate, "dd MMM yyyy") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date)
                      setStartDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="h-4 w-4" />
                    {endDate ? format(endDate, "dd MMM yyyy") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date)
                      setEndDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button onClick={generateReport} disabled={loading}>
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Results */}
        {reportData && (
          <div className={gridLayouts.twoColumn}>
            {reportType === "revenue" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className={componentSizes.cardIcon} />
                      Revenue Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={standardSpacing.card}>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Total Revenue</span>
                        <span className="text-lg font-semibold text-foreground">
                          {formatPrice(reportData.totalRevenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Monthly Recurring Revenue</span>
                        <span className="text-lg font-semibold text-foreground">
                          {formatPrice(reportData.monthlyRecurringRevenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>New Subscriptions</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.newSubscriptions || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Cancelled Subscriptions</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.cancelledSubscriptions || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={typography.muted}>
                      Revenue data akan ditampilkan di sini
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {reportType === "users" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className={componentSizes.cardIcon} />
                      User Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={standardSpacing.card}>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Total Users</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.totalUsers || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>New Users</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.newUsers || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Active Users</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.activeUsers || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Churned Users</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.churnedUsers || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Growth Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData.data && reportData.data.length > 0 ? (
                      <div className={standardSpacing.compact}>
                        {reportData.data.slice(0, 10).map((item: any, index: number) => (
                          <div key={index} className={`flex justify-between ${typography.body}`}>
                            <span>{format(new Date(item.date), "dd MMM yyyy")}</span>
                            <span className="font-semibold text-foreground">{item.new_users} users</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={typography.muted}>No data available</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {reportType === "usage" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className={componentSizes.cardIcon} />
                      Usage Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={standardSpacing.card}>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Total API Calls</span>
                        <span className="text-lg font-semibold text-foreground">
                          {(reportData.totalApiCalls || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Total Accounts</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.totalAccounts || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={typography.muted}>Total Campaigns</span>
                        <span className="text-lg font-semibold text-foreground">
                          {reportData.totalCampaigns || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usage Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={typography.muted}>
                      Usage data akan ditampilkan di sini
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Export Options */}
        {reportData && (
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={standardSpacing.gap.md}>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const params = new URLSearchParams()
                      params.append("type", reportType)
                      params.append("format", "csv")
                      if (startDate) {
                        params.append("startDate", format(startDate, "yyyy-MM-dd"))
                      }
                      if (endDate) {
                        params.append("endDate", format(endDate, "yyyy-MM-dd"))
                      }

                      const response = await authenticatedFetch(
                        `/api/reports/export?${params.toString()}`
                      )
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      toast.success("Report exported successfully")
                    } catch (error) {
                      console.error("Error exporting report:", error)
                      toast.error("Gagal export report")
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export as CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const params = new URLSearchParams()
                      params.append("type", reportType)
                      params.append("format", "json")
                      if (startDate) {
                        params.append("startDate", format(startDate, "yyyy-MM-dd"))
                      }
                      if (endDate) {
                        params.append("endDate", format(endDate, "yyyy-MM-dd"))
                      }

                      const response = await authenticatedFetch(
                        `/api/reports/export?${params.toString()}`
                      )
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.json`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      toast.success("Report exported successfully")
                    } catch (error) {
                      console.error("Error exporting report:", error)
                      toast.error("Gagal export report")
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export as JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info("PDF export akan segera tersedia")
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export as PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info("Excel export akan segera tersedia")
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export as Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
