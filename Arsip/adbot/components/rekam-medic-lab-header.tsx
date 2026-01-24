"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download, Store } from "lucide-react"
import { format } from "date-fns"
import { DateRangePicker } from "@/components/date-range-picker"

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface LabHeaderProps {
  selectedAccount: string
  accounts: Array<{ id_toko: string; nama_toko: string }>
  onAccountChange: (value: string) => void
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  minDate?: Date
  maxDate?: Date
  onDownloadPDF: () => void
  reportNumber: string
}

export function RekamMedicLabHeader({
  selectedAccount,
  accounts,
  onAccountChange,
  dateRange,
  onDateRangeChange,
  minDate,
  maxDate,
  onDownloadPDF,
  reportNumber,
}: LabHeaderProps) {
  const selectedAccountName = accounts.find(acc => acc.id_toko === selectedAccount)?.nama_toko || "Semua Toko"
  
  return (
    <div className="border-b-2 border-gray-300 pb-4 mb-6">
      {/* Lab Report Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-2xl font-bold text-gray-900 tracking-tight">REKAM MEDIC</div>
            <div className="text-sm text-gray-600 font-mono">- Hasil Analisis Iklan Shopee</div>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            No. Laporan: <span className="font-semibold">{reportNumber}</span>
          </div>
        </div>
        <Button
          onClick={onDownloadPDF}
          variant="outline"
          size="sm"
          className="gap-2 border-gray-400 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download PDF</span>
        </Button>
      </div>

      {/* Info Bar - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-600 font-medium">Account:</span>
          <Select value={selectedAccount} onValueChange={onAccountChange}>
            <SelectTrigger className="w-full mt-1 h-9 border-gray-300">
              <div className="flex items-center gap-2 flex-1">
                <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <SelectValue>
                  {selectedAccount === "all" ? "Semua Toko" : selectedAccountName}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>Semua Toko</span>
                </div>
              </SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id_toko} value={account.id_toko}>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{account.nama_toko}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="text-gray-600 font-medium">Periode Analisis:</span>
          <div className="mt-1">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
              minDate={minDate}
              maxDate={maxDate}
              className="border-gray-300"
            />
          </div>
        </div>

        <div className="flex items-end">
            <div className="text-xs text-gray-500">
              <div>Tanggal Analisis: {format(new Date(), "dd MMM yyyy, HH:mm")} WIB</div>
            </div>
        </div>
      </div>
    </div>
  )
}

