"use client"

import * as React from "react"
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfDay } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type PresetPeriod =
  | "today"
  | "yesterday"
  | "last7days"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "custom"

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangePickerProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

const PRESET_PERIODS: Array<{
  id: PresetPeriod
  label: string
  getRange: () => DateRange
}> = [
    {
      id: "today",
      label: "Hari Ini",
      getRange: () => {
        const today = startOfDay(new Date())
        return { from: today, to: today }
      },
    },
    {
      id: "yesterday",
      label: "Kemarin",
      getRange: () => {
        const yesterday = startOfDay(subDays(new Date(), 1))
        return { from: yesterday, to: yesterday }
      },
    },
    {
      id: "last7days",
      label: "1 Minggu Terakhir",
      getRange: () => {
        const today = startOfDay(new Date())
        const sevenDaysAgo = startOfDay(subDays(today, 6))
        return { from: sevenDaysAgo, to: today }
      },
    },
    {
      id: "thisMonth",
      label: "Bulan Ini",
      getRange: () => {
        const today = new Date()
        const start = startOfMonth(today)
        const end = startOfDay(today)
        return { from: start, to: end }
      },
    },
    {
      id: "lastMonth",
      label: "1 Bulan Terakhir",
      getRange: () => {
        const today = startOfDay(new Date())
        const oneMonthAgo = startOfDay(subDays(today, 29))
        return { from: oneMonthAgo, to: today }
      },
    },
    {
      id: "last3Months",
      label: "3 Bulan Terakhir",
      getRange: () => {
        const today = startOfDay(new Date())
        const threeMonthsAgo = startOfMonth(subMonths(today, 2))
        return { from: threeMonthsAgo, to: today }
      },
    },
  ]

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  minDate,
  maxDate,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedPreset, setSelectedPreset] = React.useState<PresetPeriod>("custom")

  // Check if current date range matches any preset
  React.useEffect(() => {
    if (!dateRange.from || !dateRange.to) {
      setSelectedPreset("custom")
      return
    }

    const fromTime = dateRange.from.getTime()
    const toTime = dateRange.to.getTime()

    for (const preset of PRESET_PERIODS) {
      const presetRange = preset.getRange()
      if (presetRange.from && presetRange.to) {
        const presetFromTime = presetRange.from.getTime()
        const presetToTime = presetRange.to.getTime()

        // Check if dates match (within same day)
        const fromMatch =
          presetRange.from.getFullYear() === dateRange.from.getFullYear() &&
          presetRange.from.getMonth() === dateRange.from.getMonth() &&
          presetRange.from.getDate() === dateRange.from.getDate()

        const toMatch =
          presetRange.to.getFullYear() === dateRange.to.getFullYear() &&
          presetRange.to.getMonth() === dateRange.to.getMonth() &&
          presetRange.to.getDate() === dateRange.to.getDate()

        if (fromMatch && toMatch) {
          setSelectedPreset(preset.id)
          return
        }
      }
    }
    setSelectedPreset("custom")
  }, [dateRange])

  const handlePresetClick = (preset: PresetPeriod) => {
    if (preset === "custom") {
      setSelectedPreset("custom")
      return
    }

    const presetData = PRESET_PERIODS.find((p) => p.id === preset)
    if (presetData) {
      const range = presetData.getRange()
      onDateRangeChange(range)
      setSelectedPreset(preset)
      setOpen(false)
    }
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range) {
      onDateRangeChange(range)
      setSelectedPreset("custom")
      // Auto-close when both dates are selected
      if (range.from && range.to) {
        setOpen(false)
      }
    }
  }

  const formatDateRange = () => {
    if (!dateRange.from) {
      return "Pilih tanggal"
    }

    if (dateRange.from && dateRange.to) {
      const fromStr = format(dateRange.from, "d MMM yyyy", { locale: id })
      const toStr = format(dateRange.to, "d MMM yyyy", { locale: id })

      if (fromStr === toStr) {
        return fromStr
      }
      return `${fromStr} - ${toStr}`
    }

    return format(dateRange.from, "d MMM yyyy", { locale: id })
  }

  const defaultMinDate = React.useMemo(() => {
    if (minDate) return minDate
    const threeMonthsAgo = subMonths(new Date(), 3)
    return startOfMonth(threeMonthsAgo)
  }, [minDate])

  const defaultMaxDate = React.useMemo(() => {
    if (maxDate) return maxDate
    return startOfDay(new Date())
  }, [maxDate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-full sm:w-[240px] justify-start text-left font-normal",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span>{formatDateRange()}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <div className="flex">
          {/* Preset Sidebar - Compact */}
          <div className="border-r border-border">
            <div className="p-1.5 space-y-0.5 w-[130px]">
              {PRESET_PERIODS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedPreset === preset.id
                      ? "bg-accent text-accent-foreground font-medium border-l-4 border-primary"
                      : "text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar - Compact */}
          <div className="p-2">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={handleCalendarSelect as any}
              numberOfMonths={2}
              fromDate={defaultMinDate}
              toDate={defaultMaxDate}
              locale={id}
              className="rounded-md border-0 [&_.rdp-months]:gap-1.5 [&_.rdp-month]:gap-0.5 [&_.rdp-month_caption]:text-sm [&_.rdp-day]:text-xs"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

