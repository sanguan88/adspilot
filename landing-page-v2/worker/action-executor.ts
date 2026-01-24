/**
 * Action Executor
 * 
 * Execute actions when conditions are met
 * 
 * Supported Action Types:
 * - add_budget / increase_budget: Add amount to current budget (uses edit_budget API)
 * - reduce_budget / decrease_budget: Reduce amount from current budget (uses edit_budget API)
 * - set_budget: Set budget to specific amount (uses edit_budget API)
 * - start_campaign / start / resume: Resume paused campaign (uses resume API)
 * - pause_campaign / pause: Pause active campaign (uses pause API)
 * - telegram_notification / notify: Send Telegram notification (handled separately)
 * 
 * Note: For add_budget and reduce_budget, current budget needs to be known.
 * Currently, if current budget is not provided, it will use 0 as fallback.
 * In production, you may want to fetch current budget from campaign data first.
 */

import { RETRY_CONFIG, API_TIMEOUT } from './config'
import { logger } from './logger'
import { manageShopeeAds } from './shopee-api-client'

/**
 * Helper function to create a randomized delay between min and max ms
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const getRandomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

interface Action {
  id: string
  type: string
  label?: string
  amount?: string
  percentage?: string
  adjustmentType?: 'amount' | 'percentage'
  message?: string
}

/**
 * Execute action with retry
 * Throws error if all retries fail, preserving the error message from the endpoint
 */
