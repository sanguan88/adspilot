/**
 * Commission calculator for flexible commission system
 * Supports first payment and recurring commission
 */

export interface CommissionConfig {
  affiliateId: string
  firstPaymentRate?: number // Percentage for first payment (e.g., 10 = 10%)
  recurringRate?: number // Percentage for recurring payments (e.g., 5 = 5%)
  fixedFirstPayment?: number // Fixed amount for first payment
  fixedRecurring?: number // Fixed amount for recurring
  usePercentage: boolean // true = percentage, false = fixed amount
}

export interface OrderData {
  orderId: string
  userId: string
  affiliateId: string
  amount: number
  planId: string
  isFirstPayment: boolean
}

/**
 * Calculate commission for an order
 */
export function calculateCommission(
  orderData: OrderData,
  config: CommissionConfig
): number {
  const { amount, isFirstPayment } = orderData

  if (isFirstPayment) {
    // First payment commission
    if (config.usePercentage) {
      const rate = config.firstPaymentRate || 0
      return Math.round(amount * (rate / 100))
    } else {
      return config.fixedFirstPayment || 0
    }
  } else {
    // Recurring commission
    if (config.usePercentage) {
      const rate = config.recurringRate || 0
      return Math.round(amount * (rate / 100))
    } else {
      return config.fixedRecurring || 0
    }
  }
}

/**
 * Get default commission config for an affiliate
 * Falls back to plan default if affiliate doesn't have custom config
 */
export async function getCommissionConfig(
  affiliateId: string,
  planId: string,
  db: any
): Promise<CommissionConfig> {
  // Try to get affiliate-specific config first
  const affiliateConfigResult = await db.query(
    `SELECT 
      first_payment_rate,
      recurring_rate,
      fixed_first_payment,
      fixed_recurring,
      use_percentage
    FROM affiliate_commission_configs
    WHERE affiliate_id = $1 AND plan_id = $2`,
    [affiliateId, planId]
  )

  if (affiliateConfigResult.rows.length > 0) {
    const row = affiliateConfigResult.rows[0]
    return {
      affiliateId,
      firstPaymentRate: row.first_payment_rate,
      recurringRate: row.recurring_rate,
      fixedFirstPayment: row.fixed_first_payment,
      fixedRecurring: row.fixed_recurring,
      usePercentage: row.use_percentage,
    }
  }

  // Fallback to plan default config
  const planConfigResult = await db.query(
    `SELECT 
      default_first_payment_rate,
      default_recurring_rate,
      default_fixed_first_payment,
      default_fixed_recurring,
      default_use_percentage
    FROM subscription_plans
    WHERE plan_id = $1`,
    [planId]
  )

  if (planConfigResult.rows.length > 0) {
    const row = planConfigResult.rows[0]
    return {
      affiliateId,
      firstPaymentRate: row.default_first_payment_rate,
      recurringRate: row.default_recurring_rate,
      fixedFirstPayment: row.default_fixed_first_payment,
      fixedRecurring: row.default_fixed_recurring,
      usePercentage: row.default_use_percentage ?? true,
    }
  }

  // Default fallback
  return {
    affiliateId,
    firstPaymentRate: 10, // 10% default
    recurringRate: 5, // 5% default
    usePercentage: true,
  }
}

/**
 * Check if this is the first payment for a user
 */
export async function isFirstPayment(
  userId: string,
  db: any
): Promise<boolean> {
  const result = await db.query(
    `SELECT COUNT(*) as count
    FROM orders
    WHERE user_id = $1 AND status = 'paid'`,
    [userId]
  )

  const count = parseInt(result.rows[0]?.count || '0')
  return count === 0 // First payment if no previous paid orders
}

