import { PoolClient } from 'pg'

// Plan interface (must match admin storage)
export interface Plan {
  id: string
  name: string
  price: number
  billingCycle: string
  features: {
    maxAccounts: number
    maxAutomationRules: number
    maxCampaigns: number
    support: string
  }
  description: string
  isActive: boolean
}

// Subscription plans storage (shared with admin)
// TODO: Move this to a shared location or database
export const SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billingCycle: 'monthly',
    features: {
      maxAccounts: 1,
      maxAutomationRules: 3,
      maxCampaigns: 10,
      support: 'community',
    },
    description: 'Perfect for getting started',
    isActive: true,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 100000,
    billingCycle: 'monthly',
    features: {
      maxAccounts: 3,
      maxAutomationRules: 20,
      maxCampaigns: 100,
      support: 'email',
    },
    description: 'For small businesses',
    isActive: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 300000,
    billingCycle: 'monthly',
    features: {
      maxAccounts: 10,
      maxAutomationRules: -1, // unlimited
      maxCampaigns: -1, // unlimited
      support: 'priority',
    },
    description: 'For growing businesses',
    isActive: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1000000,
    billingCycle: 'monthly',
    features: {
      maxAccounts: -1, // unlimited
      maxAutomationRules: -1, // unlimited
      maxCampaigns: -1, // unlimited
      support: 'dedicated',
    },
    description: 'For large organizations',
    isActive: true,
  },
]

export interface SubscriptionLimits {
  maxAccounts: number // -1 means unlimited
  maxAutomationRules: number // -1 means unlimited
  maxCampaigns: number // -1 means unlimited
}

export interface SubscriptionInfo {
  planId: string | null
  planName: string | null
  limits: SubscriptionLimits
  hasActiveSubscription: boolean
}

/**
 * Get plan features from plan storage
 */
function getPlanFeatures(planId: string): SubscriptionLimits | null {
  const plan = SUBSCRIPTION_PLANS.find((p: Plan) => p.id === planId)
  if (!plan) {
    return null
  }

  return {
    maxAccounts: plan.features.maxAccounts,
    maxAutomationRules: plan.features.maxAutomationRules,
    maxCampaigns: plan.features.maxCampaigns,
  }
}

/**
 * Get default limits (when user has no active subscription)
 * Uses free plan limits for consistency
 * Campaign default is unlimited for now
 */
function getDefaultLimits(): SubscriptionLimits {
  // Default: use free plan limits for consistency with admin portal
  const freePlan = SUBSCRIPTION_PLANS.find((p: Plan) => p.id === 'free')
  if (freePlan) {
    return {
      maxAccounts: freePlan.features.maxAccounts,
      maxAutomationRules: freePlan.features.maxAutomationRules,
      maxCampaigns: -1, // Unlimited by default
    }
  }
  // Fallback if free plan not found
  return {
    maxAccounts: 1,
    maxAutomationRules: 3,
    maxCampaigns: -1, // Unlimited by default
  }
}

/**
 * Get subscription limits for a user
 * Returns the effective limits based on user's active subscription
 */
