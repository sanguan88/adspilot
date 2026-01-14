"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Star, AlertTriangle, HelpCircle, TrendingUp, Target } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"

interface RecommendationsProps {
  categoryCounts: {
    stars: number
    cash_cows: number
    question_marks: number
    dogs: number
  }
  totalCampaigns: number
  avgROAS: number
  avgCTR: number
  avgConversionRate: number
}

export function RekamMedicRecommendations({
  categoryCounts,
  totalCampaigns,
  avgROAS,
  avgCTR,
  avgConversionRate,
}: RecommendationsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const starsCount = categoryCounts.stars
  const dogsCount = categoryCounts.dogs
  const questionMarksCount = categoryCounts.question_marks
  const cashCowsCount = categoryCounts.cash_cows
  const dogsPercentage = totalCampaigns > 0 ? (dogsCount / totalCampaigns) * 100 : 0

  // Generate recommendations based on data
  const recommendations = []

  // Priority 1: TOP PERFORM (Stars)
  if (starsCount > 0) {
    recommendations.push({
      priority: 1,
      icon: Star,
      title: `PRIORITAS TINGGI: TOP PERFORM (${starsCount} iklan)`,
      description: `${starsCount} iklan Anda menunjukkan pertumbuhan tinggi dengan performa di atas rata-rata (Iklan Andalan).`,
      actions: [
        'Pertahankan budget dan tingkatkan investasi pada iklan TOP PERFORM',
        'Monitor performa secara berkala untuk memastikan konsistensi',
        'Scale up iklan TOP PERFORM yang menunjukkan ROI/ROAS terbaik',
        'Gunakan data TOP PERFORM sebagai benchmark untuk optimasi iklan lain',
      ],
      color: '#059669',
    })
  }

  // Priority 2: BOROS BUDGET (Dogs)
  if (dogsCount > 0) {
    const dogsPercentage = (dogsCount / totalCampaigns) * 100
    recommendations.push({
      priority: 2,
      icon: AlertTriangle,
      title: `PERHATIAN: UNDER PERFORM (${dogsCount} iklan - ${dogsPercentage.toFixed(1)}%)`,
      description: `${dogsCount} iklan (${dogsPercentage.toFixed(1)}%) masuk kategori UNDER PERFORM yang memerlukan evaluasi segera karena biaya tinggi vs hasil rendah.`,
      actions: [
        'Evaluasi satu per satu iklan UNDER PERFORM untuk menentukan penyebab performa rendah',
        'Pertimbangkan pause atau stop iklan yang jelas tidak efektif',
        'Lakukan optimasi besar (kreatif, targeting, budget) sebelum stop',
        'Alihkan budget dari UNDER PERFORM ke TOP PERFORM untuk efisiensi',
      ],
      color: '#DC2626',
    })
  }

  // Priority 3: FASE TESTING (Question Marks)
  if (questionMarksCount > 0) {
    recommendations.push({
      priority: 3,
      icon: HelpCircle,
      title: `MONITORING: FASE TESTING (${questionMarksCount} iklan)`,
      description: `${questionMarksCount} iklan menunjukkan potensi (sedang diuji) tapi perlu optimasi lebih lanjut untuk naik kelas.`,
      actions: [
        'Berikan waktu 1-2 minggu untuk optimasi kreatif dan targeting',
        'Monitor metrik utama (CTR, Conversion, ROAS) secara ketat',
        'Set deadline: jika tidak membaik setelah optimasi, pertimbangkan stop',
        'Pelajari dari TOP PERFORM untuk strategi optimasi',
      ],
      color: '#D97706',
    })
  }

  // Priority 4: REVENUE STABIL (Cash Cows)
  if (cashCowsCount > 0) {
    recommendations.push({
      priority: 4,
      icon: TrendingUp,
      title: `STABIL: REVENUE STABIL (${cashCowsCount} iklan)`,
      description: `${cashCowsCount} iklan stabil dengan menghasilkan omzet besar secara konsisten.`,
      actions: [
        'Pertahankan budget dan optimasi untuk efisiensi',
        'Monitor untuk memastikan tidak turun ke kategori UNDER PERFORM',
        'Gunakan sebagai sumber pendapatan stabil untuk operasional',
      ],
      color: '#2563EB',
    })
  }

  // Overall insights
  const insights = []

  if (avgROAS > 300) {
    insights.push({
      type: 'positive',
      text: `ROAS rata-rata ${avgROAS.toFixed(1)}% menunjukkan performa yang sangat baik.`,
    })
  }

  if (dogsPercentage > 50) {
    insights.push({
      type: 'warning',
      text: `Lebih dari 50% iklan masuk kategori Dogs - perlu evaluasi menyeluruh.`,
    })
  }

  if (starsCount > 0 && starsCount / totalCampaigns > 0.2) {
    insights.push({
      type: 'positive',
      text: `${((starsCount / totalCampaigns) * 100).toFixed(1)}% iklan adalah Stars - portofolio yang sehat.`,
    })
  }

  return (
    <Card className="border-gray-300 shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold text-gray-900">IV. REKOMENDASI</div>
              <Target className="w-4 h-4 text-gray-500" />
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
              <div className="space-y-6">
                {/* Detailed Recommendations */}
                <div className="space-y-4">
                  {recommendations.map((rec, index) => {
                    const Icon = rec.icon
                    return (
                      <motion.div
                        key={rec.priority}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-5 border-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                        style={{
                          borderColor: rec.color,
                          borderLeftWidth: '4px',
                          borderRightWidth: '1px',
                          borderTopWidth: '1px',
                          borderBottomWidth: '1px',
                        }}
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{
                              backgroundColor: `${rec.color}15`,
                            }}
                          >
                            <Icon className="w-5 h-5" style={{ color: rec.color }} />
                          </div>
                          <div className="flex-1">
                            <h5
                              className="font-bold text-gray-900 mb-2 text-base"
                              style={{ color: rec.color }}
                            >
                              {rec.title}
                            </h5>
                            <p className="text-sm text-gray-600 leading-relaxed">{rec.description}</p>
                          </div>
                        </div>
                        <div className="ml-14 mt-4 pt-4 border-t border-gray-100">
                          <div
                            className="text-xs font-bold uppercase tracking-wide mb-3"
                            style={{ color: rec.color }}
                          >
                            Tindakan yang Disarankan:
                          </div>
                          <ul className="space-y-2.5">
                            {rec.actions.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                                <span
                                  className="mt-1 flex-shrink-0"
                                  style={{ color: rec.color }}
                                >
                                  →
                                </span>
                                <span className="leading-relaxed">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Overall Insights */}
                {insights.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Insight Tambahan</h4>
                    <div className="space-y-2">
                      {insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-sm ${insight.type === 'positive'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                        >
                          {insight.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

