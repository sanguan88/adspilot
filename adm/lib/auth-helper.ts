import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { hasPermission, Permission, UserRole } from './permissions'

const JWT_SECRET = process.env.JWT_SECRET || 'ADBOT-SOROBOT-2026-CB45'

/**
 * Get authenticated admin user from request
 * Returns userId and role, or null if not authenticated
 */
export async function getAdminUser(request: NextRequest): Promise<{ userId: string; role: string; email?: string; username?: string } | null> {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)

    // Handle bypass token - ONLY IN DEVELOPMENT
    if (token === 'bypass-token') {
      if (process.env.NODE_ENV === 'development') {
        return { userId: 'bypass-admin', role: 'superadmin', email: 'admin@adspilot.id', username: 'admin' }
      } else {
        console.warn('[SECURITY] Bypass token attempted in production environment!')
        return null
      }
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      return {
        userId: decoded.userId || decoded.user_id,
        role: decoded.role || 'admin',
        email: decoded.email,
        username: decoded.username
      }
    } catch {
      // Token invalid, continue to check cookies
    }
  }

  // Try cookie-based authentication
  const cookieToken = request.cookies.get('admin_token')?.value

  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, JWT_SECRET) as any
      return {
        userId: decoded.userId || decoded.user_id,
        role: decoded.role || 'admin',
        email: decoded.email,
        username: decoded.username
      }
    } catch {
      return null
    }
  }

  return null
}

/**
 * Require authentication - throws Error if not authenticated
 */
export async function requireAdminAuth(request: NextRequest) {
  const user = await getAdminUser(request)

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

/**
 * Require specific permission - throws Error if not authorized
 */
export async function requirePermission(
  request: NextRequest,
  permission: keyof Permission
) {
  const user = await requireAdminAuth(request)

  // Cast role string to UserRole type (safe fallback to staff if invalid)
  const role = (user.role as UserRole) || 'staff'

  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }

  // Return extended user object for audit logging
  return {
    id: 0,
    userId: user.userId,
    email: user.email || user.username || user.userId, // Use email > username > userId
    role: user.role,
  }
}