async function executeWithRetry(
  actionFn: () => Promise<any>,
  actionType: string,
  retryCount: number = 0
): Promise<boolean> {
  try {
    await actionFn()
    return true
  } catch (error) {
    if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delay = RETRY_CONFIG.RETRY_DELAY_MS * (retryCount + 1)
      logger.warn(`Action ${actionType} failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return executeWithRetry(actionFn, actionType, retryCount + 1)
    }
    // After all retries failed, throw the error so the error message is preserved
    logger.error(`Action ${actionType} failed after ${RETRY_CONFIG.MAX_RETRIES} retries`, error)
    throw error // Throw error to preserve error message
  }
}

/**
 * Get current campaign budget from API
 * Note: This is a helper function to get current budget before modifying it
 */
async function getCurrentBudget(
  campaignId: string,
  tokoId: string
): Promise<number> {
  // Try to get budget from campaign data via homepage/query API
  // For now, we'll return 0 and let the API handle validation
  // In the future, we could fetch campaign details to get current budget
  return 0
}

/**
 * Execute add_budget action
 * Adds amount to current budget (supports both fixed amount and percentage)
 */
async function executeAddBudget(
  campaignId: string,
  tokoId: string,
  amount: string | undefined,
  currentBudget: number | undefined,
  percentage: string | undefined,
  adjustmentType?: 'amount' | 'percentage'
): Promise<void> {
  // Get current budget if not provided
  // IMPORTANT: currentBudget should always be provided from campaignDataMap
  // If it's 0, it means the campaign actually has 0 budget (not missing data)
  let currentBudgetValue = currentBudget !== undefined ? currentBudget : 0

  // Log warning if currentBudget is not provided (should not happen in normal flow)
  if (currentBudget === undefined) {
    logger.warn(`Current budget not provided for campaign ${campaignId}, using 0 as fallback. This may cause incorrect budget calculation.`)
  }

  let amountValue: number

  // Handle percentage or fixed amount
  if (adjustmentType === 'percentage' && percentage) {
    // Calculate percentage from current budget
    const percentageValue = parseFloat(percentage)
    if (isNaN(percentageValue) || percentageValue <= 0 || percentageValue > 100) {
      throw new Error(`Invalid percentage value: ${percentage}. Must be between 0 and 100.`)
    }
    // Calculate amount as percentage of current budget
    // currentBudgetValue is in actual value (e.g., 25000000 for Rp25.000)
    amountValue = (currentBudgetValue * percentageValue) / 100
    logger.info(`Calculating percentage: ${currentBudgetValue} * ${percentageValue}% = ${amountValue}`)
  } else if (amount) {
    // Convert amount to number (amount is in thousands, need to convert to actual value)
    // Amount format: "50000" means Rp50.000, need to convert to 5000000 (50 * 100000)
    amountValue = parseFloat(amount) * 100000
  } else {
    throw new Error(`Either amount or percentage must be provided for add_budget action`)
  }

  // Calculate new budget
  const newBudget = currentBudgetValue + amountValue

  // Round to avoid decimals (Shopee doesn't accept decimal values)
  const roundedBudget = Math.round(newBudget)

  const result = await manageShopeeAds(tokoId, 'edit_budget', campaignId, { new_budget: roundedBudget })

  if (!result.success) {
    logger.error(`Add budget failed for campaign ${campaignId}: ${result.message}. Current budget: ${currentBudgetValue}, Amount: ${amountValue}, New budget: ${roundedBudget}`)
    throw new Error(result.message)
  }

  const adjustmentTypeStr = adjustmentType === 'percentage' ? `${percentage}%` : `Rp${parseFloat(amount || '0')}`
  logger.info(`Add budget successful for campaign ${campaignId}: ${currentBudgetValue} + ${adjustmentTypeStr} (${amountValue}) = ${roundedBudget}`)
}

/**
 * Execute reduce_budget action
 * Reduces amount from current budget (supports both fixed amount and percentage)
 */
async function executeReduceBudget(
  campaignId: string,
  tokoId: string,
  amount: string | undefined,
  currentBudget: number | undefined,
  percentage: string | undefined,
  adjustmentType?: 'amount' | 'percentage'
): Promise<void> {
  // Get current budget if not provided
  // IMPORTANT: currentBudget should always be provided from campaignDataMap
  // If it's 0, it means the campaign actually has 0 budget (not missing data)
  let currentBudgetValue = currentBudget !== undefined ? currentBudget : 0

  // Log warning if currentBudget is not provided (should not happen in normal flow)
  if (currentBudget === undefined) {
    logger.warn(`Current budget not provided for campaign ${campaignId}, using 0 as fallback. This may cause incorrect budget calculation.`)
  }

  let amountValue: number

  // Handle percentage or fixed amount
  if (adjustmentType === 'percentage' && percentage) {
    // Calculate percentage from current budget
    const percentageValue = parseFloat(percentage)
    if (isNaN(percentageValue) || percentageValue <= 0 || percentageValue > 100) {
      throw new Error(`Invalid percentage value: ${percentage}. Must be between 0 and 100.`)
    }
    // Calculate amount as percentage of current budget
    // currentBudgetValue is in actual value (e.g., 25000000 for Rp25.000)
    amountValue = (currentBudgetValue * percentageValue) / 100
    logger.info(`Calculating percentage: ${currentBudgetValue} * ${percentageValue}% = ${amountValue}`)
  } else if (amount) {
    // Convert amount to number (amount is in thousands, need to convert to actual value)
    amountValue = parseFloat(amount) * 100000
  } else {
    throw new Error(`Either amount or percentage must be provided for reduce_budget action`)
  }

  // Calculate new budget (ensure it doesn't go below 0)
  const newBudget = Math.max(0, currentBudgetValue - amountValue)

  // Round to avoid decimals (Shopee doesn't accept decimal values)
  const roundedBudget = Math.round(newBudget)

  const result = await manageShopeeAds(tokoId, 'edit_budget', campaignId, { new_budget: roundedBudget })

  if (!result.success) {
    logger.error(`Reduce budget failed for campaign ${campaignId}: ${result.message}. Current budget: ${currentBudgetValue}, Amount: ${amountValue}, New budget: ${roundedBudget}`)
    throw new Error(result.message)
  }

  const adjustmentTypeStr = adjustmentType === 'percentage' ? `${percentage}%` : `Rp${parseFloat(amount || '0')}`
  logger.info(`Reduce budget successful for campaign ${campaignId}: ${currentBudgetValue} - ${adjustmentTypeStr} (${amountValue}) = ${roundedBudget}`)
}

/**
 * Execute set_budget action
 * Sets budget to specific amount
 */
async function executeSetBudget(
  campaignId: string,
  tokoId: string,
  amount: string
): Promise<void> {
  // Convert amount to number (amount is in thousands, need to convert to actual value)
  // Amount format: "50000" means Rp50.000, need to convert to 5000000 (50 * 100000)
  const amountValue = parseFloat(amount) * 100000

  // Round to avoid decimals (Shopee doesn't accept decimal values)
  const roundedBudget = Math.round(amountValue)

  const result = await manageShopeeAds(tokoId, 'edit_budget', campaignId, { new_budget: roundedBudget })

  if (!result.success) {
    throw new Error(result.message || 'Set budget failed')
  }
}

/**
 * Execute start_campaign action (resume paused campaign)
 */
async function executeStartCampaign(
  campaignId: string,
  tokoId: string
): Promise<void> {
  const result = await manageShopeeAds(tokoId, 'resume', campaignId)

  if (!result.success) {
    logger.error(`Start campaign failed for campaign ${campaignId}: ${result.message}`)
    throw new Error(result.message)
  }

  logger.info(`Start campaign successful for campaign ${campaignId}`)
}

/**
 * Execute pause_campaign action
 */
async function executePauseCampaign(
  campaignId: string,
  tokoId: string
): Promise<void> {
  const result = await manageShopeeAds(tokoId, 'pause', campaignId)

  if (!result.success) {
    logger.error(`Pause campaign failed for campaign ${campaignId}: ${result.message}`)
    throw new Error(result.message)
  }

  logger.info(`Pause campaign successful for campaign ${campaignId}`)
}

/**
 * Execute mass actions using mass_edit API (optimized for multiple campaigns)
 * Groups campaigns by action type and executes in bulk
 * 
 * @param actions - Array of actions to execute
 * @param campaignIds - Array of campaign IDs that meet conditions
 * @param tokoId - Toko ID (used to get cookies from database)
 * @param campaignDataMap - Map of campaign data (to get currentBudget for add/reduce budget)
 * @returns Array of execution results per campaign
 */
export async function executeMassActions(
  actions: Action[],
  campaignIds: string[],
  tokoId: string,
  campaignDataMap?: Map<string, any>
): Promise<Array<{ campaignId: string; success: boolean; error?: string }>> {
  const results: Array<{ campaignId: string; success: boolean; error?: string }> = []

  // New strategy:
  // - Tidak lagi menggunakan mass_edit Shopee untuk banyak campaign sekaligus
  // - Semua eksekusi dilakukan per-campaign, berurutan (antrian)
  // - Untuk aksi budget, currentBudget diambil dari campaignDataMap (jika tersedia)
  // - Menambahkan jeda acak (20-40 detik) antar campaign untuk menghindari deteksi spam

  for (let i = 0; i < campaignIds.length; i++) {
    const campaignId = campaignIds[i]

    // Tambahkan jeda jika ini bukan campaign pertama dalam antrean
    if (i > 0) {
      const waitTime = getRandomDelay(20000, 40000) // 20-40 detik dalam ms
      logger.info(`[Anti-Spam] Menunggu ${waitTime / 1000} detik sebelum memproses campaign berikutnya (${i + 1}/${campaignIds.length})...`)
      await sleep(waitTime)
    }

    const campaignData = campaignDataMap?.get(campaignId)
    const currentBudget = campaignData?.daily_budget || 0

    try {
      const actionResults = await executeActions(actions, campaignId, tokoId, currentBudget)
      const allSuccess = actionResults.every(r => r.success)
      const failedAction = actionResults.find(r => !r.success)

      results.push({
        campaignId,
        success: allSuccess,
        error: allSuccess ? undefined : failedAction?.error || 'Action execution failed'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Error executing actions for campaign ${campaignId}`, error)

      results.push({
        campaignId,
        success: false,
        error: errorMessage
      })
    }
  }

  return results
}

