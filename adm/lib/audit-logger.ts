/**
 * Audit Logger Helper
 * Purpose: Centralized logging for all admin actions
 * Usage: import { logAudit } from '@/lib/audit-logger'
 */

import { getDatabaseConnection } from './db'

export interface AuditLogData {
    userId: string | number
    userEmail?: string
    userRole?: string
    action: string
    resourceType: string
    resourceId?: string | number
    resourceName?: string
    description?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    ipAddress?: string
    userAgent?: string
    status?: 'success' | 'failed' | 'pending'
    errorMessage?: string
}

/**
 * Log an audit entry
 * @param data Audit log data
 * @returns Promise<void>
 */
export async function logAudit(data: AuditLogData): Promise<void> {
    const connection = await getDatabaseConnection()

    try {
        await connection.query(
            `INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type,
        resource_id, resource_name, description, old_values, new_values,
        ip_address, user_agent, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                data.userId,
                data.userEmail || null,
                data.userRole || null,
                data.action,
                data.resourceType,
                data.resourceId?.toString() || null,
                data.resourceName || null,
                data.description || null,
                data.oldValues ? JSON.stringify(data.oldValues) : null,
                data.newValues ? JSON.stringify(data.newValues) : null,
                data.ipAddress || null,
                data.userAgent || null,
                data.status || 'success',
                data.errorMessage || null,
            ]
        )
    } catch (error) {
        // Don't throw error to prevent audit logging from breaking the main flow
        console.error('[Audit Logger] Failed to log audit:', error)
    } finally {
        connection.release()
    }
}

/**
 * Helper to extract IP address from request
 * @param request NextRequest
 * @returns string | undefined
 */
export function getIpAddress(request: any): string | undefined {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        request.ip ||
        undefined
    )
}

/**
 * Helper to extract user agent from request
 * @param request NextRequest
 * @returns string | undefined
 */
export function getUserAgent(request: any): string | undefined {
    return request.headers.get('user-agent') || undefined
}

/**
 * Predefined action types for consistency
 */
export const AuditActions = {
    // User actions
    USER_CREATE: 'user.create',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_PASSWORD_RESET: 'user.password_reset',
    USER_LIMITS_UPDATE: 'user.limits_update',

    // Subscription actions
    SUBSCRIPTION_CREATE: 'subscription.create',
    SUBSCRIPTION_UPDATE: 'subscription.update',
    SUBSCRIPTION_CANCEL: 'subscription.cancel',
    SUBSCRIPTION_RENEW: 'subscription.renew',

    // Store actions
    STORE_ASSIGN: 'store.assign',
    STORE_UNASSIGN: 'store.unassign',
    STORE_UPDATE: 'store.update',

    // Voucher actions
    VOUCHER_CREATE: 'voucher.create',
    VOUCHER_UPDATE: 'voucher.update',
    VOUCHER_DELETE: 'voucher.delete',

    // Order actions
    ORDER_CREATE: 'order.create',
    ORDER_UPDATE: 'order.update',
    ORDER_CANCEL: 'order.cancel',

    // Affiliate actions
    AFFILIATE_CREATE: 'affiliate.create',
    AFFILIATE_UPDATE: 'affiliate.update',
    AFFILIATE_PAYOUT: 'affiliate.payout',

    // Settings actions
    SETTINGS_UPDATE: 'settings.update',

    // System actions
    SYSTEM_MIGRATION: 'system.migration',
    SYSTEM_BACKUP: 'system.backup',
    SYSTEM_RESTORE: 'system.restore',
} as const

/**
 * Predefined resource types for consistency
 */
export const ResourceTypes = {
    USER: 'user',
    SUBSCRIPTION: 'subscription',
    STORE: 'store',
    VOUCHER: 'voucher',
    ORDER: 'order',
    AFFILIATE: 'affiliate',
    SETTINGS: 'settings',
    DATABASE: 'database',
    SYSTEM: 'system',
} as const

/**
 * Quick log functions for common actions
 */

export async function logUserAction(
    userId: string | number,
    action: string,
    targetUserId: string | number,
    targetUserEmail?: string,
    description?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
) {
    await logAudit({
        userId,
        action,
        resourceType: ResourceTypes.USER,
        resourceId: targetUserId,
        resourceName: targetUserEmail,
        description,
        oldValues,
        newValues,
    })
}

export async function logSubscriptionAction(
    userId: string | number,
    action: string,
    subscriptionId: string | number,
    description?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
) {
    await logAudit({
        userId,
        action,
        resourceType: ResourceTypes.SUBSCRIPTION,
        resourceId: subscriptionId,
        description,
        oldValues,
        newValues,
    })
}

export async function logStoreAction(
    userId: string | number,
    action: string,
    storeId: string | number,
    storeName?: string,
    description?: string
) {
    await logAudit({
        userId,
        action,
        resourceType: ResourceTypes.STORE,
        resourceId: storeId,
        resourceName: storeName,
        description,
    })
}

export async function logSettingsAction(
    userId: string | number,
    settingKey: string,
    oldValue?: any,
    newValue?: any
) {
    await logAudit({
        userId,
        action: AuditActions.SETTINGS_UPDATE,
        resourceType: ResourceTypes.SETTINGS,
        resourceId: settingKey,
        resourceName: settingKey,
        description: `Updated setting: ${settingKey}`,
        oldValues: oldValue ? { value: oldValue } : undefined,
        newValues: newValue ? { value: newValue } : undefined,
    })
}
