"use client"

import React from 'react'
import { AlertTriangle, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useCookiesHealth } from "@/contexts/CookiesHealthContext"
import { cn } from "@/lib/utils"

interface GlobalBannerProps {
    className?: string
}

export function GlobalBanner({ className }: GlobalBannerProps) {
    const { expiredCount, isBannerVisible, setIsBannerVisible } = useCookiesHealth()

    if (expiredCount === 0 || !isBannerVisible) {
        return null
    }

    return (
        <div className={cn("animate-in fade-in slide-in-from-top-2 duration-300", className)}>
            <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 relative overflow-hidden group py-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />

                <button
                    onClick={() => setIsBannerVisible(false)}
                    className="absolute right-3 top-3 p-1 rounded-md opacity-50 hover:bg-destructive/10 hover:opacity-100 transition-all z-10"
                    title="Sembunyikan sementara"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-10">
                    <div className="space-y-1">
                        <AlertTitle className="text-sm font-bold text-destructive leading-none">
                            Sesi Toko Berakhir
                        </AlertTitle>
                        <AlertDescription className="text-xs text-destructive/80 font-medium">
                            Terdapat <span className="font-bold underline">{expiredCount} toko</span> yang membutuhkan update cookies. Data real-time tidak tersedia hingga sesi diperbarui.
                        </AlertDescription>
                    </div>

                    <Link href="/accounts" onClick={() => setIsBannerVisible(false)} className="flex-shrink-0">
                        <Button size="sm" variant="destructive" className="h-8 text-[11px] font-bold shadow-sm whitespace-nowrap px-4 bg-destructive hover:bg-destructive/90 text-white">
                            Update Sekarang
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </Alert>
        </div>
    )
}
