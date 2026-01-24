import { PoolClient } from 'pg'
import { UserPayload } from './auth'
import { canAccessAllData } from './role-filter'

/**
 * Validate if user owns a toko/account
 * Returns true if user can access (admin/superadmin or owner)
 */
export async function validateTokoOwnership(
  connection: PoolClient,
  user: UserPayload,
  tokoId: string
): Promise<boolean> {
  // Admin/Superadmin can access all
  if (canAccessAllData(user)) {
    return true
  }

  // Check if toko belongs to user
  const result = await connection.query(
    'SELECT user_id FROM data_toko WHERE id_toko = $1',
    [tokoId]
  )

  if (result.rows.length === 0) {
    return false // Toko not found
  }

  return result.rows[0].user_id === user.userId
}

/**
 * Validate if user owns a rule
 * Returns true if user can access (admin/superadmin or owner)
 */
export async function validateRuleOwnership(
  connection: PoolClient,
  user: UserPayload,
  ruleId: string
): Promise<boolean> {
  // Admin/Superadmin can access all
  if (canAccessAllData(user)) {
    return true
  }

  // Check if rule belongs to user
  const result = await connection.query(
    'SELECT user_id FROM data_rules WHERE rule_id = $1',
    [ruleId]
  )

  if (result.rows.length === 0) {
    return false // Rule not found
  }

  return result.rows[0].user_id === user.userId
}

/**
 * Validate if user owns a campaign (via toko ownership)
 * Returns true if user can access (admin/superadmin or owner of toko)
 */
export async function validateCampaignOwnership(
  connection: PoolClient,
  user: UserPayload,
  campaignId: string
): Promise<boolean> {
  // Admin/Superadmin can access all
  if (canAccessAllData(user)) {
    return true
  }

  // Get toko_id from campaign
  const campaignResult = await connection.query(
    'SELECT id_toko FROM data_produk WHERE campaign_id = $1',
    [campaignId]
  )

  if (campaignResult.rows.length === 0) {
    return false // Campaign not found
  }

  const tokoId = campaignResult.rows[0].id_toko

  // Check if toko belongs to user
  return validateTokoOwnership(connection, user, tokoId)
}

