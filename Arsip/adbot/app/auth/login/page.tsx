"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"

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
      // Check user status and redirect accordingly
      if (user.status_user === 'pending_payment') {
        router.push('/dashboard/payment-status')
      } else {
        router.push('/general')
      }
    }
  }, [isAuthenticated, authLoading, user, router])

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Masuk ke dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username atau Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username atau email"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pr-10"
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

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-normal cursor-pointer"
                >
                  Ingatkan saya
                </Label>
              </div>
              <Link 
                href="/auth/forgot-password" 
                className="text-primary hover:underline font-medium"
              >
                Lupa password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              Belum punya akun?{' '}
              <Link href="/" className="text-primary hover:underline font-medium">
                Daftar di sini
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
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

