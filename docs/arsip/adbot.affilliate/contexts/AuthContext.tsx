"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  userId: number
  username: string
  email: string
  nama_lengkap: string
  role: 'superadmin' | 'admin' | 'manager' | 'staff'
  kode_site?: string
  nama_site?: string
  kode_tim?: string
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
          // Token invalid, clear it
          logout()
        }
      } else {
        // Token invalid, clear it
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

      const data = await response.json()

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
        return { success: false, error: data.error || 'Login gagal' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Terjadi kesalahan saat login' }
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

