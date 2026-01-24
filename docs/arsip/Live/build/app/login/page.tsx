"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, LogIn, Lock, User } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { Checkbox } from "@/components/ui/checkbox"

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: false,
  })

  // Set mounted after client-side hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle redirect if authenticated
  useEffect(() => {
    if (mounted && !authLoading && isAuthenticated) {
      router.replace("/")
    }
  }, [mounted, isAuthenticated, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Simple validation
    if (!formData.username || !formData.password) {
      setError("Username/Email dan password harus diisi")
      setIsLoading(false)
      return
    }

    // Trim whitespace
    const username = formData.username.trim()
    const password = formData.password

    if (!username || !password) {
      setError("Username/Email dan password harus diisi")
      setIsLoading(false)
      return
    }

    try {
      console.log('LoginPage: Starting login process...')
      const success = await login(username, password, formData.remember)
      console.log('LoginPage: Login result:', success)
      
      if (success) {
        console.log('LoginPage: Login successful, waiting for auth state update...')
        // Don't redirect manually - let useEffect handle it based on isAuthenticated
        // This prevents race conditions and ensures state is properly updated
        // State will be updated by AuthContext, which will trigger redirect via useEffect
      } else {
        console.log('LoginPage: Login failed, showing error')
        setError("Login gagal. Silakan coba lagi.")
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error('LoginPage: Login error:', err)
      // Get error message from API response if available
      const errorMessage = err?.message || err?.error || "Terjadi kesalahan saat login. Silakan coba lagi."
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0A0A0A] relative overflow-hidden">
      {/* Background Image with Blur - Layer 1 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[1000px] h-[1000px] opacity-40">
            <Image
              src="/Logo.png"
              alt="Background"
              fill
              className="object-contain blur-[80px]"
              priority
              quality={75}
            />
          </div>
        </div>
      </div>

      {/* Abstract background gradients - Layer 2 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center w-16 h-16 mb-4 glow-cyan overflow-hidden">
            <Image
              src="/Logo.png"
              alt="SOROBOT Logo"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">SOROBOT</h1>
          <p className="text-xs md:text-sm text-white/60">Live Monitoring System</p>
        </div>

        {!mounted || authLoading ? (
          <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/10 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Memuat...</h2>
            <p className="text-sm text-white/60">Memeriksa autentikasi...</p>
          </div>
        ) : isAuthenticated ? (
          <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/10 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Mengalihkan...</h2>
            <p className="text-sm text-white/60">Anda sudah masuk, mengalihkan ke dashboard...</p>
          </div>
        ) : (
          /* Login Card */
          <div className="glass-card rounded-2xl p-6 md:p-8 shadow-2xl border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-2">
                  <span className="font-semibold">⚠</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Username/Email Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/90 text-sm font-medium">
                Username / Email
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username atau email"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && formData.username && formData.password && !isLoading) {
                      handleSubmit(e as any)
                    }
                  }}
                  className="pl-10 border-white/10 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 focus-visible:bg-white/5 h-12"
                  disabled={isLoading}
                  autoComplete="username email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && formData.username && formData.password && !isLoading) {
                      handleSubmit(e as any)
                    }
                  }}
                  className="pl-10 pr-10 border-white/10 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 focus-visible:bg-white/5 h-12"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
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

            {/* Remember Me */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.remember}
                  onCheckedChange={(checked) => handleInputChange("remember", checked as boolean)}
                  disabled={isLoading}
                  className="h-4 w-4 border-white/50 bg-white/5 rounded transition-all duration-200 hover:border-white/70 hover:bg-white/10 data-[state=checked]:bg-white/25 data-[state=checked]:border-white/80 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm text-white/70 cursor-pointer hover:text-white transition-colors"
                >
                  Ingat saya
                </Label>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 font-semibold transition-all duration-200 rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Masuk
                </>
              )}
            </Button>

            {/* Footer */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-center text-xs text-white/50">
                © 2025 SOROBOT by REFAST.ID. All rights reserved.
              </p>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  )
}

