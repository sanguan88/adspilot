"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import dynamic from 'next/dynamic'

const ParticleBackground = dynamic(() => import("@/components/particle-background"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500" />
})

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Check for impersonation token
  useEffect(() => {
    const impersonateToken = searchParams.get('impersonate')
    if (impersonateToken) {
      // Store token and redirect
      localStorage.setItem('auth_token', impersonateToken)
      router.push('/')
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await login(email, password)

      if (result.success) {
        setSuccessMessage("Login berhasil!")
        setTimeout(() => router.push("/"), 500)
      } else {
        setError(result.error || "Login gagal")
      }
    } catch (error) {
      setError("Terjadi kesalahan saat login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white relative overflow-hidden">
      {/* Left Side: Branding & Visual - Hidden on Mobile */}
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
            <img src="/logo.png" alt="AdsPilot Logo" className="h-32 w-32 object-contain" />
          </div>

          <div className="space-y-2">
            <h1 className="text-7xl font-black text-white leading-[1.1]">
              Affiliate <br /> <span className="text-teal-100">Partner Program</span> 🚀
            </h1>
            <p className="text-xl text-teal-50/90 max-w-lg leading-snug">
              Bergabunglah dengan komunitas partner kami. Dapatkan komisi menarik dengan merefensikan solusi otomasi iklan terbaik untuk seller Shopee.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="text-teal-100/60 text-sm font-medium">
            © 2026 AdsPilot Affiliate.
          </p>
          <div className="flex gap-4">
            <div className="h-1 w-12 bg-white/40 rounded-full" />
            <div className="h-1 w-4 bg-white/20 rounded-full" />
            <div className="h-1 w-4 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center lg:items-start p-6 lg:p-12 lg:pl-32 animate-in fade-in slide-in-from-right duration-700 bg-white">
        <div className="w-full max-w-sm space-y-10">
          {/* Brand Name on Top Right */}
          <div className="hidden lg:block absolute top-12 right-12">
            <span className="text-xl font-bold tracking-tight text-slate-900">Affiliate Portal</span>
          </div>

          {/* Logo & Welcome */}
          <div className="space-y-4 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="h-12 w-12 rounded bg-teal-600 text-white flex items-center justify-center font-bold text-2xl">A</div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Selamat Datang Kembali!
              </h2>
              <p className="text-slate-500 text-sm">
                Belum punya akun partner?{' '}
                <Link href="/auth/register" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors underline">
                  Daftar sekarang
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
              <div className="space-y-1 group">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
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

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 rounded-lg text-lg font-normal shadow-xl transition-all disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk Dashboard'
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
