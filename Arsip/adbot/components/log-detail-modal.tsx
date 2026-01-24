"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"

interface ConditionResult {
  metric: string
  operator: string
  value: number | string
  actualValue?: number | string
  met: boolean
}

interface CampaignDetail {
  campaignId: string
  campaignName: string
  tokoId: string
  tokoName: string
  status: 'success' | 'skipped' | 'failed'
  conditionResults: ConditionResult[]
  action?: {
    type: string
    from?: number | string
    to?: number | string
    description: string
  }
  message: string
}

interface LogDetailData {
  ruleId: string
  ruleName: string
  ruleDescription: string
  category: string
  conditions: string
  campaignDetails: CampaignDetail[]
}

interface LogDetailModalProps {
  isOpen: boolean
  onClose: () => void
  ruleId: string | null
}

export function LogDetailModal({ isOpen, onClose, ruleId }: LogDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [detailData, setDetailData] = useState<LogDetailData | null>(null)

  useEffect(() => {
    if (isOpen && ruleId) {
      fetchLogDetail()
    } else {
      setDetailData(null)
    }
  }, [isOpen, ruleId])

  const fetchLogDetail = async () => {
    if (!ruleId) return

    try {
      setLoading(true)
      const response = await authenticatedFetch(`/api/logs/${ruleId}/detail`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch log detail')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setDetailData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch log detail')
      }
    } catch (error) {
      console.error("Error fetching log detail:", error)
      toast.error("Gagal memuat detail log", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatMetricName = (metric: string): string => {
    const metricMap: { [key: string]: string } = {
      'ctr': 'Tingkat Klik (CTR)',
      'cost': 'Total Biaya Iklan',
      'clicks': 'Jumlah Klik',
      'impressions': 'Jumlah Tampilan',
      'budget': 'Anggaran Harian',
      'orders': 'Jumlah Order',
      'gmv': 'Total Penjualan (GMV)',
      'broad_order': 'Jumlah Order',
      'broad_roi': 'ROAS (Return on Ad Spend)',
      'report_cost': 'Total Biaya Iklan',
      'report_click': 'Jumlah Klik',
      'report_impression': 'Jumlah Tampilan',
      'report_ctr': 'Tingkat Klik (CTR)',
      'report_broad_order': 'Jumlah Order',
      'report_broad_gmv': 'Total Penjualan (GMV)',
      'report_broad_roi': 'ROAS (Return on Ad Spend)',
      'daily_budget': 'Anggaran Harian'
    }
    return metricMap[metric.toLowerCase()] || metric
  }

  const formatOperator = (operator: string): string => {
    const operatorMap: { [key: string]: string } = {
      'greater_than': 'lebih besar dari',
      'less_than': 'kurang dari',
      'greater_than_or_equal': 'lebih besar atau sama dengan',
      'less_than_or_equal': 'kurang atau sama dengan',
      'equal': 'sama dengan',
      '>': 'lebih besar dari',
      '<': 'kurang dari',
      '>=': 'lebih besar atau sama dengan',
      '<=': 'kurang atau sama dengan',
      '=': 'sama dengan',
      '==': 'sama dengan'
    }
    return operatorMap[operator.toLowerCase()] || operator
  }

  const formatValue = (value: number | string | undefined, metric: string): string => {
    // Always treat undefined/null as 0 (not "Tidak tersedia")
    // This ensures we always show a numeric value, even if it's 0
    // The backend query uses COALESCE to ensure we always get 0 instead of NULL
    if (value === undefined || value === null) {
      value = 0
    }
    
    // Convert string to number if it's a numeric string
    let numValue: number | string = value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) {
        numValue = parsed
      } else {
        // If it's not a number, return as string
        return value
      }
    }
    
    // Now numValue is either a number or the original value
    if (typeof numValue === 'number') {
      // Show 0 as 0 (not "Tidak tersedia") since COALESCE in query converts NULL to 0
      const metricLower = metric.toLowerCase()
      if (metricLower.includes('ctr') || metricLower === 'ctr') {
        return `${numValue.toFixed(2)}%`
      } else if (metricLower.includes('cost') || metricLower.includes('budget') || metricLower.includes('gmv') || metricLower.includes('cpm') || metricLower.includes('cpc')) {
        return `Rp ${numValue.toLocaleString('id-ID')}`
      } else {
        // For impressions, clicks, orders, views, etc. - show as number with thousand separator
        return numValue.toLocaleString('id-ID')
      }
    }
    
    return String(value)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Log Eksekusi</DialogTitle>
          <DialogDescription>
            Informasi lengkap eksekusi rule dan dampaknya pada campaign
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-gray-600">Memuat detail log...</span>
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            {/* Rule Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{detailData.ruleName}</h3>
                <Badge variant="outline">{detailData.category}</Badge>
              </div>
              {detailData.ruleDescription && (
                <p className="text-sm text-gray-600">{detailData.ruleDescription}</p>
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">KONDISI:</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-900">{detailData.conditions}</p>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700">EVALUASI & HASIL:</h4>
              <div className="space-y-3">
                {detailData.campaignDetails.map((campaign, idx) => (
                  <div
                    key={`${campaign.campaignId}-${idx}`}
                    className={`border rounded-lg p-4 ${
                      campaign.status === 'success'
                        ? 'border-green-200 bg-green-50/50'
                        : campaign.status === 'failed'
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Campaign Header */}
                      <div className="font-semibold text-gray-900">
                        {campaign.status === 'success' ? '✅' : campaign.status === 'failed' ? '❌' : '❌'} {campaign.campaignName || `Campaign ${campaign.campaignId}`} (Toko: {campaign.tokoName})
                      </div>

                      {/* Condition Results */}
                      {campaign.conditionResults.length > 0 && (
                        <div className="space-y-1 ml-4">
                          {campaign.conditionResults.map((condition, condIdx) => (
                            <div key={condIdx} className="text-sm text-gray-700">
                              • <span className="font-medium">{formatMetricName(condition.metric)}</span>: {formatValue(condition.actualValue, condition.metric)} 
                              <span className={condition.met ? 'text-green-600' : 'text-red-600'}>
                                {' '}({condition.met ? '✓ memenuhi' : '✗ tidak memenuhi'} syarat: {formatOperator(condition.operator)} {formatValue(condition.value, condition.metric)})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action */}
                      {campaign.action && (
                        <div className="text-sm text-gray-700 ml-4 mt-2">
                          <span className="font-medium text-blue-700">→ AKSI YANG DILAKUKAN:</span> {campaign.action.description}
                        </div>
                      )}

                      {/* Status */}
                      <div className="text-sm font-medium text-gray-900 ml-4 mt-2">
                        <span className="font-semibold">→ STATUS:</span>{' '}
                        {campaign.status === 'success' ? (
                          <span className="text-green-600">✅ Berhasil - Rule berhasil diterapkan</span>
                        ) : campaign.status === 'failed' ? (
                          <div className="text-red-600">
                            <div className="font-semibold">❌ Gagal</div>
                            <div className="text-sm mt-1 text-red-700">
                              {campaign.message || 'Terjadi kendala saat mengeksekusi rule. Silakan cek detail log atau coba ulangi nanti.'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-yellow-600">⏭️ Dilewati - {campaign.message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-gray-500">
            Tidak ada data detail
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

