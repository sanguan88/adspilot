"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Heart, Share2, ShoppingCart, MessageSquare, Reply } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HourlyDataPoint {
  time: string // Format "HH:MM"
  timestamp: number
  engagedCcu: number
  addToCart: number
  confirmedOrder: number
}

interface LivePerformanceChartProps {
  hourlyData: HourlyDataPoint[]
  username?: string
  sessionId?: string
  onBotAction?: (action: string, enabled: boolean) => void
  botStates?: {
    like?: boolean
    share?: boolean
    addToCart?: boolean
    autoKomentar?: boolean
    autoReply?: boolean
  }
}

const METRICS = [
  { key: "engagedCcu", label: "Penonton Aktif", color: "#4caf50" }, // green
  { key: "addToCart", label: "Add to Cart", color: "#ff9800" }, // orange
  { key: "confirmedOrder", label: "Pesanan", color: "#f44336" }, // red
]

export function LivePerformanceChart({ 
  hourlyData = [], 
  username, 
  sessionId,
  onBotAction,
  botStates = {}
}: LivePerformanceChartProps) {
  // Ambil data terbaru (max 60 data point untuk tampilan yang smooth)
  const recentData = hourlyData.slice(-60)
  
  const chartData = recentData.map((item) => ({
    name: item.time,
    engagedCcu: item.engagedCcu,
    addToCart: item.addToCart,
    confirmedOrder: item.confirmedOrder,
  }))
  
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(METRICS.map((m) => m.key)),
  )

  const handleMetricToggle = (key: string) => {
    setSelectedMetrics((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  return (
    <div className="flex flex-col h-full glass-card border border-white/10 rounded-lg p-2 md:p-4 bg-white/5">
      {/* Legend dengan checkbox */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3 md:mb-4 pb-2 md:pb-3 border-b border-white/10">
        {METRICS.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2 group">
            <Checkbox
              id={`metric-${metric.key}`}
              checked={selectedMetrics.has(metric.key)}
              onCheckedChange={() => handleMetricToggle(metric.key)}
              className="h-4 w-4 border-white/50 bg-white/5 rounded transition-all duration-200
                hover:border-white/70 hover:bg-white/10 
                data-[state=checked]:bg-white/25 data-[state=checked]:border-white/80 
                data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-white/50 
                focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            />
            <Label 
              htmlFor={`metric-${metric.key}`} 
              className="text-xs text-white/90 cursor-pointer hover:text-white transition-colors flex items-center gap-2"
            >
              <span 
                className="inline-block w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-110" 
                style={{ backgroundColor: metric.color }}
              />
              <span style={{ color: metric.color, fontWeight: '600' }}>{metric.label}</span>
            </Label>
          </div>
        ))}
      </div>
      
      {/* Chart Container */}
      <div className="flex-1 min-h-[180px] md:min-h-[200px] px-0 md:px-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
              top: 8,
              right: 25,
              left: 15,
              bottom: 15,
          }}
        >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255, 255, 255, 0.1)" 
              vertical={true} 
              horizontal={true}
            />
          <XAxis 
            dataKey="name" 
              stroke="rgba(255, 255, 255, 0.6)"
              tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.8)' }}
            interval="preserveStartEnd"
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              height={30}
            />
            <YAxis 
              stroke="rgba(255, 255, 255, 0.6)"
              tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.8)' }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              width={45}
            />
          <Tooltip
            contentStyle={{
                backgroundColor: "rgba(26, 26, 26, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 8,
                backdropFilter: "blur(10px)",
            }}
              labelStyle={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: "semibold" }}
              itemStyle={{ color: "rgba(255, 255, 255, 0.8)" }}
              cursor={{ stroke: "rgba(255, 255, 255, 0.2)", strokeWidth: 1 }}
          />
            <Legend 
              wrapperStyle={{ color: "rgba(255, 255, 255, 0.9)", paddingTop: "5px", fontSize: "11px" }}
              iconType="line"
              iconSize={12}
            />
          {METRICS.map(
            (metric) =>
              selectedMetrics.has(metric.key) && (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                    activeDot={{ r: 5, fill: metric.color, stroke: "rgba(255, 255, 255, 0.8)", strokeWidth: 2 }}
                  strokeWidth={2}
                    dot={{ stroke: metric.color, strokeWidth: 1.5, fill: metric.color, r: 2.5 }}
                  connectNulls={true}
                />
              ),
          )}
        </LineChart>
      </ResponsiveContainer>
      </div>
      
      {/* Bot Control Buttons - Below Legend */}
      {(username && sessionId) && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* LIKE Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBotAction?.('like', !botStates.like)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                botStates.like
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:bg-red-500/30 hover:border-red-500/70 hover:shadow-[0_0_16px_rgba(239,68,68,0.3)] hover:scale-105'
                  : 'bg-white/5 text-white/70 border-white/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:shadow-[0_0_8px_rgba(239,68,68,0.15)] hover:scale-105'
              }`}
            >
              <Heart className={`h-4 w-4 transition-transform ${botStates.like ? 'fill-red-400 text-red-400' : 'text-red-400'} group-hover:scale-110`} />
              <span className="text-xs font-semibold uppercase">LIKE</span>
            </Button>

            {/* SHARE Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBotAction?.('share', !botStates.share)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                botStates.share
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.2)] hover:bg-blue-500/30 hover:border-blue-500/70 hover:shadow-[0_0_16px_rgba(59,130,246,0.3)] hover:scale-105'
                  : 'bg-white/5 text-white/70 border-white/20 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 hover:shadow-[0_0_8px_rgba(59,130,246,0.15)] hover:scale-105'
              }`}
            >
              <Share2 className={`h-4 w-4 transition-transform ${botStates.share ? 'fill-blue-400 text-blue-400' : 'text-blue-400'} group-hover:scale-110`} />
              <span className="text-xs font-semibold uppercase">SHARE</span>
            </Button>

            {/* ADD TO CART Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBotAction?.('addToCart', !botStates.addToCart)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                botStates.addToCart
                  ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.2)] hover:bg-green-500/30 hover:border-green-500/70 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)] hover:scale-105'
                  : 'bg-white/5 text-white/70 border-white/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30 hover:shadow-[0_0_8px_rgba(34,197,94,0.15)] hover:scale-105'
              }`}
            >
              <ShoppingCart className={`h-4 w-4 transition-transform ${botStates.addToCart ? 'fill-green-400 text-green-400' : 'text-green-400'} group-hover:scale-110`} />
              <span className="text-xs font-semibold uppercase">ADD TO CART</span>
            </Button>

            {/* AUTO KOMENTAR Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBotAction?.('autoKomentar', !botStates.autoKomentar)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                botStates.autoKomentar
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)] hover:bg-purple-500/30 hover:border-purple-500/70 hover:shadow-[0_0_16px_rgba(168,85,247,0.3)] hover:scale-105'
                  : 'bg-white/5 text-white/70 border-white/20 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30 hover:shadow-[0_0_8px_rgba(168,85,247,0.15)] hover:scale-105'
              }`}
            >
              <MessageSquare className={`h-4 w-4 transition-transform ${botStates.autoKomentar ? 'fill-purple-400 text-purple-400' : 'text-purple-400'} group-hover:scale-110`} />
              <span className="text-xs font-semibold uppercase">AUTO KOMENTAR</span>
            </Button>

            {/* AUTO REPLY Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBotAction?.('autoReply', !botStates.autoReply)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                botStates.autoReply
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:bg-amber-500/30 hover:border-amber-500/70 hover:shadow-[0_0_16px_rgba(245,158,11,0.3)] hover:scale-105'
                  : 'bg-white/5 text-white/70 border-white/20 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 hover:shadow-[0_0_8px_rgba(245,158,11,0.15)] hover:scale-105'
              }`}
            >
              <Reply className={`h-4 w-4 transition-transform ${botStates.autoReply ? 'fill-amber-400 text-amber-400' : 'text-amber-400'} group-hover:scale-110`} />
              <span className="text-xs font-semibold uppercase">AUTO REPLY</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