/**
 * Execute mass pause/resume using mass_edit API
 */
async function executeMassPauseResume(
  campaignIds: string[],
  tokoId: string,
  type: 'pause' | 'resume'
): Promise<void> {
  if (campaignIds.length === 0) {
    return
  }

  for (let i = 0; i < campaignIds.length; i++) {
    const campaignId = campaignIds[i]

    // Anti-spam delay
    if (i > 0) {
      const waitTime = getRandomDelay(5000, 10000) // 5-10s delay for mass actions
      await sleep(waitTime)
    }

    const action: 'pause' | 'resume' = type
    const result = await manageShopeeAds(tokoId, action, campaignId)

    if (!result.success) {
      logger.error(`Mass ${type} failed for campaign ${campaignId}: ${result.message}`)
      // Continue with others even if one fails
    }
  }

  logger.info(`Mass ${type} processing completed for ${campaignIds.length} campaigns`)
}

/**
 * Execute mass set_budget using mass_edit API
 * Payload format: {"campaign_id_list":[...], "type":"change_budget", "change_budget":{"daily_budget":...}}
 */
async function executeMassSetBudget(
  campaignIds: string[],
  tokoId: string,
  amount: string
): Promise<void> {
  if (campaignIds.length === 0) {
    return
  }

  // Convert amount to number (amount is in thousands, need to convert to actual value)
  const amountValue = parseFloat(amount) * 100000
  const roundedBudget = Math.round(amountValue)

  for (let i = 0; i < campaignIds.length; i++) {
    const campaignId = campaignIds[i]

    // Anti-spam delay
    if (i > 0) {
      const waitTime = getRandomDelay(5000, 10000) // 5-10s delay
      await sleep(waitTime)
    }

    const result = await manageShopeeAds(tokoId, 'edit_budget', campaignId, { new_budget: roundedBudget })

    if (!result.success) {
      logger.error(`Mass set_budget failed for campaign ${campaignId}: ${result.message}`)
    }
  }

  logger.info(`Mass set_budget processing completed for ${campaignIds.length} campaigns: ${roundedBudget}`)
}

