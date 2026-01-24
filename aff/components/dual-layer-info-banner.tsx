"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Check, X, Shield, BarChart3, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "./ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export function DualLayerInfoBanner() {
    const [isVisible, setIsVisible] = useState(false)
    const [showCloseDialog, setShowCloseDialog] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    useEffect(() => {
        // Check localStorage preference
        const hidden = localStorage.getItem("adsPilot_dualLayerBanner_hidden")
        if (!hidden) {
            setIsVisible(true)
        }
    }, [])

    const handleClose = () => {
        setShowCloseDialog(true)
    }

    const confirmClose = () => {
        if (dontShowAgain) {
            localStorage.setItem("adsPilot_dualLayerBanner_hidden", "true")
        }
        setIsVisible(false)
        setShowCloseDialog(false)
    }

    if (!isVisible) return null

    return (
        <>
            <Alert className="mb-6 relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300 font-bold flex items-center gap-2">
                    New: Dual-Layer Tracking & Custom Links
                </AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400 mt-2 text-sm leading-relaxed">
                    <p className="mb-2">
                        Sistem tracking kini telah diupgrade menjadi <strong>Dual-Layer</strong> untuk performa maksimal:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mb-3 ml-1">
                        <li>
                            <strong>Komisi Aman (First-Click):</strong> Lead terkunci ke Anda selama 90 hari sejak klik pertama.
                        </li>
                        <li>
                            <strong>Voucher Priority:</strong> Kode voucher otomatis mentracking penjualan ke Anda, walau tanpa link.
                        </li>
                        <li>
                            <strong>Smart Tracking:</strong> Pixel FB/TikTok tetap menyala. Custom link variation didukung penuh.
                        </li>
                    </ul>
                </AlertDescription>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                    onClick={handleClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </Alert>

            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sembunyikan Informasi Ini?</DialogTitle>
                        <DialogDescription>
                            Apakah Anda sudah paham mengenai fitur Dual-Layer Tracking ini?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center space-x-2 py-4">
                        <Checkbox
                            id="dontShow"
                            checked={dontShowAgain}
                            onCheckedChange={(checked) => setDontShowAgain(!!checked)}
                        />
                        <Label htmlFor="dontShow" className="cursor-pointer">
                            Jangan ingatkan saya lagi (Saya sudah paham)
                        </Label>
                    </div>

                    <DialogFooter className="sm:justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={confirmClose}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
