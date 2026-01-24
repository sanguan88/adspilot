/**
 * Rule Executor
 * 
 * Execute a single automation rule
 */

import { getDatabaseConnection } from '@/lib/db'
import { ScheduledRule } from './scheduler'
import { fetchCampaignData, fetchAllCampaignsData } from './shopee-api-client'
import { evaluateConditions } from './condition-evaluator'
import { executeActions } from './action-executor'
import { sendRuleNotification } from '@/tele/service'
import { logger } from './logger'
import { MAX_CONCURRENT_CAMPAIGNS } from './config'

/**
 * Save execution log per campaign to database
 * Stores error message detail from Shopee API
 */
async function saveExecutionLog(
  ruleId: string,
  campaignId: string,
  tokoId: string,
  actionType: string,
  status: 'success' | 'failed' | 'skipped',
  errorMessage?: string,
  executionData?: any
): Promise<void> {
  const connection = await getDatabaseConnection()
  
  try {
    await connection.query(
      `INSERT INTO rule_execution_logs 
       (rule_id, campaign_id, toko_id, action_type, status, error_message, execution_data, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        ruleId,
        campaignId,
        tokoId,
        actionType,
        status,
        errorMessage || null,
        executionData ? JSON.stringify(executionData) : null
      ]
    )
  } catch (error) {
    // Log error but don't throw - we don't want to break rule execution if logging fails
    logger.error(`Failed to save execution log for campaign ${campaignId}`, error)
  } finally {
    connection.release()
  }
}

/**
 * Get chat ID for Telegram notification
 */
async function getTelegramChatId(userId: string): Promise<string | null> {
  const connection = await getDatabaseConnection()

  try {
    const result = await connection.query(
      `SELECT chatid_tele FROM data_user WHERE user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0 || !result.rows[0].chatid_tele) {
      return null
    }

    return result.rows[0].chatid_tele
  } finally {
    connection.release()
  }
}

/**
 * Update rule statistics
 */
async function updateRuleStatistics(
  ruleId: string,
  success: boolean
): Promise<void> {
  const connection = await getDatabaseConnection()

  try {
    if (success) {
      // Increment triggers and success_count
      await connection.query(
        `UPDATE data_rules 
         SET triggers = COALESCE(triggers, 0) + 1,
             success_count = COALESCE(success_count, 0) + 1,
             success_rate = CASE 
               WHEN COALESCE(triggers, 0) + 1 > 0 
               THEN ROUND((COALESCE(success_count, 0) + 1)::numeric / (COALESCE(triggers, 0) + 1)::numeric * 100, 2)
               ELSE 0
             END,
             update_at = NOW()
         WHERE rule_id = $1`,
        [ruleId]
      )
    } else {
      // Increment triggers and error_count
      await connection.query(
        `UPDATE data_rules 
         SET triggers = COALESCE(triggers, 0) + 1,
             error_count = COALESCE(error_count, 0) + 1,
             success_rate = CASE 
               WHEN COALESCE(triggers, 0) + 1 > 0 
               THEN ROUND(COALESCE(success_count, 0)::numeric / (COALESCE(triggers, 0) + 1)::numeric * 100, 2)
               ELSE 0
             END,
             update_at = NOW()
         WHERE rule_id = $1`,
        [ruleId]
      )
    }
  } finally {
    connection.release()
  }
}

/**
 * Process campaigns for a toko with concurrency limit
 */