/**
 * Execute actions for a campaign
 * 
 * @param actions - Array of actions to execute
 * @param campaignId - Campaign ID
 * @param tokoId - Toko ID (used to get cookies from database)
 * @param currentBudget - Current budget (optional, for add/reduce budget actions)
 * @returns Array of execution results
 */
export async function executeActions(
  actions: Action[],
  campaignId: string,
  tokoId: string,
  currentBudget?: number
): Promise<Array<{ action: Action; success: boolean; error?: string }>> {
  const results: Array<{ action: Action; success: boolean; error?: string }> = []

  for (const action of actions) {
    try {
      // Log action details for debugging (especially percentage)
      if (action.type === 'add_budget' || action.type === 'reduce_budget') {
        if (action.adjustmentType === 'percentage' && action.percentage) {
          logger.info(
            `Executing ${action.type} action for campaign ${campaignId}: ` +
            `percentage=${action.percentage}%, currentBudget=${currentBudget || 0}`
          )
        } else if (action.amount) {
          logger.info(
            `Executing ${action.type} action for campaign ${campaignId}: ` +
            `amount=${action.amount}, currentBudget=${currentBudget || 0}`
          )
        }
      }

      let success = false

      switch (action.type) {
        case 'add_budget':
        case 'increase_budget':
          // Add/increase budget: add amount to current budget (supports percentage)
          success = await executeWithRetry(
            () => executeAddBudget(
              campaignId,
              tokoId,
              action.amount,
              currentBudget,
              action.percentage,
              action.adjustmentType
            ),
            action.type
          )
          break

        case 'reduce_budget':
        case 'decrease_budget':
          // Reduce/decrease budget: subtract amount from current budget (supports percentage)
          success = await executeWithRetry(
            () => executeReduceBudget(
              campaignId,
              tokoId,
              action.amount,
              currentBudget,
              action.percentage,
              action.adjustmentType
            ),
            action.type
          )
          break

        case 'set_budget':
          // Set budget: set budget to specific amount
          success = await executeWithRetry(
            () => executeSetBudget(campaignId, tokoId, action.amount || '0'),
            'set_budget'
          )
          break

        case 'start_campaign':
        case 'start':
        case 'resume':
          // Start/resume campaign: resume paused campaign
          success = await executeWithRetry(
            () => executeStartCampaign(campaignId, tokoId),
            'start_campaign'
          )
          break

        case 'pause_campaign':
        case 'pause':
          // Pause campaign: pause active campaign
          success = await executeWithRetry(
            () => executePauseCampaign(campaignId, tokoId),
            'pause_campaign'
          )
          break

        case 'telegram_notification':
        case 'notify':
          // Telegram notification is handled separately in rule-executor
          success = true
          break

        default:
          logger.warn(`Unknown action type: ${action.type}. Supported types: add_budget, reduce_budget, set_budget, start_campaign, pause_campaign, telegram_notification`)
          success = false
      }

      // Get detailed error message if available
      let errorMessage: string | undefined = undefined
      if (!success) {
        // Try to get error from the catch block
        // Note: executeWithRetry doesn't return error details, so we need to catch it
        errorMessage = 'Aksi gagal dieksekusi'
      }

      results.push({
        action,
        success,
        error: errorMessage,
      })

      if (success) {
        logger.info(`Action ${action.type} executed successfully for campaign ${campaignId}`)
      }
    } catch (error) {
      // Capture detailed error message from endpoint response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Error executing action ${action.type} for campaign ${campaignId}: ${errorMessage}`, error)
      results.push({
        action,
        success: false,
        error: errorMessage, // This will contain the error message from the endpoint response
      })
    }
  }

  return results
}

