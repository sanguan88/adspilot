"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  BarChart3,
  Target,
  ImageIcon,
  Video,
  Grid3X3,
  Loader2,
  AlertCircle,
} from "lucide-react"

interface Campaign {
  id: string
  title: string
  state: 'ongoing' | 'paused' | 'ended' | 'unknown'
  daily_budget: number
  cost: number
  impression: number
  view: number
  broad_order: number
  broad_gmv: number
  objective: string
  spend_percentage: number
  cpm: number
  roas: number
  account_username: string
  account_id: string
  account_email: string
  kode_tim: string
  nama_tim: string
  pic_akun: string
  adSets: AdSet[]
}

interface AdSet {
  id: string
  name: string
  status: "active" | "paused" | "ended"
  targeting: {
    locations: string[]
    interests: string[]
    gender: string
    ageRange: string
  }
  budget: number
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  cpc: number
  ads: Ad[]
}

interface Ad {
  id: string
  name: string
  status: "active" | "paused" | "ended"
  type: "image" | "video" | "carousel"
  headline: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  cpc: number
}

interface CampaignHierarchyProps {
  campaigns: Campaign[]
  loading?: boolean
  error?: string | null
}

export function CampaignHierarchy({ campaigns, loading = false, error = null }: CampaignHierarchyProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set())

  const toggleCampaignExpansion = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
    } else {
      newExpanded.add(campaignId)
    }
    setExpandedCampaigns(newExpanded)
  }

  const toggleAdSetExpansion = (adSetId: string) => {
    const newExpanded = new Set(expandedAdSets)
    if (newExpanded.has(adSetId)) {
      newExpanded.delete(adSetId)
    } else {
      newExpanded.add(adSetId)
    }
    setExpandedAdSets(newExpanded)
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case "ongoing":
        return "bg-green-100 text-green-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "ended":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (state: string) => {
    switch (state) {
      case "ongoing":
        return "Active"
      case "paused":
        return "Paused"
      case "ended":
        return "Ended"
      default:
        return "Unknown"
    }
  }

  const getAdTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4" />
      case "video":
        return <Video className="w-4 h-4" />
      case "carousel":
        return <Grid3X3 className="w-4 h-4" />
      default:
        return <ImageIcon className="w-4 h-4" />
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="p-8">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading campaigns hierarchy...</span>
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading campaigns:</span>
            <span>{error}</span>
          </div>
        </Card>
      </div>
    )
  }

  // Empty state
  if (campaigns.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Tidak ada iklan ditemukan</p>
            <p className="text-sm">Buat iklan pertama Anda untuk memulai</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="overflow-hidden">
          {/* Campaign Level */}
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => toggleCampaignExpansion(campaign.id)} className="p-1">
                  {expandedCampaigns.has(campaign.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  {campaign.state === "ongoing" ? (
                    <Play className="w-4 h-4 text-green-600" />
                  ) : (
                    <Pause className="w-4 h-4 text-yellow-600" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                    <Badge variant="secondary" className={getStatusColor(campaign.state)}>
                      {getStatusText(campaign.state)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {campaign.objective}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Budget: Rp{Math.round(campaign.daily_budget / 100000).toLocaleString('id-ID')}</span>
                    <span>Spend: Rp{Math.round(campaign.cost / 100000).toLocaleString('id-ID')}</span>
                    <span>CTR: {campaign.ctr.toFixed(2)}%</span>
                    <span>Orders: {campaign.broad_order.toLocaleString('id-ID')}</span>
                    <span>ROAS: {campaign.roas.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Account: {campaign.account_username} | Team: {campaign.nama_tim}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right text-sm">
                  <div className="font-medium">Rp{Math.round(campaign.cost / 100000).toLocaleString('id-ID')}</div>
                  <div className="text-gray-500">of Rp{Math.round(campaign.daily_budget / 100000).toLocaleString('id-ID')}</div>
                  <div className="text-xs text-gray-400">{campaign.spend_percentage.toFixed(1)}% spent</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Ad Sets */}
          {expandedCampaigns.has(campaign.id) && (
            <div className="divide-y">
              {campaign.adSets.map((adSet) => (
                <div key={adSet.id}>
                  <div className="p-4 bg-success/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-6" /> {/* Spacer for alignment */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAdSetExpansion(adSet.id)}
                          className="p-1"
                        >
                          {expandedAdSets.has(adSet.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Switch checked={adSet.status === "active"} />
                          <Target className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{adSet.name}</h4>
                            <Badge variant="secondary" className={getStatusColor(adSet.status)}>
                              {adSet.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Budget: ${adSet.budget.toLocaleString()}</span>
                            <span>Spend: ${adSet.spend.toLocaleString()}</span>
                            <span>CTR: {adSet.ctr.toFixed(2)}%</span>
                            <span>{adSet.ads.length} ads</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right text-sm">
                          <div className="font-medium">${adSet.spend.toLocaleString()}</div>
                          <div className="text-gray-500">CPC: ${adSet.cpc.toFixed(2)}</div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Ad Set
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate Ad Set
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Ad Set
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Ads */}
                  {expandedAdSets.has(adSet.id) && (
                    <div className="divide-y bg-gray-50">
                      {adSet.ads.map((ad) => (
                        <div key={ad.id} className="p-4 pl-16">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Switch checked={ad.status === "active"} />
                                {getAdTypeIcon(ad.type)}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-gray-900">{ad.name}</h5>
                                  <Badge variant="secondary" className={getStatusColor(ad.status)}>
                                    {ad.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {ad.type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>Spend: ${ad.spend.toLocaleString()}</span>
                                  <span>CTR: {ad.ctr.toFixed(2)}%</span>
                                  <span>Conversions: {ad.conversions}</span>
                                  <span>CPC: ${ad.cpc.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right text-sm">
                                <div className="font-medium">{ad.impressions.toLocaleString()}</div>
                                <div className="text-gray-500">impressions</div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Ad
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate Ad
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Ad
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