async function processCampaignsForToko(
  rule: ScheduledRule,
  tokoId: string,
  campaignIds: string[]
): Promise<{ success: boolean; executed: number; errors: number }> {
  let executed = 0
  let errors = 0

  try {
    logger.info(
      `[Rule: ${rule.name} (${rule.rule_id})] Processing ${campaignIds.length} campaigns for toko ${tokoId}. ` +
      `Actions: ${rule.actions.map((a: any) => a.type).join(', ')}. ` +
      `Telegram notification: ${rule.telegram_notification ? 'enabled' : 'disabled'}`
    )

    // Get cookies for toko
    const { getCookiesForToko } = await import('./shopee-api-client')
    const cookies = await getCookiesForToko(tokoId)
    if (!cookies) {
      logger.warn(`[Rule: ${rule.name}] No cookies available for toko ${tokoId}`)
      return { success: false, executed: 0, errors: campaignIds.length }
    }

    // Fetch all campaigns data for this toko in one API call
    const allCampaignsData = await fetchAllCampaignsData(tokoId, cookies)
    
    if (allCampaignsData.size === 0) {
      logger.warn(`[Rule: ${rule.name}] No campaigns data found for toko ${tokoId}`)
      return { success: false, executed: 0, errors: campaignIds.length }
    }

    logger.info(
      `[Rule: ${rule.name}] Fetched ${allCampaignsData.size} campaigns from API for toko ${tokoId}. ` +
      `Requested campaigns: ${campaignIds.join(', ')}`
    )

    // Filter campaigns that match campaign_assignments
    const matchingCampaigns = campaignIds.filter(campaignId => 
      allCampaignsData.has(campaignId)
    )

    if (matchingCampaigns.length === 0) {
      logger.warn(
        `[Rule: ${rule.name}] No matching campaigns found in API response for toko ${tokoId}. ` +
        `Requested: ${campaignIds.join(', ')}, ` +
        `Found in API: ${Array.from(allCampaignsData.keys()).join(', ')}`
      )
      return { success: false, executed: 0, errors: campaignIds.length }
    }

    logger.info(
      `[Rule: ${rule.name}] Found ${matchingCampaigns.length} matching campaigns: ${matchingCampaigns.join(', ')}`
    )

    // Log conditions
    const conditionsStr = rule.conditions.map((g: any) => 
      `(${g.conditions.map((c: any) => `${c.metric} ${c.operator} ${c.value}`).join(' AND ')})`
    ).join(' OR ')
    logger.info(`[Rule: ${rule.name}] Conditions: ${conditionsStr}`)

    // Step 1: Evaluate conditions for all campaigns
    const campaignsToExecute: string[] = []
    const campaignDataMap = new Map<string, any>()

    for (const campaignId of matchingCampaigns) {
      const campaignData = allCampaignsData.get(campaignId)
      if (!campaignData) {
        logger.warn(`[Rule: ${rule.name}] Campaign data not found for campaign ${campaignId}`)
        errors++
        continue
      }

      // Log campaign data (especially saldo and other key metrics)
      const keyMetrics = {
        saldo: campaignData.saldo,
        daily_budget: campaignData.daily_budget,
        cost: campaignData.cost,
        click: campaignData.click,
        impression: campaignData.impression,
        ctr: campaignData.ctr,
        cpc: campaignData.cpc,
        roi: campaignData.broad_roi
      }
      logger.info(
        `[Rule: ${rule.name}] Campaign ${campaignId} data: ` +
        Object.entries(keyMetrics)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      )

      // Evaluate conditions
      const conditionsMet = evaluateConditions(rule.conditions, campaignData)
      if (conditionsMet) {
        logger.info(
          `[Rule: ${rule.name}] ✅ Conditions MET for campaign ${campaignId}. ` +
          `Will execute actions: ${rule.actions.map((a: any) => a.type).join(', ')}`
        )
        campaignsToExecute.push(campaignId)
        campaignDataMap.set(campaignId, campaignData)
      } else {
        logger.info(
          `[Rule: ${rule.name}] ❌ Conditions NOT MET for campaign ${campaignId}. ` +
          `Skipping execution.`
        )
        // Save skipped log
        const actionType = rule.actions.length > 0 ? rule.actions[0].type : 'unknown'
        await saveExecutionLog(
          rule.rule_id,
          campaignId,
          tokoId,
          actionType,
          'skipped',
          'Kondisi tidak terpenuhi',
          {
            daily_budget: campaignData?.daily_budget,
            action_type: actionType
          }
        )
      }
    }

    if (campaignsToExecute.length === 0) {
      logger.info(
        `[Rule: ${rule.name}] No campaigns met conditions for toko ${tokoId}. ` +
        `Evaluated ${matchingCampaigns.length} campaigns.`
      )
      return { success: false, executed: 0, errors: campaignIds.length - matchingCampaigns.length }
    }

    logger.info(
      `[Rule: ${rule.name}] Found ${campaignsToExecute.length} campaigns that meet conditions: ${campaignsToExecute.join(', ')}`
    )

    // Check if rule has only telegram_notification actions (no Shopee API actions)
    const hasOnlyTelegramNotification = rule.actions.every((a: any) => 
      a.type === 'telegram_notification' || a.type === 'notify'
    )

    logger.info(
      `[Rule: ${rule.name}] Executing ${rule.actions.length} actions: ${rule.actions.map((a: any) => 
        `${a.type}${a.amount ? ` (${a.amount})` : ''}${a.message ? ` - "${a.message}"` : ''}`
      ).join(', ')}`
    )

    // Step 2: Execute actions in bulk using mass_edit API
    // Pass campaign data map so we can access currentBudget for add/reduce budget actions
    // IMPORTANT: allCampaignsData contains daily_budget which is used as currentBudget
    const { executeMassActions } = await import('./action-executor')
    
    // Log campaign data before execution for debugging
    logger.info(
      `[Rule: ${rule.name}] Executing actions for ${campaignsToExecute.length} campaigns. ` +
      `Campaign budgets: ${campaignsToExecute.map(id => {
        const data = allCampaignsData.get(id)
        return `${id}=Rp${(data?.daily_budget || 0).toLocaleString('id-ID')}`
      }).join(', ')}`
    )
    
    const actionResults = await executeMassActions(
      rule.actions,
      campaignsToExecute,
      tokoId,
      allCampaignsData
    )

    // Save execution logs to database with error details
    for (const result of actionResults) {
      const campaignData = allCampaignsData.get(result.campaignId)
      const actionType = rule.actions.length > 0 ? rule.actions[0].type : 'unknown'
      
      if (result.success) {
        await saveExecutionLog(
          rule.rule_id,
          result.campaignId,
          tokoId,
          actionType,
          'success',
          undefined,
          {
            daily_budget: campaignData?.daily_budget,
            action_type: actionType
          }
        )
      } else {
        // Save error detail from Shopee API
        await saveExecutionLog(
          rule.rule_id,
          result.campaignId,
          tokoId,
          actionType,
          'failed',
          result.error || 'Unknown error',
          {
            daily_budget: campaignData?.daily_budget,
            action_type: actionType,
            error: result.error
          }
        )
      }
    }

    // Count successful executions
    const successfulCampaigns = actionResults.filter(r => r.success).length
    const failedCampaigns = actionResults.filter(r => !r.success)
    
    if (failedCampaigns.length > 0) {
      logger.warn(
        `[Rule: ${rule.name}] Failed actions for campaigns: ` +
        failedCampaigns.map(r => `${r.campaignId} (${r.error || 'unknown error'})`).join(', ')
      )
    }
    
    // If only telegram_notification actions, consider it successful when conditions are met
    if (hasOnlyTelegramNotification && campaignsToExecute.length > 0) {
      executed = campaignsToExecute.length
      errors = 0
      logger.info(
        `[Rule: ${rule.name}] Only Telegram notification actions. ` +
        `Marking ${executed} campaigns as executed (conditions met).`
      )
    } else {
      executed = successfulCampaigns
      errors = campaignsToExecute.length - successfulCampaigns
      logger.info(
        `[Rule: ${rule.name}] Action execution results: ${successfulCampaigns} successful, ${errors} failed`
      )
    }

    // Send Telegram notification if enabled and conditions are met
    // Send notification if:
    // 1. rule.telegram_notification is enabled AND
    // 2. (conditions are met for at least one campaign OR there are successful executions)
    const shouldSendNotification = rule.telegram_notification && 
      (campaignsToExecute.length > 0 || successfulCampaigns > 0)
    
    if (shouldSendNotification) {
      logger.info(`[Rule: ${rule.name}] Preparing to send Telegram notification...`)
      const chatId = await getTelegramChatId(rule.user_id)
      if (chatId) {
        // Find telegram_notification action for custom message
        const telegramAction = rule.actions.find((a: any) => a.type === 'telegram_notification')
        
        try {
          await sendRuleNotification(chatId, {
            ruleName: rule.name,
            ruleId: rule.rule_id,
            triggeredAt: new Date(),
            conditions: rule.conditions.map((g: any) => 
              g.conditions.map((c: any) => `${c.metric} ${c.operator} ${c.value}`).join(' AND ')
            ),
            actions: rule.actions.map((a: any) => a.label || a.type),
            message: telegramAction?.message,
          })
          logger.info(
            `[Rule: ${rule.name}] ✅ Telegram notification sent successfully to chat ${chatId}. ` +
            `Message: ${telegramAction?.message || 'default notification'}`
          )
        } catch (error) {
          logger.error(
            `[Rule: ${rule.name}] ❌ Failed to send Telegram notification to chat ${chatId}`,
            error
          )
        }
      } else {
        logger.warn(
          `[Rule: ${rule.name}] ⚠️ No Telegram chat ID found for user ${rule.user_id}, notification not sent`
        )
      }
    } else {
      logger.debug(
        `[Rule: ${rule.name}] Telegram notification skipped. ` +
        `Enabled: ${rule.telegram_notification}, ` +
        `Campaigns with conditions met: ${campaignsToExecute.length}, ` +
        `Successful executions: ${successfulCampaigns}`
      )
    }

    // Count campaigns that were not found in API response as errors
    const notFoundCampaigns = campaignIds.filter(id => !allCampaignsData.has(id))
    errors += notFoundCampaigns.length

    logger.info(
      `[Rule: ${rule.name}] Completed processing toko ${tokoId}. ` +
      `Result: ${executed} executed, ${errors} errors`
    )
    return { success: executed > 0, executed, errors }
  } catch (error) {
    logger.error(
      `[Rule: ${rule.name}] ❌ Error processing campaigns for toko ${tokoId}`,
      error
    )
    return { success: false, executed: 0, errors: campaignIds.length }
  }
}

