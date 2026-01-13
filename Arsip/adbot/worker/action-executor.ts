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

interface Action {
  id: string
  type: string
  label?: string
  amount?: string
  message?: string
}

/**
 * Execute action with retry
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
    logger.error(`Action ${actionType} failed after ${RETRY_CONFIG.MAX_RETRIES} retries`, error)
    return false
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
 * Adds amount to current budget
 */
async function executeAddBudget(
  campaignId: string,
  tokoId: string,
  amount: string,
  currentBudget?: number
): Promise<void> {
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/campaigns/actions`
  
  // Convert amount to number (amount is in thousands, need to convert to actual value)
  // Amount format: "50000" means Rp50.000, need to convert to 5000000 (50 * 100000)
  const amountValue = parseFloat(amount) * 100000
  
  // Get current budget if not provided
  // IMPORTANT: currentBudget should always be provided from campaignDataMap
  // If it's 0, it means the campaign actually has 0 budget (not missing data)
  let currentBudgetValue = currentBudget !== undefined ? currentBudget : 0
  
  // Log warning if currentBudget is not provided (should not happen in normal flow)
  if (currentBudget === undefined) {
    logger.warn(`Current budget not provided for campaign ${campaignId}, using 0 as fallback. This may cause incorrect budget calculation.`)
  }
  
  // Calculate new budget
  const newBudget = currentBudgetValue + amountValue
  
  // Ensure budget is multiple of 500000 (Rp5.000)
  const roundedBudget = Math.round(newBudget / 500000) * 500000
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'edit_budget',
      campaign_id: campaignId,
      new_budget: roundedBudget,
      id_toko: tokoId,
      account_username: tokoId, // For backward compatibility
    }),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `Add budget failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch (e) {
      // If response is not JSON, use statusText
    }
    logger.error(`Add budget API error for campaign ${campaignId}: ${errorMessage}`)
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!result.success) {
    const errorMessage = result.error || result.message || 'Add budget failed'
    logger.error(`Add budget failed for campaign ${campaignId}: ${errorMessage}. Current budget: ${currentBudgetValue}, Amount: ${amountValue}, New budget: ${roundedBudget}`)
    throw new Error(errorMessage)
  }
  
  logger.info(`Add budget successful for campaign ${campaignId}: ${currentBudgetValue} + ${amountValue} = ${roundedBudget}`)
}

/**
 * Execute reduce_budget action
 * Reduces amount from current budget
 */
async function executeReduceBudget(
  campaignId: string,
  tokoId: string,
  amount: string,
  currentBudget?: number
): Promise<void> {
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/campaigns/actions`
  
  // Convert amount to number (amount is in thousands, need to convert to actual value)
  const amountValue = parseFloat(amount) * 100000
  
  // Get current budget if not provided
  // IMPORTANT: currentBudget should always be provided from campaignDataMap
  // If it's 0, it means the campaign actually has 0 budget (not missing data)
  let currentBudgetValue = currentBudget !== undefined ? currentBudget : 0
  
  // Log warning if currentBudget is not provided (should not happen in normal flow)
  if (currentBudget === undefined) {
    logger.warn(`Current budget not provided for campaign ${campaignId}, using 0 as fallback. This may cause incorrect budget calculation.`)
  }
  
  // Calculate new budget (ensure it doesn't go below 0)
  const newBudget = Math.max(0, currentBudgetValue - amountValue)
  
  // Ensure budget is multiple of 500000 (Rp5.000)
  const roundedBudget = Math.round(newBudget / 500000) * 500000
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'edit_budget',
      campaign_id: campaignId,
      new_budget: roundedBudget,
      id_toko: tokoId,
      account_username: tokoId, // For backward compatibility
    }),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `Reduce budget failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch (e) {
      // If response is not JSON, use statusText
    }
    logger.error(`Reduce budget API error for campaign ${campaignId}: ${errorMessage}`)
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!result.success) {
    const errorMessage = result.error || result.message || 'Reduce budget failed'
    logger.error(`Reduce budget failed for campaign ${campaignId}: ${errorMessage}. Current budget: ${currentBudgetValue}, Amount: ${amountValue}, New budget: ${roundedBudget}`)
    throw new Error(errorMessage)
  }
  
  logger.info(`Reduce budget successful for campaign ${campaignId}: ${currentBudgetValue} - ${amountValue} = ${roundedBudget}`)
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
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/campaigns/actions`
  
  // Convert amount to number (amount is in thousands, need to convert to actual value)
  // Amount format: "50000" means Rp50.000, need to convert to 5000000 (50 * 100000)
  const amountValue = parseFloat(amount) * 100000
  
  // Ensure budget is multiple of 500000 (Rp5.000)
  const roundedBudget = Math.round(amountValue / 500000) * 500000
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'edit_budget',
      campaign_id: campaignId,
      new_budget: roundedBudget,
      id_toko: tokoId,
      account_username: tokoId, // For backward compatibility
    }),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`Set budget failed: ${response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Set budget failed')
  }
}

