"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('superadmin' | 'admin' | 'manager' | 'staff')[]
  allowPendingPayment?: boolean // Allow access even if payment is pending
}

export function ProtectedRoute({ children, allowedRoles, allowPendingPayment = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth/login')
        return
      }

      // Check role if specified
      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        router.replace('/auth/login')
        return
      }

      // Check payment status: if pending and not on payment-status page, redirect
      // Note: status_user is synced from subscription + transaction tables
      // - 'aktif' = has active subscription
      // - 'pending_payment' = has pending transaction, no active subscription
      // - 'inactive' = no active subscription, no pending transaction
      if (user?.status_user === 'pending_payment' && !allowPendingPayment) {
        // Allow access to payment-status page and auth pages
        const allowedPaths = [
          '/dashboard/payment-status',
          '/auth/login',
          '/auth/checkout',
          '/auth/payment-confirmation',
        ]
        
        const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path))
        
        if (!isAllowedPath) {
          // Use replace() to prevent back navigation - CRITICAL for security
          router.replace('/dashboard/payment-status')
          return
        }
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, router, pathname, allowPendingPayment])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect in useEffect
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null // Will redirect in useEffect
  }

  // Block access if payment is pending and not allowed
  // CRITICAL: This prevents rendering of protected content
  if (user?.status_user === 'pending_payment' && !allowPendingPayment) {
    const allowedPaths = [
      '/dashboard/payment-status',
      '/auth/login',
      '/auth/checkout',
      '/auth/payment-confirmation',
    ]
    
    const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path))
    
    if (!isAllowedPath) {
      // Don't render anything - redirect will happen in useEffect
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    }
  }

  return <>{children}</>
}

