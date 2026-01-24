"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [bypassAuth] = useState(() => {
    // Check if bypass is enabled via environment or localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('BYPASS_AUTH') === 'true' || 
             process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'
    }
    return false
  })

  useEffect(() => {
    // Skip auth check if bypass is enabled
    if (bypassAuth) {
      return
    }

    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router, bypassAuth])

  // Bypass authentication
  if (bypassAuth) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