export async function getUserSubscriptionLimits(
  connection: PoolClient,
  userId: string
): Promise<SubscriptionInfo> {
  try {
    // Check for custom limits override first
    const overrideResult = await connection.query(
      `SELECT max_accounts, max_automation_rules, max_campaigns
       FROM user_limits_override
       WHERE user_id = $1`,
      [userId]
    )

    // Get active subscription
    const subscriptionResult = await connection.query(
      `SELECT plan_id, status
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    )

    let planId: string | null = null
    let planName: string | null = null
    let planFeatures: SubscriptionLimits | null = null

    if (subscriptionResult.rows.length > 0) {
      planId = subscriptionResult.rows[0].plan_id
      planFeatures = getPlanFeatures(planId)
      const plan = SUBSCRIPTION_PLANS.find((p: Plan) => p.id === planId)
      
      if (plan) {
        planName = plan.name
      }
    }

    // If no plan found, use default limits
    if (!planFeatures) {
      planFeatures = getDefaultLimits()
    }

    // Apply override if exists
    if (overrideResult.rows.length > 0) {
      const override = overrideResult.rows[0]
      
      // Override logic: NULL in override = use plan default, non-NULL = use override value
      return {
        planId: planId || null,
        planName: planName || null,
        limits: {
          maxAccounts: override.max_accounts !== null ? override.max_accounts : planFeatures.maxAccounts,
          maxAutomationRules: override.max_automation_rules !== null ? override.max_automation_rules : planFeatures.maxAutomationRules,
          maxCampaigns: override.max_campaigns !== null ? override.max_campaigns : planFeatures.maxCampaigns,
        },
        hasActiveSubscription: subscriptionResult.rows.length > 0,
      }
    }

    // No override, use plan limits
    return {
      planId: planId || null,
      planName: planName || null,
      limits: planFeatures,
      hasActiveSubscription: subscriptionResult.rows.length > 0,
    }
  } catch (error) {
    console.error('Error getting user subscription limits:', error)
    // Return default limits on error
    return {
      planId: null,
      planName: null,
      limits: getDefaultLimits(),
      hasActiveSubscription: false,
    }
  }
}

/**
 * Check if value is within limit
 * Returns true if within limit or unlimited, false if exceeded
 */
export function isWithinLimit(currentCount: number, limit: number): boolean {
  // -1 means unlimited
  if (limit === -1) {
    return true
  }
  return currentCount < limit
}

/**
 * Get usage count for accounts (toko)
 */
export async function getAccountUsageCount(
  connection: PoolClient,
  userId: string
): Promise<number> {
  const result = await connection.query(
    `SELECT COUNT(*) as count
     FROM data_toko
     WHERE user_id = $1`,
    [userId]
  )
  return parseInt(result.rows[0]?.count || '0', 10)
}

/**
 * Get usage count for active automation rules
 */
export async function getAutomationRulesUsageCount(
  connection: PoolClient,
  userId: string
): Promise<number> {
  const result = await connection.query(
    `SELECT COUNT(*) as count
     FROM data_rules
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  )
  return parseInt(result.rows[0]?.count || '0', 10)
}

/**
 * Get usage count for unique campaigns
 */
export async function getCampaignsUsageCount(
  connection: PoolClient,
  userId: string
): Promise<number> {
  const result = await connection.query(
    `SELECT COUNT(DISTINCT campaign_id) as count
     FROM data_produk
     WHERE user_id = $1`,
    [userId]
  )
  return parseInt(result.rows[0]?.count || '0', 10)
}

/**
 * Validate account limit before adding new account
 */
export async function validateAccountLimit(
  connection: PoolClient,
  userId: string,
  userRole?: string
): Promise<{ allowed: boolean; error?: string; usage?: number; limit?: number }> {
  // Skip validation for admin/superadmin
  if (userRole === 'admin' || userRole === 'superadmin') {
    return { allowed: true }
  }

  const subscriptionInfo = await getUserSubscriptionLimits(connection, userId)
  const usage = await getAccountUsageCount(connection, userId)
  const limit = subscriptionInfo.limits.maxAccounts

  if (!isWithinLimit(usage, limit)) {
    const limitText = limit === -1 ? 'unlimited' : limit.toString()
    return {
      allowed: false,
      error: `Anda telah mencapai batas maksimal toko untuk plan ini. Limit: ${limitText}, Usage: ${usage}. Upgrade plan untuk menambah lebih banyak toko.`,
      usage,
      limit,
    }
  }

  return {
    allowed: true,
    usage,
    limit,
  }
}

/**
 * Validate automation rules limit before creating/activating rule
 */
export async function validateAutomationRulesLimit(
  connection: PoolClient,
  userId: string,
  userRole?: string
): Promise<{ allowed: boolean; error?: string; usage?: number; limit?: number }> {
  // Skip validation for admin/superadmin
  if (userRole === 'admin' || userRole === 'superadmin') {
    return { allowed: true }
  }

  const subscriptionInfo = await getUserSubscriptionLimits(connection, userId)
  const usage = await getAutomationRulesUsageCount(connection, userId)
  const limit = subscriptionInfo.limits.maxAutomationRules

  if (!isWithinLimit(usage, limit)) {
    const limitText = limit === -1 ? 'unlimited' : limit.toString()
    return {
      allowed: false,
      error: `Anda telah mencapai batas maksimal automation rules aktif untuk plan ini. Limit: ${limitText}, Usage: ${usage}. Nonaktifkan rule lain atau upgrade plan.`,
      usage,
      limit,
    }
  }

  return {
    allowed: true,
    usage,
    limit,
  }
}

/**
 * Validate campaigns limit before syncing campaigns
 * Returns list of campaign IDs that are allowed to sync
 */
export async function validateCampaignsLimitForSync(
  connection: PoolClient,
  userId: string,
  campaignIds: string[],
  userRole?: string
): Promise<{ allowed: boolean; allowedCampaignIds: string[]; skippedCount: number; error?: string; usage?: number; limit?: number }> {
  // Skip validation for admin/superadmin - allow all campaigns
  if (userRole === 'admin' || userRole === 'superadmin') {
    return { 
      allowed: true, 
      allowedCampaignIds: campaignIds,
      skippedCount: 0
    }
  }

  const subscriptionInfo = await getUserSubscriptionLimits(connection, userId)
  const currentUsage = await getCampaignsUsageCount(connection, userId)
  const limit = subscriptionInfo.limits.maxCampaigns

  // If unlimited, allow all campaigns
  if (limit === -1) {
    return {
      allowed: true,
      allowedCampaignIds: campaignIds,
      skippedCount: 0,
      usage: currentUsage,
      limit: -1,
    }
  }

  // Get existing campaign IDs for this user
  const existingCampaignsResult = await connection.query(
    `SELECT DISTINCT campaign_id
     FROM data_produk
     WHERE user_id = $1 AND campaign_id = ANY($2::text[])`,
    [userId, campaignIds]
  )
  const existingCampaignIds = existingCampaignsResult.rows.map((row: any) => row.campaign_id.toString())
  
  // Filter out existing campaigns (these are updates, not new campaigns)
  const newCampaignIds = campaignIds.filter(id => !existingCampaignIds.includes(id.toString()))
  const newCampaignsCount = newCampaignIds.length

  // Check if adding new campaigns would exceed limit
  if (currentUsage + newCampaignsCount > limit) {
    // Calculate how many new campaigns can be added
    const availableSlots = limit - currentUsage
    const allowedNewCampaigns = newCampaignIds.slice(0, Math.max(0, availableSlots))
    const skippedCount = newCampaignsCount - allowedNewCampaigns.length

    // Combine existing campaigns (allowed) + allowed new campaigns
    const allowedCampaignIds = [...existingCampaignIds, ...allowedNewCampaigns]

    return {
      allowed: allowedCampaignIds.length > 0, // At least some campaigns are allowed
      allowedCampaignIds,
      skippedCount,
      error: skippedCount > 0 
        ? `Sync akan melewati ${skippedCount} campaign baru karena melebihi batas limit. Limit: ${limit}, Usage: ${currentUsage}, New: ${newCampaignsCount}. Upgrade plan untuk sync semua campaign.`
        : undefined,
      usage: currentUsage,
      limit,
    }
  }

  // All campaigns are allowed
  return {
    allowed: true,
    allowedCampaignIds: campaignIds,
    skippedCount: 0,
    usage: currentUsage,
    limit,
  }
}

/**
 * Validate campaign assignments when creating/updating automation rules
 * Checks if assigned toko IDs are valid and active for the user
 * Checks if assigned campaign IDs exist in data_produk and belong to the user
 * 
 * @param connection Database connection
 * @param userId User ID
 * @param campaignAssignments Object mapping toko IDs to campaign IDs: { tokoId: [campaignIds] }
 * @param userRole Optional user role (admin/superadmin skip validation)
 * @returns Validation result with allowed status, error message, and invalid campaigns list
 */
export async function validateCampaignAssignments(
  connection: PoolClient,
  userId: string,
  campaignAssignments: Record<string, string[]>,
  userRole?: string
): Promise<{ allowed: boolean; error?: string; invalidCampaigns?: string[] }> {
  // Skip validation for admin/superadmin
  if (userRole === 'admin' || userRole === 'superadmin') {
    return { allowed: true }
  }

  const allAssignedCampaignIds = Object.values(campaignAssignments).flat()
  const allAssignedTokoIds = Object.keys(campaignAssignments)

  // If no campaigns assigned, validation passes
  if (allAssignedCampaignIds.length === 0) {
    return { allowed: true }
  }

  // 1. Check if all assigned toko IDs belong to the user and are active
  const allowedTokoResult = await connection.query(
    `SELECT id_toko FROM data_toko WHERE user_id = $1 AND status_toko = 'active' AND id_toko = ANY($2::text[])`,
    [userId, allAssignedTokoIds]
  )
  const allowedTokoIds = allowedTokoResult.rows.map((row: any) => row.id_toko)
  const invalidTokoIds = allAssignedTokoIds.filter(tokoId => !allowedTokoIds.includes(tokoId))

  if (invalidTokoIds.length > 0) {
    return {
      allowed: false,
      error: `Toko berikut tidak valid atau tidak aktif untuk user ini: ${invalidTokoIds.join(', ')}.`,
    }
  }

  // 2. Check if all assigned campaign IDs exist in data_produk and belong to the user
  const campaignCheckResult = await connection.query(
    `SELECT DISTINCT campaign_id FROM data_produk WHERE user_id = $1 AND campaign_id = ANY($2::text[])`,
    [userId, allAssignedCampaignIds]
  )
  const existingUserCampaignIds = campaignCheckResult.rows.map((row: any) => row.campaign_id.toString())

  const invalidCampaigns = allAssignedCampaignIds.filter(
    campaignId => !existingUserCampaignIds.includes(campaignId.toString())
  )

  if (invalidCampaigns.length > 0) {
    return {
      allowed: false,
      error: `Campaign berikut tidak ditemukan atau tidak dimiliki oleh user ini: ${invalidCampaigns.join(', ')}. Pastikan campaign sudah di-sync.`,
      invalidCampaigns,
    }
  }

  return { allowed: true }
}

