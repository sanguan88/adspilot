/**
 * Role-Based Access Control (RBAC) Permission System
 * 
 * Defines permissions for each role in the User Portal
 * Updated: 2026-01-10
 */

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'staff' | 'user'

/**
 * Permission categories and their allowed roles
 */
export const PERMISSIONS = {
    // ========================================
    // AUTOMATION RULES
    // ========================================
    'rules.view.all': ['superadmin', 'admin'],
    'rules.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'rules.create': ['superadmin', 'admin', 'user'], // user can create within limits
    'rules.edit.all': ['superadmin', 'admin'],
    'rules.edit.own': ['superadmin', 'admin', 'user'],
    'rules.delete.all': ['superadmin', 'admin'],
    'rules.delete.own': ['superadmin', 'admin', 'user'],
    'rules.execute.all': ['superadmin', 'admin'],
    'rules.execute.own': ['superadmin', 'admin', 'user'],

    // ========================================
    // CAMPAIGNS/ADS
    // ========================================
    'campaigns.view.all': ['superadmin', 'admin'],
    'campaigns.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'campaigns.edit.all': ['superadmin', 'admin'],
    'campaigns.edit.own': ['superadmin', 'admin', 'user'],
    'campaigns.budget.all': ['superadmin', 'admin'],
    'campaigns.budget.own': ['superadmin', 'admin', 'user'],

    // ========================================
    // ACCOUNTS/TOKO
    // ========================================
    'accounts.view.all': ['superadmin', 'admin'],
    'accounts.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'accounts.create': ['superadmin', 'admin', 'user'], // user can create within limits
    'accounts.edit.all': ['superadmin', 'admin'],
    'accounts.edit.own': ['superadmin', 'admin', 'user'],
    'accounts.delete.all': ['superadmin', 'admin'],
    'accounts.delete.own': ['superadmin', 'admin', 'user'],

    // ========================================
    // USER MANAGEMENT
    // ========================================
    'users.view': ['superadmin', 'admin'],
    'users.create': ['superadmin', 'admin'],
    'users.edit': ['superadmin', 'admin'],
    'users.delete': ['superadmin', 'admin'],
    'users.change_role': ['superadmin', 'admin'],

    // ========================================
    // SUBSCRIPTION MANAGEMENT
    // ========================================
    // Payment/Transactions
    'transactions.view.all': ['superadmin', 'admin'],
    'transactions.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'transactions.create': ['user'], // user creates payment
    'transactions.approve': ['superadmin', 'admin', 'manager'],
    'transactions.reject': ['superadmin', 'admin', 'manager'],
    'transactions.refund': ['superadmin', 'admin'],
    'transactions.export': ['superadmin', 'admin', 'manager'],

    // Plans
    'plans.view': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'plans.create': ['superadmin', 'admin', 'manager'],
    'plans.edit': ['superadmin', 'admin', 'manager'],
    'plans.delete': ['superadmin', 'admin', 'manager'],

    // Subscriptions
    'subscriptions.view.all': ['superadmin', 'admin'],
    'subscriptions.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'subscriptions.assign': ['superadmin', 'admin', 'manager'],
    'subscriptions.change_plan': ['superadmin', 'admin', 'manager'],
    'subscriptions.extend': ['superadmin', 'admin', 'manager'],
    'subscriptions.cancel': ['superadmin', 'admin', 'manager'],

    // Limits/Quota
    'limits.view.all': ['superadmin', 'admin'],
    'limits.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'limits.edit': ['superadmin', 'admin', 'manager'],
    'limits.override': ['superadmin', 'admin'],

    // Invoices
    'invoices.view.all': ['superadmin', 'admin'],
    'invoices.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'invoices.generate': ['superadmin', 'admin', 'manager'],
    'invoices.send': ['superadmin', 'admin', 'manager'],
    'invoices.mark_paid': ['superadmin', 'admin', 'manager'],

    // ========================================
    // SETTINGS
    // ========================================
    'settings.view.system': ['superadmin', 'admin'],
    'settings.edit.system': ['superadmin', 'admin'],
    'settings.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'settings.edit.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],

    // ========================================
    // REPORTS/LOGS
    // ========================================
    'logs.view.all': ['superadmin', 'admin'],
    'logs.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'reports.view.all': ['superadmin', 'admin'],
    'reports.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
    'reports.export.all': ['superadmin', 'admin'],
    'reports.export.own': ['superadmin', 'admin', 'manager', 'user'],
    'analytics.view.all': ['superadmin', 'admin'],
    'analytics.view.own': ['superadmin', 'admin', 'manager', 'staff', 'user'],
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission]
    if (!allowedRoles) {
        console.warn(`[RBAC] Unknown permission: ${permission}`)
        return false
    }
    return (allowedRoles as readonly string[]).includes(role)
}

/**
 * Check if a role can perform an action on all resources (not just own)
 */
export function canAccessAll(role: UserRole, resource: string): boolean {
    // Superadmin and admin can access all
    if (role === 'superadmin' || role === 'admin') {
        return true
    }

    // User/Manager/Staff can only access own resources (calculated via id_toko ownership)
    return false
}

/**
 * Check if a role is admin or higher
 */
export function isAdminOrHigher(role: UserRole): boolean {
    return role === 'superadmin' || role === 'admin'
}

/**
 * Check if a role is manager or higher
 */
export function isManagerOrHigher(role: UserRole): boolean {
    return role === 'superadmin' || role === 'admin' || role === 'manager'
}

/**
 * Check if a role is staff or higher
 */
export function isStaffOrHigher(role: UserRole): boolean {
    return role === 'superadmin' || role === 'admin' || role === 'manager' || role === 'staff'
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
    const permissions: Permission[] = []

    for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
        if ((allowedRoles as readonly string[]).includes(role)) {
            permissions.push(permission as Permission)
        }
    }

    return permissions
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
        superadmin: 'Super Admin',
        admin: 'Administrator',
        manager: 'Manager',
        staff: 'Staff',
        user: 'User'
    }
    return roleNames[role] || role
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
        superadmin: 'Full system access with all permissions',
        admin: 'Administrative access to manage users and system',
        manager: 'Subscription and payment management',
        staff: 'Read-only access for monitoring',
        user: 'Standard user with access to own resources'
    }
    return descriptions[role] || ''
}
