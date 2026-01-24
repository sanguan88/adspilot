"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Shield } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"

export function ChangePasswordDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error("Password baru dan konfirmasi password tidak cocok")
            return
        }

        if (formData.newPassword.length < 6) {
            toast.error("Password baru minimal 6 karakter")
            return
        }

        try {
            setLoading(true)
            const response = await authenticatedFetch("/api/user/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (data.success) {
                toast.success("Password berhasil diubah")
                setFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                })
                setOpen(false)
            } else {
                toast.error(data.error || "Gagal mengubah password")
            }
        } catch (error) {
            console.error("Error changing password:", error)
            toast.error("Terjadi kesalahan saat mengubah password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Shield className="w-4 h-4 mr-2" />
                    Ubah Password
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ubah Password</DialogTitle>
                    <DialogDescription>
                        Masukkan password lama dan password baru Anda
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Password Saat Ini</Label>
                        <Input
                            id="current-password"
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Masukkan password saat ini"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password">Password Baru</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Masukkan password baru (min. 6 karakter)"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Konfirmasi password baru"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
