/**
 * Permission helper functions for role-based access control
 */

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'staff'

export interface Permission {
  canManageUsers: boolean
  canManageSubscriptions: boolean
  canManageAffiliates: boolean
  canImpersonateAffiliate: boolean
  canManageSettings: boolean
  canViewReports: boolean
  canManageOrders: boolean
  canManageLicenses: boolean
}

/**
 * Get permissions for a user role
 */
export function getPermissions(role: UserRole): Permission {
  switch (role) {
    case 'superadmin':
      return {
        canManageUsers: true,
        canManageSubscriptions: true,
        canManageAffiliates: true,
        canImpersonateAffiliate: true,
        canManageSettings: true,
        canViewReports: true,
        canManageOrders: true,
        canManageLicenses: true,
      }
    case 'admin':
      return {
        canManageUsers: true,
        canManageSubscriptions: true,
        canManageAffiliates: true,
        canImpersonateAffiliate: true, // Admin can impersonate if explicitly allowed
        canManageSettings: false, // Limited settings access
        canViewReports: true,
        canManageOrders: true,
        canManageLicenses: true,
      }
    case 'manager':
      return {
        canManageUsers: false,
        canManageSubscriptions: true,
        canManageAffiliates: true,
        canImpersonateAffiliate: false,
        canManageSettings: false,
        canViewReports: true,
        canManageOrders: true,
        canManageLicenses: false,
      }
    case 'staff':
      return {
        canManageUsers: false,
        canManageSubscriptions: false,
        canManageAffiliates: false,
        canImpersonateAffiliate: false,
        canManageSettings: false,
        canViewReports: true,
        canManageOrders: false,
        canManageLicenses: false,
      }
    default:
      return {
        canManageUsers: false,
        canManageSubscriptions: false,
        canManageAffiliates: false,
        canImpersonateAffiliate: false,
        canManageSettings: false,
        canViewReports: false,
        canManageOrders: false,
        canManageLicenses: false,
      }
  }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
  const permissions = getPermissions(role)
  return permissions[permission]
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'superadmin'
}

/**
 * Check if user can perform admin actions
 */
export function canPerformAdminAction(role: UserRole): boolean {
  return role === 'superadmin' || role === 'admin'
}

