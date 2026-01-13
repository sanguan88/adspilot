"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Star, DollarSign, HelpCircle, AlertTriangle, Play } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { authenticatedFetch } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import * as React from "react"

interface BCGData {
  campaign_id: string
  title: string
  growthRate: number
  marketShare: number
  category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs'
  spend: number
  revenue: number
  roas: number
  image?: string
  id_toko?: string
}

interface CategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs' | null
  campaigns: BCGData[]
  categoryLabel: string
  categoryColor: string
  dateRange?: { from: Date | undefined; to: Date | undefined }
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number = 40): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const COLORS = {
  stars: '#059669',
  cash_cows: '#2563EB',
  question_marks: '#D97706',
  dogs: '#DC2626',
}

const CATEGORY_ICONS = {
  stars: Star,
  cash_cows: DollarSign,
  question_marks: HelpCircle,
  dogs: AlertTriangle,
}

export function RekamMedicCategoryModal({
  open,
  onOpenChange,
  category,
  campaigns,
  categoryLabel,
  categoryColor,
  dateRange,
}: CategoryModalProps) {
  if (!category) return null

  const router = useRouter()
  const Icon = CATEGORY_ICONS[category]
  const filteredCampaigns = campaigns.filter(c => c.category === category)
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map())
  const [loadingImages, setLoadingImages] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const fetchRef = useRef(false)

  // Function to handle execute button click
  const handleExecute = (campaignId: string, tokoId?: string) => {
    // Navigate to campaigns page with filters
    const params = new URLSearchParams()
    if (tokoId) {
      params.append('account_ids', tokoId)
    }
    params.append('search', campaignId)
    router.push(`/campaigns?${params.toString()}`)
    // Close modal after navigation
    onOpenChange(false)
  }

  // Reset fetch flag when modal closes
  useEffect(() => {
    if (!open) {
      setHasFetched(false)
      fetchRef.current = false
      setImageMap(new Map())
      return
    }
  }, [open])

  // Fetch images from Shopee API when modal opens
  useEffect(() => {
    // Only fetch when modal is open, has campaigns, and hasn't been fetched yet
    if (!open || filteredCampaigns.length === 0 || hasFetched || fetchRef.current) {
      return
    }

    const fetchImages = async () => {
      // Prevent concurrent calls
      if (fetchRef.current) return
      fetchRef.current = true
      setLoadingImages(true)

      try {
        // Get unique toko IDs from campaigns
        const tokoIds = Array.from(new Set(
          filteredCampaigns
            .map(c => c.id_toko)
            .filter((id): id is string => !!id)
        ))

        if (tokoIds.length === 0) {
          setLoadingImages(false)
          fetchRef.current = false
          setHasFetched(true)
          return
        }

        // Get campaign IDs
        const campaignIds = filteredCampaigns.map(c => c.campaign_id)

        // Fetch from Shopee API via rekam-medic/images endpoint
        const requestBody: any = {
          campaign_ids: campaignIds,
          toko_ids: tokoIds,
        }

        // Add date range if provided
        if (dateRange?.from && dateRange?.to) {
          requestBody.start_time = dateRange.from.toISOString().split('T')[0]
          requestBody.end_time = dateRange.to.toISOString().split('T')[0]
        }

        const response = await authenticatedFetch('/api/rekam-medic/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const images = new Map<string, string>()
            Object.entries(result.data).forEach(([campaignId, imageUrl]) => {
              if (imageUrl && typeof imageUrl === 'string') {
                images.set(campaignId, imageUrl)
              }
            })
            setImageMap(images)
          }
        } else {
          // Don't retry on error, just log it
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('Failed to fetch images:', response.status, errorText)
        }
      } catch (error) {
        console.error('Error fetching campaign images:', error)
      } finally {
        setLoadingImages(false)
        setHasFetched(true)
        fetchRef.current = false
      }
    }

    fetchImages()
  }, [open, category, filteredCampaigns.length, hasFetched, dateRange]) // Include necessary dependencies

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" style={{ color: categoryColor }} />
              <span className="font-bold">Detail {categoryLabel}</span>
            </div>
            <Badge
              variant="outline"
              style={{
                borderColor: categoryColor,
                backgroundColor: `${categoryColor}15`,
                color: categoryColor
              }}
            >
              {filteredCampaigns.length} Iklan
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-hidden flex flex-col">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Tidak ada iklan dalam kategori ini</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col">
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50 z-10">
                    <TableRow>
                      <TableHead className="w-16 min-w-[64px] font-bold">Image</TableHead>
                      <TableHead className="min-w-[200px] max-w-[300px] font-bold">Judul Iklan</TableHead>
                      <TableHead className="text-center w-24 min-w-[96px] font-bold">Market Share</TableHead>
                      <TableHead className="text-center w-24 min-w-[96px] font-bold">Growth Rate</TableHead>
                      <TableHead className="text-center w-20 min-w-[80px] font-bold">ROAS</TableHead>
                      <TableHead className="text-right w-32 min-w-[128px] font-bold">Revenue</TableHead>
                      <TableHead className="text-right w-32 min-w-[128px] font-bold">Spend</TableHead>
                      <TableHead className="text-center w-24 min-w-[96px] font-bold">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => {
                      // Try to get image from imageMap first, then from campaign.image
                      const fetchedImage = imageMap.get(campaign.campaign_id)
                      const imageUrl = fetchedImage || campaign.image
                        ? (fetchedImage || (campaign.image?.startsWith('http') ? campaign.image : `https://down-id.img.susercontent.com/${campaign.image}`))
                        : null

                      return (
                        <TableRow key={campaign.campaign_id} className="hover:bg-gray-50">
                          <TableCell className="w-16 min-w-[64px]">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={campaign.title}
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  const target = e.currentTarget
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    const placeholder = document.createElement('div')
                                    placeholder.className = 'w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs'
                                    placeholder.textContent = 'No img'
                                    parent.appendChild(placeholder)
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                {loadingImages ? '...' : 'No img'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[200px] max-w-[300px]">
                            <div>
                              <div
                                className="font-medium text-sm text-gray-900"
                                title={campaign.title}
                              >
                                {truncateText(campaign.title, 40)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {campaign.campaign_id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center w-24 min-w-[96px]">
                            <span className="font-bold text-gray-900">
                              {campaign.marketShare.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center w-24 min-w-[96px]">
                            <span className="font-bold text-gray-900">
                              {campaign.growthRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center w-20 min-w-[80px]">
                            <span className="font-bold text-gray-900">
                              {campaign.roas.toFixed(2)}x
                            </span>
                          </TableCell>
                          <TableCell className="text-right w-32 min-w-[128px]">
                            <span className="text-sm text-gray-900 whitespace-nowrap">
                              Rp {Math.round(campaign.revenue).toLocaleString('id-ID')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right w-32 min-w-[128px]">
                            <span className="text-sm text-gray-900 whitespace-nowrap">
                              Rp {Math.round(campaign.spend).toLocaleString('id-ID')}
                            </span>
                          </TableCell>
                          <TableCell className="text-center w-24 min-w-[96px]">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleExecute(campaign.campaign_id, campaign.id_toko)}
                              title="Buka halaman iklan dengan filter toko dan campaign ID"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Eksekusi
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

