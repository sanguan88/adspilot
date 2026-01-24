"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface User {
  userId: string // Changed from number to string (VARCHAR user_id)
  username: string
  email: string
  nama_lengkap: string
  role: 'superadmin' | 'admin' | 'manager' | 'staff'
  status_user?: string // 'aktif' | 'pending_payment' | 'inactive'
  photo_profile?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Load token from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('auth_token')
      if (savedToken) {
        setToken(savedToken)
        // Validate token and get user data
        refreshUser(savedToken)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  // Auto-redirect if user has pending_payment status
  // This ensures user with pending_payment cannot access any page except payment-status
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if user is authenticated (has user and token)
    const isAuthenticated = !!user && !!token

    if (!isLoading && isAuthenticated && user) {
      // Check if user has pending_payment status
      if (user.status_user === 'pending_payment') {
        // Get current pathname
        const currentPath = window.location.pathname

        // Allow access to payment-status page and auth pages
        const allowedPaths = [
          '/dashboard/payment-status',
          '/auth/login',
          '/auth/checkout',
          '/auth/payment-confirmation',
          '/auth/forgot-password',
          '/auth/reset-password',
        ]

        // If not on allowed path, redirect to payment-status using replace() to prevent back navigation
        if (!allowedPaths.some(path => currentPath.startsWith(path))) {
          router.replace('/dashboard/payment-status')
        }
      }
    }
  }, [isLoading, user, token, router, pathname])

  // Helper function to get or generate device identifier
  const getOrGenerateDeviceIdentifier = (): string => {
    if (typeof window === 'undefined') return ''

    const storageKey = 'device_identifier'
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      return stored
    }

    // Generate device identifier based on device info
    const deviceInfo = {
      os: getOSName(),
      browser: 'Browser',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timestamp: Date.now()
    }

    const deviceInfoString = JSON.stringify(deviceInfo)
    const deviceId = 'device-' + btoa(deviceInfoString)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 30)

    localStorage.setItem(storageKey, deviceId)
    return deviceId
  }

  const getOSName = (): string => {
    if (typeof window === 'undefined') return 'Unknown'
    const userAgent = navigator.userAgent
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'Mac'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'Unknown'
  }

  const getDeviceName = (): string => {
    if (typeof window === 'undefined') return 'Unknown Device'
    const userAgent = navigator.userAgent
    let deviceName = 'Unknown'

    if (userAgent.includes('Windows')) {
      deviceName = 'Windows'
    } else if (userAgent.includes('Mac')) {
      deviceName = 'Mac'
    } else if (userAgent.includes('Linux')) {
      deviceName = 'Linux'
    } else if (userAgent.includes('Android')) {
      deviceName = 'Android'
    } else if (userAgent.includes('iOS')) {
      deviceName = 'iOS'
    }

    if (userAgent.includes('Chrome')) {
      deviceName += ' - Chrome'
    } else if (userAgent.includes('Firefox')) {
      deviceName += ' - Firefox'
    } else if (userAgent.includes('Safari')) {
      deviceName += ' - Safari'
    } else if (userAgent.includes('Edge')) {
      deviceName += ' - Edge'
    }

    return deviceName
  }

  const refreshUser = async (tokenToUse?: string) => {
    const tokenValue = tokenToUse || token
    if (!tokenValue) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${tokenValue}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setUser(data.data)
        } else {
          // Token invalid, clear it
          logout()
        }
      } else {
        // Token invalid, clear it
        logout()
      }
    } catch (error) {
      // Jangan log data sensitif - hanya log error type
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      console.error('Error refreshing user:', errorType);
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true)

      // Get device info
      const deviceIdentifier = typeof window !== 'undefined' ? getOrGenerateDeviceIdentifier() : ''
      const deviceName = typeof window !== 'undefined' ? getDeviceName() : 'Unknown Device'
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
      const timezone = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          device_identifier: deviceIdentifier,
          device_name: deviceName,
          user_agent: userAgent,
          timezone: timezone
        }),
      })

      // Handle response yang tidak valid JSON (misalnya network error)
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        // Jika response bukan JSON, kemungkinan server error atau network issue
        if (!response.ok) {
          return {
            success: false,
            error: response.status === 503
              ? 'Ada kendala. Hubungi admin.'
              : 'Terjadi kesalahan saat login. Silakan coba lagi.'
          }
        }
        throw jsonError
      }

      if (data.success && data.data) {
        const { token: newToken, user: userData } = data.data

        // Save token to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', newToken)
        }

        setToken(newToken)
        setUser(userData)

        return { success: true }
      } else {
        // Handle license-related errors
        if (response.status === 403) {
          const errorCode = data.error_code
          let errorMessage = data.error || 'Login gagal'

          // Map error codes to user-friendly messages
          if (errorCode === 'NO_LICENSE') {
            errorMessage = 'Anda tidak memiliki lisensi. silahkan hubungi admin'
          } else if (errorCode === 'LICENSE_EXPIRED') {
            errorMessage = 'Lisensi Anda telah expired. Silahkan hubungi admin untuk memperpanjang lisensi.'
          } else if (errorCode === 'LICENSE_INACTIVE') {
            errorMessage = 'Lisensi Anda tidak aktif. Silahkan hubungi admin'
          } else if (errorCode === 'MAX_DEVICE_REACHED') {
            errorMessage = 'MAX DEVICE! Hubungi admin'
          }

          return { success: false, error: errorMessage }
        }

        return { success: false, error: data.error || 'Login gagal' }
      }
    } catch (error) {
      // Jangan log data sensitif (username, password, token, dll)
      // Hanya log error type
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      console.error('Login error:', errorType);

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' }
      }

      return { success: false, error: 'Terjadi kesalahan saat login. Silakan coba lagi.' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      router.push('/auth/login')
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

