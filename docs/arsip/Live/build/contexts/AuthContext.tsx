'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: number
  email: string
  name: string
  role: string
  status: string
  photo?: string | null
  photo_profile?: string | null
  kode_site?: string | null
  nama_site?: string | null
  kode_tim?: string | null
  nama_tim?: string | null
  logo_tim?: string | null
  whatsapp?: string | null
  telegram?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (emailOrUsername: string, password: string, remember?: boolean) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is authenticated
  const isAuthenticated = !!user && !!token

  // Load user data on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }

        const storedToken = localStorage.getItem('auth_token')
        
        if (storedToken) {
          setToken(storedToken)
          
          // Try to get user data from token with retry mechanism
          let retryCount = 0
          const maxRetries = 3
          let success = false
          
          while (retryCount < maxRetries && !success) {
            try {
              const response = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json'
                }
              })
              
              if (response.ok) {
                const userData = await response.json()
                if (userData.success && userData.data) {
                  console.log('AuthContext: User data loaded from token:', userData.data)
                  setUser(userData.data)
                  // Store user role in localStorage for optimization
                  if (userData.data.role) {
                    localStorage.setItem('user_role', userData.data.role)
                  }
                  // Store kode_site in localStorage for site filtering
                  if (userData.data.kode_site) {
                    localStorage.setItem('user_kode_site', userData.data.kode_site)
                  }
                  success = true
                } else {
                  // Invalid token response - only clear on last retry
                  if (retryCount >= maxRetries - 1) {
                    console.log('AuthContext: Invalid token response after retries, clearing...')
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('user_role')
                    localStorage.removeItem('user_kode_site')
                    setToken(null)
                    setUser(null)
                  } else {
                    retryCount++
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                    continue
                  }
                }
              } else {
                const errorData = await response.json().catch(() => ({}))
                const status = response.status
                
                // If it's a database error (503), retry
                if (status === 503 || status === 500) {
                  if (retryCount < maxRetries - 1) {
                    console.warn(`AuthContext: Database error (${status}), retrying... (${retryCount + 1}/${maxRetries})`)
                    retryCount++
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                    continue
                  } else {
                    // Last retry failed - but don't clear token, just log error
                    console.error('AuthContext: Database connection failed after retries, but keeping token for next attempt')
                    // Keep token but don't set user - will retry on next page load
                    break
                  }
                } else {
                  // Token validation failed (401) - clear everything
                  if (retryCount >= maxRetries - 1) {
                    console.log('AuthContext: Token validation failed, clearing...')
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('user_role')
                    localStorage.removeItem('user_kode_site')
                    setToken(null)
                    setUser(null)
                  } else {
                    retryCount++
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                    continue
                  }
                }
              }
            } catch (tokenError) {
              console.error('AuthContext: Token validation error:', tokenError)
              
              // Retry on network errors
              if (retryCount < maxRetries - 1) {
                console.warn(`AuthContext: Network error, retrying... (${retryCount + 1}/${maxRetries})`)
                retryCount++
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                continue
              } else {
                // Last retry failed - but don't clear token on network error
                console.error('AuthContext: Network error after retries, but keeping token for next attempt')
                // Keep token but don't set user - will retry on next page load
                break
              }
            }
          }
          
          setIsLoading(false)
        } else {
          console.log('AuthContext: No stored token found')
          setToken(null)
          setUser(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Helper function to get or generate device identifier
  const getOrGenerateDeviceIdentifier = (): string => {
    if (typeof window === 'undefined') return ''
    
    const stored = localStorage.getItem('device_identifier')
    if (stored) return stored

    // Generate device identifier from device info
    const deviceInfo = {
      os: navigator.platform,
      browser: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      timestamp: Date.now()
    }
    
    const deviceInfoString = JSON.stringify(deviceInfo)
    const deviceId = 'device-' + btoa(deviceInfoString)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 30)
    
    localStorage.setItem('device_identifier', deviceId)
    return deviceId
  }

  // Helper function to get device name
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

  // Login function
  const login = async (emailOrUsername: string, password: string, remember: boolean = false): Promise<boolean> => {
    try {
      setIsLoading(true)
      console.log('AuthContext: Starting login process...', { remember })
      
      // Get device information
      const deviceIdentifier = getOrGenerateDeviceIdentifier()
      const deviceName = getDeviceName()
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
      const timezone = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrUsername,
          password,
          remember,
          device_identifier: deviceIdentifier,
          device_name: deviceName,
          user_agent: userAgent,
          timezone: timezone
        })
      })

      // Handle errors before parsing JSON
      if (!response.ok) {
        let errorMessage = 'Terjadi kesalahan saat proses login. Silakan coba lagi.'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If can't parse error response, use default message
          if (response.status === 403) {
            errorMessage = 'Akses ditolak. Silakan hubungi administrator.'
          } else if (response.status === 401) {
            errorMessage = 'Username atau password salah.'
          } else if (response.status >= 500) {
            errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
          }
        }
        
        console.log('AuthContext: Login failed:', response.status, errorMessage)
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('AuthContext: API response:', data)
      
      if (data.success && data.data) {
        console.log('AuthContext: Login successful, setting user data...')
        const { user: userData, token: newToken } = data.data
        
        // Store token and user data FIRST
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', newToken)
          localStorage.setItem('user_role', userData.role)
          // Store kode_site if available
          if (userData.kode_site) {
            localStorage.setItem('user_kode_site', userData.kode_site)
          }
        }
        
        // Set state synchronously - this will trigger isAuthenticated to become true
        setUser(userData)
        setToken(newToken)
        
        console.log('AuthContext: User and token set successfully', { 
          hasUser: !!userData, 
          hasToken: !!newToken,
          userRole: userData.role 
        })
        
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100))
        
        return true
      }
      
      // If login failed, throw error with message from API
      const errorMessage = data.error || 'Terjadi kesalahan saat proses login. Silakan coba lagi.'
      console.log('AuthContext: Login failed - no success or data')
      throw new Error(errorMessage)
    } catch (error: any) {
      console.error('AuthContext: Login error:', error)
      // Re-throw error with message so login page can display it
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    setUser(null)
    setToken(null)
    
    // Clear all auth data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user_kode_site')
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('username')
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    if (!token) return
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        if (userData.success && userData.data) {
          setUser(userData.data)
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