/**
 * Execute start_campaign action (resume paused campaign)
 */
async function executeStartCampaign(
  campaignId: string,
  tokoId: string
): Promise<void> {
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/campaigns/actions`
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'resume',
      campaign_id: campaignId,
      id_toko: tokoId,
      account_username: tokoId, // For backward compatibility
    }),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `Start campaign failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch (e) {
      // If response is not JSON, use statusText
    }
    logger.error(`Start campaign API error for campaign ${campaignId}: ${errorMessage}`)
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!result.success) {
    const errorMessage = result.error || result.message || 'Start campaign failed'
    logger.error(`Start campaign failed for campaign ${campaignId}: ${errorMessage}`)
    throw new Error(errorMessage)
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
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/campaigns/actions`
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'pause',
      campaign_id: campaignId,
      id_toko: tokoId,
      account_username: tokoId, // For backward compatibility
    }),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `Pause campaign failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch (e) {
      // If response is not JSON, use statusText
    }
    logger.error(`Pause campaign API error for campaign ${campaignId}: ${errorMessage}`)
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!result.success) {
    const errorMessage = result.error || result.message || 'Pause campaign failed'
    logger.error(`Pause campaign failed for campaign ${campaignId}: ${errorMessage}`)
    throw new Error(errorMessage)
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

  for (const campaignId of campaignIds) {
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

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/campaigns/mass-actions`
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: type,
      campaign_id_list: campaignIds.map(id => parseInt(id, 10)),
      id_toko: tokoId,
      account_username: tokoId, // For backward compatibility
    }),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `Mass ${type} failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch (e) {
      // If response is not JSON, use statusText
    }
    logger.error(`Mass ${type} API error for campaigns ${campaignIds.join(', ')}: ${errorMessage}`)
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!result.success) {
    const errorMessage = result.error || result.message || `Mass ${type} failed`
    logger.error(`Mass ${type} failed for campaigns ${campaignIds.join(', ')}: ${errorMessage}`)
    throw new Error(errorMessage)
  }
  
  logger.info(`Mass ${type} successful for ${campaignIds.length} campaigns`)
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
  // Amount format: "30000" means Rp30.000, need to convert to 3000000000 (30000 * 100000)
  const amountValue = parseFloat(amount) * 100000
  
  // Ensure budget is multiple of 500000 (Rp5.000)
  const roundedBudget = Math.round(amountValue / 500000) * 500000

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/campaigns/mass-actions`
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'edit_budget',
      campaign_id_list: campaignIds.map(id => parseInt(id, 10)),
      new_budget: roundedBudget,
      id_toko: tokoId,
      account_username: tokoId, // For backward compatibility
    }),
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `Mass set_budget failed: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch (e) {
      // If response is not JSON, use statusText
    }
    logger.error(`Mass set_budget API error for campaigns ${campaignIds.join(', ')}: ${errorMessage}`)
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!result.success) {
    const errorMessage = result.error || result.message || 'Mass set_budget failed'
    logger.error(`Mass set_budget failed for campaigns ${campaignIds.join(', ')}: ${errorMessage}`)
    throw new Error(errorMessage)
  }
  
  logger.info(`Mass set_budget successful for ${campaignIds.length} campaigns: ${roundedBudget}`)
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
      let success = false

      switch (action.type) {
        case 'add_budget':
        case 'increase_budget':
          // Add/increase budget: add amount to current budget
          success = await executeWithRetry(
            () => executeAddBudget(campaignId, tokoId, action.amount || '0', currentBudget),
            action.type
          )
          break

        case 'reduce_budget':
        case 'decrease_budget':
          // Reduce/decrease budget: subtract amount from current budget
          success = await executeWithRetry(
            () => executeReduceBudget(campaignId, tokoId, action.amount || '0', currentBudget),
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
        // Try to get error from the last action result
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Error executing action ${action.type} for campaign ${campaignId}: ${errorMessage}`, error)
      results.push({
        action,
        success: false,
        error: errorMessage,
      })
    }
  }

  return results
}