/**
 * Execute a single automation rule
 */
export async function executeRule(rule: ScheduledRule): Promise<boolean> {
  logger.info(
    `[Rule: ${rule.name} (${rule.rule_id})] 🚀 Starting execution. ` +
    `Mode: ${rule.execution_mode}, ` +
    `Tokos: ${Object.keys(rule.campaign_assignments).length}, ` +
    `Total campaigns: ${Object.values(rule.campaign_assignments).flat().length}`
  )

  let totalExecuted = 0
  let totalErrors = 0

  try {
    // Process each toko
    for (const [tokoId, campaignIds] of Object.entries(rule.campaign_assignments)) {
      if (!campaignIds || campaignIds.length === 0) {
        logger.warn(
          `[Rule: ${rule.name}] Skipping toko ${tokoId} - no campaigns assigned`
        )
        continue
      }

      const result = await processCampaignsForToko(rule, tokoId, campaignIds)
      totalExecuted += result.executed
      totalErrors += result.errors
    }

    // Update statistics
    const overallSuccess = totalExecuted > 0
    await updateRuleStatistics(rule.rule_id, overallSuccess)

    logger.info(
      `[Rule: ${rule.name} (${rule.rule_id})] ✅ Execution completed. ` +
      `Total: ${totalExecuted} executed, ${totalErrors} errors. ` +
      `Success: ${overallSuccess ? 'YES' : 'NO'}`
    )

    return overallSuccess
  } catch (error) {
    logger.error(
      `[Rule: ${rule.name} (${rule.rule_id})] ❌ Error during execution`,
      error
    )
    await updateRuleStatistics(rule.rule_id, false)
    return false
  }
}

