import { PoolClient } from 'pg'

/**
 * Check if a shop has already used a trial for a specific plan
 * @param connection Database connection
 * @param shopId Shop ID from Shopee
 * @param planId Plan ID (e.g., '7-day-trial')
 * @returns Object with hasUsedTrial boolean and trial history if exists
 */
export async function checkShopTrialUsage(
    connection: PoolClient,
    shopId: string,
    planId: string
): Promise<{
    hasUsedTrial: boolean
    trialHistory?: {
        userId: number
        trialStartedAt: Date
        trialEndedAt?: Date
        status: string
    }
}> {
    const result = await connection.query(
        `SELECT 
      user_id,
      trial_started_at,
      trial_ended_at,
      status
    FROM trial_usage_history
    WHERE shop_id = $1 AND plan_id = $2
    LIMIT 1`,
        [shopId, planId]
    )

    if (result.rows.length > 0) {
        const row = result.rows[0]
        return {
            hasUsedTrial: true,
            trialHistory: {
                userId: row.user_id,
                trialStartedAt: row.trial_started_at,
                trialEndedAt: row.trial_ended_at,
                status: row.status,
            },
        }
    }

    return { hasUsedTrial: false }
}

/**
 * Record a new trial usage for a shop
 * @param connection Database connection
 * @param shopId Shop ID from Shopee
 * @param shopName Shop name
 * @param userId User ID who is using the trial
 * @param planId Plan ID (e.g., '7-day-trial')
 * @param subscriptionId Subscription ID (optional)
 * @param trialDurationDays Duration of trial in days
 */
export async function recordTrialUsage(
    connection: PoolClient,
    shopId: string,
    shopName: string,
    userId: number,
    planId: string,
    subscriptionId?: number,
    trialDurationDays: number = 7
): Promise<void> {
    const trialStartedAt = new Date()
    const trialEndedAt = new Date()
    trialEndedAt.setDate(trialEndedAt.getDate() + trialDurationDays)

    await connection.query(
        `INSERT INTO trial_usage_history (
      shop_id,
      shop_name,
      user_id,
      subscription_id,
      trial_started_at,
      trial_ended_at,
      plan_id,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (shop_id, plan_id) DO NOTHING`,
        [
            shopId,
            shopName,
            userId,
            subscriptionId,
            trialStartedAt,
            trialEndedAt,
            planId,
            'active',
        ]
    )
}

/**
 * Get all shops that a user has assigned (including deleted ones)
 * This is used to check trial eligibility
 * @param connection Database connection
 * @param userId User ID
 * @returns Array of shop IDs
 */
export async function getUserShopIds(
    connection: PoolClient,
    userId: number
): Promise<string[]> {
    const result = await connection.query(
        `SELECT DISTINCT id_toko 
    FROM data_toko 
    WHERE CAST(user_id AS INTEGER) = $1`,
        [userId]
    )

    return result.rows.map((row) => row.id_toko)
}
