/**
 * Role Checker Helper Functions
 * 
 * Provides helper functions for role-based access control in API endpoints
 * Backward compatible with existing auth system
 * Updated: 2026-01-10
 */

import { NextRequest } from 'next/server'
import { UserPayload, authenticate } from './auth'
import { hasPermission, Permission, UserRole, canAccessAll as canAccessAllFromPermissions, canAccessAll } from './role-permissions'

export { canAccessAllFromPermissions as canAccessAll }

/**
 * Get user role from UserPayload with fallback
 * Ensures backward compatibility with tokens that might not have role field
 */
export function getUserRole(user: UserPayload): UserRole {
    // Fallback: if no role, assume 'user' (safest default)
    const role = user.role || 'user'

    // Validate role
    const validRoles: UserRole[] = ['superadmin', 'admin', 'manager', 'staff', 'user']
    if (!validRoles.includes(role as UserRole)) {
        console.warn(`[Role Checker] Invalid role detected: ${role}, defaulting to 'user'`)
        return 'user'
    }

    return role as UserRole
}

/**
 * Check if user has a specific permission
 * Returns boolean without throwing error
 */
export function checkPermission(user: UserPayload, permission: Permission): boolean {
    const role = getUserRole(user)
    return hasPermission(role, permission)
}

/**
 * Require user to have a specific permission
 * Throws error if permission denied
 */
export function requirePermission(user: UserPayload, permission: Permission): void {
    if (!checkPermission(user, permission)) {
        const role = getUserRole(user)
        throw new Error(`Akses ditolak. Fitur ini memerlukan permission: ${permission}. Role Anda: ${role}`)
    }
}

/**
 * Check if user has any of the specified permissions
 */
export function checkAnyPermission(user: UserPayload, permissions: Permission[]): boolean {
    return permissions.some(permission => checkPermission(user, permission))
}

/**
 * Require user to have any of the specified permissions
 */
export function requireAnyPermission(user: UserPayload, permissions: Permission[]): void {
    if (!checkAnyPermission(user, permissions)) {
        const role = getUserRole(user)
        throw new Error(`Akses ditolak. Fitur ini memerlukan salah satu permission: ${permissions.join(', ')}. Role Anda: ${role}`)
    }
}

/**
 * Check if user can access all resources (not just own)
 */
export function checkCanAccessAll(user: UserPayload, resource: string): boolean {
    const role = getUserRole(user)
    return canAccessAll(role, resource)
}

/**
 * Require user to be able to access all resources
 */
export function requireCanAccessAll(user: UserPayload, resource: string): void {
    if (!checkCanAccessAll(user, resource)) {
        const role = getUserRole(user)
        throw new Error(`Akses ditolak. Anda hanya dapat mengakses ${resource} milik sendiri. Role Anda: ${role}`)
    }
}

/**
 * Check if user has one of the specified roles
 */
export function checkRole(user: UserPayload, allowedRoles: UserRole[]): boolean {
    const role = getUserRole(user)
    return allowedRoles.includes(role)
}

/**
 * Require user to have one of the specified roles
 */
export function requireRole(user: UserPayload, allowedRoles: UserRole[]): void {
    if (!checkRole(user, allowedRoles)) {
        const role = getUserRole(user)
        throw new Error(`Akses ditolak. Fitur ini hanya untuk: ${allowedRoles.join(', ')}. Role Anda: ${role}`)
    }
}

/**
 * Enhanced version of requireRole from auth.ts
 * This version uses the new permission system
 * 
 * @deprecated Use requirePermission instead for more granular control
 */
export function requireRoleEnhanced(request: NextRequest, allowedRoles: UserRole[]): UserPayload {
    const user = authenticate(request)
    if (!user) {
        throw new Error('Authentication required')
    }

    requireRole(user, allowedRoles)
    return user
}

/**
 * Check if user can perform action on resource
 * Combines permission check with ownership validation
 * 
 * @param user - Authenticated user
 * @param action - Action to perform (e.g., 'view', 'edit', 'delete')
 * @param resource - Resource type (e.g., 'rules', 'campaigns', 'accounts')
 * @param isOwn - Whether the resource belongs to the user
 */
export function checkResourceAccess(
    user: UserPayload,
    action: 'view' | 'create' | 'edit' | 'delete' | 'execute',
    resource: string,
    isOwn: boolean = false
): boolean {
    const role = getUserRole(user)

    // Superadmin and admin can do anything
    if (role === 'superadmin' || role === 'admin') {
        return true
    }

    // Build permission key
    const scope = isOwn ? 'own' : 'all'
    const permissionKey = `${resource}.${action}.${scope}` as Permission

    // Check if permission exists and user has it
    return hasPermission(role, permissionKey)
}

/**
 * Require user to have access to resource
 */
export function requireResourceAccess(
    user: UserPayload,
    action: 'view' | 'create' | 'edit' | 'delete' | 'execute',
    resource: string,
    isOwn: boolean = false
): void {
    if (!checkResourceAccess(user, action, resource, isOwn)) {
        const role = getUserRole(user)
        const scope = isOwn ? 'milik sendiri' : 'semua'
        throw new Error(`Akses ditolak. Anda tidak dapat ${action} ${resource} ${scope}. Role Anda: ${role}`)
    }
}

/**
 * Get error message for permission denied
 * Returns user-friendly error message
 */
export function getPermissionDeniedMessage(
    user: UserPayload,
    permission: Permission
): string {
    const role = getUserRole(user)

    // Map permissions to user-friendly messages
    const messages: Partial<Record<Permission, string>> = {
        'rules.create': 'Anda tidak memiliki akses untuk membuat automation rule',
        'rules.edit.all': 'Anda hanya dapat mengedit automation rule milik sendiri',
        'rules.delete.all': 'Anda hanya dapat menghapus automation rule milik sendiri',
        'campaigns.edit.all': 'Anda hanya dapat mengedit campaign milik sendiri',
        'accounts.create': 'Anda tidak memiliki akses untuk menambah akun',
        'transactions.approve': 'Hanya Manager atau Admin yang dapat approve pembayaran',
        'users.view': 'Hanya Admin yang dapat melihat daftar user',
    }

    const customMessage = messages[permission]
    if (customMessage) {
        return `${customMessage}. Role Anda: ${role}`
    }

    return `Akses ditolak. Permission required: ${permission}. Role Anda: ${role}`
}

/**
 * Log permission check for debugging
 * Only logs in development mode
 */
export function logPermissionCheck(
    user: UserPayload,
    permission: Permission,
    granted: boolean
): void {
    if (process.env.NODE_ENV === 'development') {
        const role = getUserRole(user)
        const status = granted ? '✅ GRANTED' : '❌ DENIED'
        console.log(`[RBAC] ${status} - Role: ${role}, Permission: ${permission}, User: ${user.userId}`)
    }
}
