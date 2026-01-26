"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Validasi email format
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [email, setEmail] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        if (!email || !isValidEmail(email)) {
            setError('Masukkan email yang valid')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.trim() }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setSuccess(true)
            } else {
                setError(data.error || 'Gagal mengirim link reset password')
            }
        } catch (err) {
            setError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Lupa Password</CardTitle>
                    <CardDescription className="text-center">
                        Masukkan email affiliate Anda untuk menerima link reset password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="space-y-4">
                            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800 dark:text-green-200">
                                    Jika email terdaftar, link reset password telah dikirim ke email Anda (cek Inbox/Spam). Silakan klik link tersebut untuk melanjutkan.
                                </AlertDescription>
                            </Alert>
                            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                                <Link href="/auth/login" className="text-teal-600 hover:text-teal-700 hover:underline font-medium">
                                    Kembali ke halaman login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="partner@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        if (error) setError(null)
                                    }}
                                    required
                                    disabled={isLoading}
                                    autoComplete="email"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-teal-600 hover:bg-teal-700"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Mengirim...
                                    </>
                                ) : (
                                    'Kirim Link Reset Password'
                                )}
                            </Button>

                            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                                <Link href="/auth/login" className="text-teal-600 hover:text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                                    <ArrowLeft className="h-3 w-3" />
                                    Kembali ke login
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
