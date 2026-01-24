import type React from "react"
import { AvatarFallback } from "@/components/ui/avatar"
import { AvatarImage } from "@/components/ui/avatar"
import { Avatar } from "@/components/ui/avatar"
import { AlertCircle, BarChart3, Check, Download, Info, LineChart, Eye, Circle, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Import Card components

// Component for nav items
export function NavItem({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start ${active ? "glass-card bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "text-white/70 hover:text-white hover:bg-white/10"}`}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}

// Component for status items
export function StatusItem({ label, value, color }: { label: string; value: number; color: string }) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500"
      case "green":
        return "from-green-500 to-emerald-500"
      case "blue":
        return "from-blue-500 to-indigo-500"
      case "purple":
        return "from-purple-500 to-pink-500"
      default:
        return "from-cyan-500 to-blue-500"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-600">{label}</div>
        <div className="text-xs text-gray-600">{value}%</div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getColor()} rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

// Component for metric cards
export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  detail,
}: {
  title: string
  value: number
  icon: LucideIcon
  trend: "up" | "down" | "stable"
  color: string
  detail: string
}) {
  const getColor = () => {
    switch (color) {
      case "cyan":
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
      case "green":
        return "from-green-500 to-emerald-500 border-green-500/30"
      case "blue":
        return "from-blue-500 to-indigo-500 border-blue-500/30"
      case "purple":
        return "from-purple-500 to-pink-500 border-purple-500/30"
      default:
        return "from-cyan-500 to-blue-500 border-cyan-500/30"
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <BarChart3 className="h-4 w-4 text-amber-500" />
      case "down":
        return <BarChart3 className="h-4 w-4 rotate-180 text-green-500" />
      case "stable":
        return <LineChart className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className={`bg-white rounded-lg border ${getColor()} p-4 relative overflow-hidden shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{title}</div>
        <Icon className={`h-5 w-5 text-${color}-500`} />
      </div>
      <div className="text-2xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent from-gray-800 to-gray-600">
        {value}%
      </div>
      <div className="text-xs text-gray-500">{detail}</div>
      <div className="absolute bottom-2 right-2 flex items-center">{getTrendIcon()}</div>
      <div className="absolute -bottom-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-r opacity-20 blur-xl from-cyan-500 to-blue-500"></div>
    </div>
  )
}

// Performance chart component
export function PerformanceChart() {
  return (
    <div className="h-full w-full flex items-end justify-between px-4 pt-4 pb-8 relative">
      {/* Y-axis labels */}
      <div className="absolute left-2 top-0 h-full flex flex-col justify-between py-4">
        <div className="text-xs text-gray-500">100%</div>
        <div className="text-xs text-gray-500">75%</div>
        <div className="text-xs text-gray-500">50%</div>
        <div className="text-xs text-gray-500">25%</div>
        <div className="text-xs text-gray-500">0%</div>
      </div>

      {/* X-axis grid lines */}
      <div className="absolute left-0 right-0 top-0 h-full flex flex-col justify-between py-4 px-10">
        <div className="border-b border-gray-200 w-full"></div>
        <div className="border-b border-gray-200 w-full"></div>
        <div className="border-b border-gray-200 w-full"></div>
        <div className="border-b border-gray-200 w-full"></div>
        <div className="border-b border-gray-200 w-full"></div>
      </div>

      {/* Chart bars */}
      <div className="flex-1 h-full flex items-end justify-between px-2 z-10">
        {Array.from({ length: 24 }).map((_, i) => {
          const cpuHeight = Math.floor(Math.random() * 60) + 20
          const memHeight = Math.floor(Math.random() * 40) + 40
          const netHeight = Math.floor(Math.random() * 30) + 30

          return (
            <div key={i} className="flex space-x-0.5">
              <div
                className="w-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-sm"
                style={{ height: `${cpuHeight}%` }}
              ></div>
              <div
                className="w-1 bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-sm"
                style={{ height: `${memHeight}%` }}
              ></div>
              <div
                className="w-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm"
                style={{ height: `${netHeight}%` }}
              ></div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10">
        <div className="text-xs text-gray-500">00:00</div>
        <div className="text-xs text-gray-500">06:00</div>
        <div className="text-xs text-gray-500">12:00</div>
        <div className="text-xs text-gray-500">18:00</div>
        <div className="text-xs text-gray-500">24:00</div>
      </div>
    </div>
  )
}

// Process row component
export function ProcessRow({
  pid,
  name,
  user,
  cpu,
  memory,
  status,
}: {
  pid: string
  name: string
  user: string
  cpu: number
  memory: number
  status: string
}) {
  return (
    <div className="grid grid-cols-12 py-2 px-3 text-sm hover:bg-gray-100">
      <div className="col-span-1 text-gray-500">{pid}</div>
      <div className="col-span-4 text-gray-800">{name}</div>
      <div className="col-span-2 text-gray-600">{user}</div>
      <div className="col-span-2 text-cyan-600">{cpu}%</div>
      <div className="col-span-2 text-purple-600">{memory} MB</div>
      <div className="col-span-1">
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
          {status}
        </Badge>
      </div>
    </div>
  )
}

// Storage item component
export function StorageItem({
  name,
  total,
  used,
  type,
}: {
  name: string
  total: number
  used: number
  type: string
}) {
  const percentage = Math.round((used / total) * 100)

  return (
    <div className="bg-white rounded-md p-3 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-800">{name}</div>
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
          {type}
        </Badge>
      </div>
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-gray-500">
            {used} GB / {total} GB
          </div>
          <div className="text-xs text-gray-600">{percentage}%</div>
        </div>
        <Progress value={percentage} className="h-1.5 bg-gray-200">
          <div
            className={`h-full rounded-full ${
              percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-cyan-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </Progress>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="text-gray-500">Free: {total - used} GB</div>
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-white/70 hover:text-white hover:bg-white/10">
          Details
        </Button>
      </div>
    </div>
  )
}

// Alert item component
export function AlertItem({
  title,
  time,
  description,
  type,
}: {
  title: string
  time: string
  description: string
  type: "info" | "warning" | "error" | "success" | "update"
}) {
  const getTypeStyles = () => {
    switch (type) {
      case "info":
        return { icon: Info, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" }
      case "warning":
        return { icon: AlertCircle, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" }
      case "error":
        return { icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/30" }
      case "success":
        return { icon: Check, color: "text-green-500 bg-green-500/10 border-green-500/30" }
      case "update":
        return { icon: Download, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30" }
      default:
        return { icon: Info, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" }
    }
  }

  const { icon: Icon, color } = getTypeStyles()

  return (
    <div className="flex items-start space-x-3">
      <div className={`mt-0.5 p-1 rounded-full ${color.split(" ")[1]} ${color.split(" ")[2]}`}>
        <Icon className={`h-3 w-3 ${color.split(" ")[0]}`} />
      </div>
      <div>
        <div className="flex items-center">
          <div className="text-sm font-medium text-gray-800">{title}</div>
          <div className="ml-2 text-xs text-gray-500">{time}</div>
        </div>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
    </div>
  )
}

// Communication item component
export function CommunicationItem({
  sender,
  time,
  message,
  avatar,
  unread,
}: {
  sender: string
  time: string
  message: string
  avatar: string
  unread?: boolean
}) {
  return (
    <div className={`flex space-x-3 p-2 rounded-md ${unread ? "bg-gray-100 border border-gray-200" : ""}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatar || "/placeholder.svg"} alt={sender} />
        <AvatarFallback className="bg-gray-200 text-cyan-600">{sender.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-800">{sender}</div>
          <div className="text-xs text-gray-500">{time}</div>
        </div>
        <div className="text-xs text-gray-600 mt-1">{message}</div>
      </div>
      {unread && (
        <div className="flex-shrink-0 self-center">
          <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
        </div>
      )}
    </div>
  )
}

// Action button component
export function ActionButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Button
      variant="outline"
      className="h-auto py-3 px-3 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 flex flex-col items-center justify-center space-y-1 w-full"
    >
      <Icon className="h-5 w-5 text-cyan-400" />
      <span className="text-xs text-white/80">{label}</span>
    </Button>
  )
}

// Add missing icons from original dashboard.tsx
// These are simple wrappers to make them available for import
export function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Info {...props} />
}

export function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Check {...props} />
}

// SummaryCard component
interface SummaryCardProps {
  title: string
  value: string | React.ReactNode
  icon: LucideIcon
  color: string
  description: string | null
  cardClassName?: string
  iconClassName?: string
}

export function SummaryCard({ title, value, icon: Icon, color, description, cardClassName = "", iconClassName = "" }: SummaryCardProps) {
  // Map color prop to actual color classes
  const getColorClasses = () => {
    if (color.includes('cyan') || color.includes('blue')) {
      return {
        icon: 'text-cyan-400',
        value: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        bgHover: 'group-hover:bg-cyan-500/20',
        border: 'border-cyan-500/20',
        borderHover: 'group-hover:border-cyan-500/30',
        glow: 'glow-cyan'
      }
    } else if (color.includes('green')) {
      return {
        icon: 'text-green-400',
        value: 'text-green-400',
        bg: 'bg-green-500/10',
        bgHover: 'group-hover:bg-green-500/20',
        border: 'border-green-500/20',
        borderHover: 'group-hover:border-green-500/30',
        glow: 'glow-green'
      }
    } else if (color.includes('purple')) {
      return {
        icon: 'text-purple-400',
        value: 'text-purple-400',
        bg: 'bg-purple-500/10',
        bgHover: 'group-hover:bg-purple-500/20',
        border: 'border-purple-500/20',
        borderHover: 'group-hover:border-purple-500/30',
        glow: 'glow-purple'
      }
    } else if (color.includes('amber') || color.includes('yellow')) {
      return {
        icon: 'text-amber-400',
        value: 'text-amber-400',
        bg: 'bg-amber-500/10',
        bgHover: 'group-hover:bg-amber-500/20',
        border: 'border-amber-500/20',
        borderHover: 'group-hover:border-amber-500/30',
        glow: ''
      }
    } else if (color.includes('red')) {
      return {
        icon: 'text-red-400',
        value: 'text-red-400',
        bg: 'bg-red-500/10',
        bgHover: 'group-hover:bg-red-500/20',
        border: 'border-red-500/20',
        borderHover: 'group-hover:border-red-500/30',
        glow: ''
      }
    } else {
      return {
        icon: 'text-blue-400',
        value: 'text-blue-400',
        bg: 'bg-blue-500/10',
        bgHover: 'group-hover:bg-blue-500/20',
        border: 'border-blue-500/20',
        borderHover: 'group-hover:border-blue-500/30',
        glow: 'glow-blue'
      }
    }
  }

  const colors = getColorClasses()

  return (
    <Card className={`group glass-card ${colors.border} ${colors.borderHover} transition-all duration-300 hover:scale-[1.02] ${colors.glow} ${cardClassName}`}>
      <CardContent className="p-4 md:p-5 lg:p-6">
        <div className="flex flex-col items-center justify-center w-full min-h-[110px] md:min-h-[130px]">
          {/* Icon with glass background */}
          <div className={`${colors.bg} ${colors.bgHover} rounded-full p-2 md:p-3 mb-2 md:mb-3 flex items-center justify-center transition-all duration-300 border ${colors.border} group-hover:scale-110`}>
            <Icon className={`h-4 w-4 md:h-5 md:w-5 ${colors.icon} ${iconClassName}`} />
          </div>
          {/* Value */}
          <div className={`text-2xl md:text-3xl font-semibold ${colors.value} text-center mb-1 tracking-tight break-words px-1`}>{value}</div>
          {/* Title */}
          <div className="text-sm md:text-base font-normal text-white text-center break-words px-1">{title}</div>
        </div>
      </CardContent>
    </Card>
  )
}
