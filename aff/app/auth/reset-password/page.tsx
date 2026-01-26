"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Validasi password
function validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password || password.length < 8) {
        return { isValid: false, error: 'Password minimal 8 karakter' }
    }
    return { isValid: true }
}

function ResetPasswordForm() {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isValidating, setIsValidating] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [token, setToken] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    })
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        let tokenParam: string | null = null
        if (typeof window !== 'undefined') {
            try {
                tokenParam = searchParams.get('token')
            } catch (e) {
                const urlParams = new URLSearchParams(window.location.search)
                tokenParam = urlParams.get('token')
            }

            if (!tokenParam) {
                const urlParams = new URLSearchParams(window.location.search)
                tokenParam = urlParams.get('token')
            }
        }

        if (!tokenParam) {
            setError('Token reset password tidak valid atau sudah kadaluarsa')
            setIsValidating(false)
            return
        }
        setToken(tokenParam)

        validateToken(tokenParam)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted])

    const validateToken = async (tokenToValidate: string) => {
        try {
            const response = await fetch(`/api/auth/validate-reset-token?token=${tokenToValidate}`)
            const data = await response.json()

            if (!response.ok || !data.success) {
                setError(data.error || 'Token reset password tidak valid atau sudah kadaluarsa')
            }
        } catch (err) {
            setError('Terjadi kesalahan saat memvalidasi token')
        } finally {
            setIsValidating(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        if (!token) {
            setError('Token reset password tidak valid')
            return
        }

        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.isValid) {
            setError(passwordValidation.error || 'Password tidak valid')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Password dan konfirmasi password tidak sama')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setSuccess(true)
                setTimeout(() => {
                    router.push('/auth/login?passwordReset=true')
                }, 2000)
            } else {
                setError(data.error || 'Gagal reset password')
            }
        } catch (err) {
            setError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
        if (error) {
            setError(null)
        }
    }

    if (!mounted || isValidating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
                    <CardDescription className="text-center">
                        Masukkan password baru Anda
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                Password berhasil direset! Mengalihkan ke halaman login...
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">Password Baru</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Masukkan password baru (min. 8 karakter)"
                                        value={formData.password}
                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                        required
                                        disabled={isLoading}
                                        autoComplete="new-password"
                                        className="pr-10"
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Masukkan ulang password baru"
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                        required
                                        disabled={isLoading}
                                        autoComplete="new-password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        disabled={isLoading}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-teal-600 hover:bg-teal-700"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    'Reset Password'
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
