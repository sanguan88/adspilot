import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

interface UserFromToken {
  id: number
  email: string
  name: string
  role: string
  status: string
  kode_site: string | null
  photo?: string | null
}

/**
 * Check if user is admin or superadmin
 * @param user User object from token
 * @returns true if user is admin or superadmin
 */
export function isAdminOrSuperAdmin(user: UserFromToken): boolean {
  const role = user.role?.toLowerCase() || ''
  return role === 'admin' || role === 'superadmin' || role === 'super_admin'
}

/**
 * Extract and verify user from JWT token in request
 * @param request NextRequest object
 * @returns User data from token or throws error
 */
export function getUserFromToken(request: NextRequest): UserFromToken {
  // Get token from Authorization header
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization token required')
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  // Verify JWT token
  const jwtSecret = process.env.JWT_SECRET || 'sorobot-live-secret-key-change-in-production'
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as any
    
    // Return user data
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      status: decoded.status,
      kode_site: decoded.kode_site || null,
      photo: decoded.photo || null
    }
  } catch (jwtError: any) {
    if (jwtError.name === 'TokenExpiredError') {
      throw new Error('Token telah kedaluwarsa')
    }
    throw new Error('Invalid or expired token')
  }
}

