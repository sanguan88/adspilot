"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, AlertCircle, Play, Info, Activity, Layers, Target, Clock, Terminal } from "lucide-react"
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
  logId: string | null
}

export function LogDetailModal({ isOpen, onClose, logId }: LogDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [detailData, setDetailData] = useState<LogDetailData | null>(null)

  useEffect(() => {
    if (isOpen && logId) {
      fetchLogDetail()
    } else {
      setDetailData(null)
    }
  }, [isOpen, logId])

  const fetchLogDetail = async () => {
    if (!logId) return

    try {
      setLoading(true)
      // Note: We're still hitting the same base endpoint but passing logId
      // The backend will be updated to handlelogId if passed
      const response = await authenticatedFetch(`/api/logs/detail?logId=${logId}`)

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
      'ctr': 'CTR',
      'cost': 'Biaya Iklan',
      'clicks': 'Klik',
      'impressions': 'Tampilan',
      'budget': 'Anggaran',
      'orders': 'Order',
      'gmv': 'GMV',
      'broad_order': 'Order',
      'broad_roi': 'ROAS',
      'report_cost': 'Biaya Iklan',
      'report_click': 'Klik',
      'report_impression': 'Tampilan',
      'report_ctr': 'CTR',
      'report_broad_order': 'Order',
      'report_broad_gmv': 'GMV',
      'report_broad_roi': 'ROAS',
      'daily_budget': 'Anggaran'
    }
    return metricMap[metric.toLowerCase()] || metric
  }

  const formatOperator = (operator: string): string => {
    const operatorMap: { [key: string]: string } = {
      'greater_than': '>',
      'less_than': '<',
      'greater_than_or_equal': '≥',
      'less_than_or_equal': '≤',
      'equal': '=',
      '>': '>',
      '<': '<',
      '>=': '≥',
      '<=': '≤',
      '=': '=',
      '==': '='
    }
    return operatorMap[operator.toLowerCase()] || operator
  }

  const formatValue = (value: number | string | undefined, metric: string): string => {
    if (value === undefined || value === null) value = 0

    let numValue: number | string = value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) numValue = parsed
      else return value
    }

    if (typeof numValue === 'number') {
      const metricLower = metric.toLowerCase()
      if (metricLower.includes('ctr') || metricLower === 'ctr') return `${numValue.toFixed(2)}%`
      if (metricLower.includes('cost') || metricLower.includes('budget') || metricLower.includes('gmv') || metricLower.includes('cpm') || metricLower.includes('cpc')) {
        return `Rp${numValue.toLocaleString('id-ID')}`
      }
      return numValue.toLocaleString('id-ID')
    }

    return String(value)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl border-none shadow-2xl">
        <DialogHeader className="p-4 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Terminal className="w-5 h-5 text-slate-600" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-bold text-gray-900 leading-none">
                Detail Eksekusi: {loading ? '...' : detailData?.ruleName || 'Rule'}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-gray-400 font-medium">
                {detailData?.category} • {detailData?.conditions && detailData.conditions.replace(/[()]/g, '')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-4 bg-white space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading...</span>
            </div>
          ) : detailData ? (
            <div className="divide-y divide-gray-100">
              {detailData.campaignDetails.map((campaign, idx) => {
                const isSkipped = campaign.message && campaign.message.includes('Dilewati')
                const isSuccess = campaign.status === 'success' && !isSkipped
                const isFailed = campaign.status === 'failed'

                return (
                  <div key={`${campaign.campaignId}-${idx}`} className="py-4 first:pt-0 last:pb-0">
                    {/* Header: Campaign & Status */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="text-sm font-bold text-gray-800 leading-tight">
                          {campaign.campaignName}
                        </h5>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                          {campaign.tokoName} • ID: {campaign.campaignId}
                        </p>
                      </div>
                      <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isSuccess ? 'bg-emerald-50 text-emerald-600' :
                        isSkipped ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                        {isSuccess ? 'Berhasil' : isSkipped ? 'Dilewati' : 'Gagal'}
                      </div>
                    </div>

                    {/* Conditions Summary */}
                    <div className="space-y-1.5 mb-3">
                      {campaign.conditionResults.map((condition, condIdx) => (
                        <div key={condIdx} className="flex items-center gap-2 text-xs">
                          {condition.met ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="text-gray-600 font-medium">
                            {formatMetricName(condition.metric)}:
                            <span className="ml-1 text-gray-900 font-bold">{formatValue(condition.actualValue, condition.metric)}</span>
                            <span className="ml-1 text-gray-400">
                              (Target {formatOperator(condition.operator)} {formatValue(condition.value, condition.metric)})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Action Result */}
                    <div className={`p-2.5 rounded-lg border flex items-center gap-3 ${isSuccess ? 'bg-emerald-50/30 border-emerald-100/50 text-emerald-800' :
                      isSkipped ? 'bg-slate-50 border-gray-100 text-gray-600' :
                        'bg-rose-50/30 border-rose-100/50 text-rose-800'
                      }`}>
                      <div className={`p-1 rounded bg-white shadow-sm shrink-0`}>
                        {isSuccess ? <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" /> :
                          isSkipped ? <Clock className="w-3 h-3 text-slate-400" /> :
                            <Info className="w-3 h-3 text-rose-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate">
                          {campaign.message.includes(' - ') ? campaign.message.split(' - ')[1] : campaign.message}
                        </p>
                        {campaign.action && isSuccess && (
                          <p className="text-[10px] font-medium italic opacity-80 truncate">
                            Aksi: {campaign.action.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-20 text-center space-y-2">
              <Layers className="w-10 h-10 text-gray-100 mx-auto" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tidak ada data</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold text-gray-500 hover:text-gray-900"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
