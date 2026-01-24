"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Zap } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import ParticleBackground from "@/components/particle-background"

// Validasi email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validasi input (username atau email)
function validateInput(input: string): { isValid: boolean; error?: string } {
  if (!input || input.trim().length === 0) {
    return { isValid: false, error: 'Username atau email harus diisi' }
  }

  // Jika mengandung @, validasi sebagai email
  if (input.includes('@')) {
    if (!isValidEmail(input)) {
      return { isValid: false, error: 'Format email tidak valid' }
    }
  }

  // Validasi panjang minimum
  if (input.trim().length < 3) {
    return { isValid: false, error: 'Username atau email minimal 3 karakter' }
  }

  return { isValid: true }
}

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load remembered username on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rememberedUsername = localStorage.getItem('remembered_username')
      if (rememberedUsername) {
        setFormData(prev => ({ ...prev, username: rememberedUsername }))
        setRememberMe(true)
      }
    }
  }, [])

  // Redirect jika sudah login
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Redirect to User Portal (app.adspilot.id) after successful login
      const userPortalUrl = process.env.NEXT_PUBLIC_API_URL || 'https://app.adspilot.id'
      if (user.status_user === 'pending_payment') {
        window.location.href = `${userPortalUrl}/dashboard/payment-status`
      } else {
        window.location.href = `${userPortalUrl}/general`
      }
    }
  }, [isAuthenticated, authLoading, user])

  // Cek query parameter untuk pesan sukses
  useEffect(() => {
    const registered = searchParams.get('registered')
    const passwordReset = searchParams.get('passwordReset')

    if (registered === 'true') {
      setSuccessMessage('Registrasi berhasil! Silakan login dengan akun Anda.')
    } else if (passwordReset === 'true') {
      setSuccessMessage('Password berhasil direset! Silakan login dengan password baru.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validasi input
    const inputValidation = validateInput(formData.username)
    if (!inputValidation.isValid) {
      setError(inputValidation.error || 'Input tidak valid')
      return
    }

    if (!formData.password || formData.password.length === 0) {
      setError('Password harus diisi')
      return
    }

    setIsLoading(true)

    try {
      const result = await login(formData.username.trim(), formData.password)

      if (result.success) {
        // Handle remember me
        if (rememberMe && typeof window !== 'undefined') {
          localStorage.setItem('remembered_username', formData.username.trim())
        } else if (typeof window !== 'undefined') {
          localStorage.removeItem('remembered_username')
        }

        // Redirect will be handled by useEffect based on user status
        // No need to manually redirect here
      } else {
        setError(result.error || 'Login gagal')
      }
    } catch (err) {
      // Jangan tampilkan error detail yang sensitif
      setError('Terjadi kesalahan saat login. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
          <p className="text-slate-500 font-medium animate-pulse">Menyiapkan dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white relative overflow-hidden">
      {/* Sisi Kiri: Branding & Visual - Tersembunyi di Mobile */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 p-16 pl-[180px] flex-col justify-between">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 L100 0 L100 100 Z" fill="white" />
          </svg>
        </div>

        <ParticleBackground />

        <div className="relative z-10">
          <div className="mb-2">
            <img src="/logo.png" alt="AdsPilot Logo" className="h-32 w-32 object-contain drop-shadow-2xl brightness-110 contrast-125 saturate-150" />
          </div>

          <div className="space-y-2">
            <h1 className="text-7xl font-black text-white leading-[1.1]">
              Halo <br /> <span className="text-teal-100">adspilot!</span> 👋
            </h1>
            <p className="text-xl text-teal-50/90 max-w-md leading-snug">
              Otomasi iklan Shopee Anda dengan cerdas. Hemat waktu, tingkatkan ROAS, dan kembangkan bisnis Anda lebih cepat dengan Algoritma Cerdas.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="text-teal-100/60 text-sm font-medium">
            © 2026 AdsPilot. Hak cipta dilindungi undang-undang.
          </p>
          <div className="flex gap-4">
            <div className="h-1 w-12 bg-white/40 rounded-full" />
            <div className="h-1 w-4 bg-white/20 rounded-full" />
            <div className="h-1 w-4 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Sisi Kanan: Form Login */}
      <div className="flex-1 flex flex-col justify-center items-center lg:items-start p-6 lg:p-12 lg:pl-32 animate-in fade-in slide-in-from-right duration-700 bg-white">
        <div className="w-full max-w-sm space-y-12">
          {/* Brand Name on Top Right like Reference */}
          <div className="hidden lg:block absolute top-12 right-12">
            <img src="/adspilot.png" alt="AdsPilot" className="h-10 w-auto" />
          </div>

          {/* Logo & Welcome */}
          <div className="space-y-4 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <img src="/logo.png" alt="AdsPilot Logo" className="h-16 w-16 object-contain" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Selamat Datang Kembali!
              </h2>
              <p className="text-slate-500 text-sm">
                Belum punya akun?{' '}
                <Link href={`${process.env.NEXT_PUBLIC_LANDING_PAGE_URL || 'http://localhost:3002'}/#harga`} className="text-teal-600 hover:text-teal-700 font-semibold transition-colors underline">
                  Daftar sekarang, gratis!
                </Link>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {successMessage && (
              <Alert className="border-teal-100 bg-teal-50 text-teal-800 animate-in zoom-in duration-300">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="animate-in shake duration-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Minimalist Inputs with Underline style as in image */}
              <div className="space-y-1 group">
                <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  Username atau Email
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="nama@perusahaan.com"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  className="border-0 border-b border-slate-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-slate-900 transition-all text-lg pb-3 h-12 shadow-none placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-1 group">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400 group-focus-within:text-teal-600 transition-colors">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="border-0 border-b border-slate-200 rounded-none px-0 bg-transparent focus-visible:ring-0 focus-visible:border-slate-900 transition-all text-lg pb-3 h-12 shadow-none pr-10 placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 rounded-sm"
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-medium text-slate-600 cursor-pointer"
                >
                  Ingat saya
                </Label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors"
              >
                Lupa password? <span className="text-teal-600 underline font-semibold">Klik di sini</span>
              </Link>
            </div>

            <div className="space-y-4 pt-6">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white h-14 rounded-lg text-lg font-normal shadow-xl transition-all disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk Sekarang'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

