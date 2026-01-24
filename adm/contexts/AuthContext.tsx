"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  userId: string
  username: string
  email: string
  nama_lengkap: string
  role: 'superadmin' | 'admin' | 'manager' | 'staff'
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for bypass auth
      const bypassAuth = localStorage.getItem('BYPASS_AUTH') === 'true' || 
                        process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'
      
      if (bypassAuth) {
        // Auto-login with bypass user
        const bypassUser: User = {
          userId: 'bypass-user',
          username: 'admin',
          email: 'admin@admin.local',
          nama_lengkap: 'Bypass Admin',
          role: 'superadmin',
          photo_profile: null,
        }
        setUser(bypassUser)
        setToken('bypass-token')
        setIsLoading(false)
        return
      }

      const savedToken = localStorage.getItem('auth_token')
      if (savedToken) {
        setToken(savedToken)
        refreshUser(savedToken)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  const refreshUser = async (tokenToUse?: string) => {
    const tokenValue = tokenToUse || token
    if (!tokenValue) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenValue}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setUser(data.data)
        } else {
          logout()
        }
      } else {
        logout()
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        if (!response.ok) {
          return { 
            success: false, 
            error: response.status === 503 
              ? 'Server sedang maintenance. Silakan coba lagi nanti.' 
              : 'Terjadi kesalahan saat login. Silakan coba lagi.' 
          }
        }
        throw jsonError
      }

      if (data.success && data.data) {
        const { token: newToken, user: userData } = data.data
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', newToken)
        }
        
        setToken(newToken)
        setUser(userData)
        
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Login gagal' }
      }
    } catch (error) {
      console.error('Login error:', error)
      
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

