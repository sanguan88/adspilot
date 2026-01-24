"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Star, DollarSign, HelpCircle, AlertTriangle, Info, Eye } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"
import { RekamMedicCategoryModal } from "./rekam-medic-category-modal"

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
}

interface InterpretationProps {
  categoryCounts: {
    stars: number
    cash_cows: number
    question_marks: number
    dogs: number
  }
  totalCampaigns: number
  bcgData?: BCGData[]
  dateRange?: { from: Date | undefined; to: Date | undefined }
  onOpenCategoryDetail: (category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs') => void
}

const COLORS = {
  stars: '#059669',
  cash_cows: '#2563EB',
  question_marks: '#D97706',
  dogs: '#DC2626',
}

const CATEGORY_INFO = {
  stars: {
    icon: Star,
    label: 'TOP PERFORM',
    description: 'Iklan andalan dengan pertumbuhan tinggi dan performa di atas rata-rata',
    action: 'Pertahankan dan tingkatkan investasi',
    color: COLORS.stars,
  },
  cash_cows: {
    icon: DollarSign,
    label: 'REVENUE STABIL',
    description: 'Iklan stabil dengan menghasilkan omzet besar secara konsisten',
    action: 'Pertahankan, optimasi untuk efisiensi',
    color: COLORS.cash_cows,
  },
  question_marks: {
    icon: HelpCircle,
    label: 'FASE TESTING',
    description: 'Iklan baru atau iklan yang masih dalam tahap pengujian potensi',
    action: 'Evaluasi dan optimasi kreatif/targeting',
    color: COLORS.question_marks,
  },
  dogs: {
    icon: AlertTriangle,
    label: 'UNDER PERFORM',
    description: 'Iklan dengan biaya tinggi namun hasil konversi tidak sebanding',
    action: 'Pertimbangkan pause atau optimasi besar segera',
    color: COLORS.dogs,
  },
}

export function RekamMedicInterpretation({ categoryCounts, totalCampaigns, bcgData = [], dateRange, onOpenCategoryDetail }: InterpretationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getCategoryData = (category: keyof typeof categoryCounts) => {
    const count = categoryCounts[category]
    const percentage = totalCampaigns > 0 ? (count / totalCampaigns) * 100 : 0
    const info = CATEGORY_INFO[category]
    const Icon = info.icon

    return {
      ...info,
      count,
      percentage,
      Icon,
      key: category,
    }
  }

  const categories = [
    getCategoryData('stars'),
    getCategoryData('cash_cows'),
    getCategoryData('question_marks'),
    getCategoryData('dogs'),
  ]

  return (
    <Card className="border-gray-300 shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold text-gray-900">IV. INTERPRETASI HASIL</div>
              <Info className="w-4 h-4 text-gray-500" />
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Detailed Explanation */}
              <div className="space-y-6">
                {/* How to Read Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                    Cara Membaca Rekam Medic
                  </h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p>
                      <strong>X-Axis (Performa):</strong> Menunjukkan kinerja relatif iklan dibandingkan rata-rata.
                      Semakin ke kanan, semakin baik performanya.
                    </p>
                    <p>
                      <strong>Y-Axis (Pertumbuhan):</strong> Menunjukkan tingkat pertumbuhan revenue iklan.
                      Semakin ke atas, semakin cepat pertumbuhannya.
                    </p>
                    <p>
                      <strong>Ukuran Titik:</strong> Mewakili besaran spend iklan. Semakin besar titik, semakin besar investasinya.
                    </p>
                  </div>
                </div>

                {/* Category Breakdown Table */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                    Breakdown Kategori
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left p-3 font-bold text-gray-900">Kategori</th>
                          <th className="text-center p-3 font-bold text-gray-900">Jumlah</th>
                          <th className="text-center p-3 font-bold text-gray-900">Persentase</th>
                          <th className="text-center p-3 font-bold text-gray-900">Status</th>
                          <th className="text-left p-3 font-bold text-gray-900">Tindakan</th>
                          <th className="text-center p-3 font-bold text-gray-900">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat, index) => (
                          <motion.tr
                            key={cat.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <cat.Icon className="w-4 h-4" style={{ color: cat.color }} />
                                <span className="font-medium">{cat.label}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold">{cat.count}</td>
                            <td className="p-3 text-center">{cat.percentage.toFixed(1)}%</td>
                            <td className="p-3 text-center">
                              {cat.count > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  {cat.key === 'stars' && <span className="text-green-600">✓</span>}
                                  {cat.key === 'cash_cows' && <span className="text-blue-600">✓</span>}
                                  {cat.key === 'question_marks' && <span className="text-amber-600">⚠</span>}
                                  {cat.key === 'dogs' && <span className="text-red-600">✗</span>}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-gray-600">{cat.action}</td>
                            <td className="p-3 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenCategoryDetail(cat.key)}
                                disabled={cat.count === 0}
                                className="gap-1.5"
                                style={{
                                  borderColor: cat.color,
                                  color: cat.color,
                                }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-xs">Detail</span>
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Category Descriptions */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                    Penjelasan Kategori
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((cat) => (
                      <div
                        key={cat.label}
                        className="p-4 border border-gray-200 rounded-lg"
                        style={{ borderLeftColor: cat.color, borderLeftWidth: '4px' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <cat.Icon className="w-5 h-5" style={{ color: cat.color }} />
                          <h5 className="font-bold text-gray-900">{cat.label}</h5>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{cat.description}</p>
                        <p className="text-xs text-gray-600 italic">→ {cat.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

