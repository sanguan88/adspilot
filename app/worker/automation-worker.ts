/**
 * Automation Worker
 * 
 * Main worker service that executes automation rules periodically
 */

import { WORKER_CHECK_INTERVAL } from './config'
import { logger } from './logger'
import { getScheduledRules } from './scheduler'
import { executeRule } from './rule-executor'

import { checkExpiringSubscriptions } from './subscription-monitor'

let isRunning = false
let workerInterval: NodeJS.Timeout | null = null
let lastDailyCheck: Date | null = null

/**
 * Execute all scheduled rules
 */
async function executeScheduledRules(): Promise<void> {
  if (isRunning) {
    logger.warn('Previous execution still running, skipping this cycle')
    return
  }

  isRunning = true
  const startTime = Date.now()

  try {
    logger.info('Starting rule execution cycle')

    // Daily Subscription Check (runs once a day after 09:00)
    const now = new Date()
    if (now.getHours() >= 9) {
      const todayStr = now.toDateString()
      const lastCheckStr = lastDailyCheck?.toDateString()

      if (todayStr !== lastCheckStr) {
        logger.info('Running daily subscription check...')
        try {
          await checkExpiringSubscriptions()
          lastDailyCheck = now
        } catch (error) {
          logger.error('Error running daily subscription check', error)
        }
      }
    }

    // Get scheduled rules
    const rules = await getScheduledRules()

    if (rules.length === 0) {
      logger.info('No rules to execute')
      isRunning = false // Release lock if no rules
      return
    }

    // In-memory tracking to prevent the same rule from running multiple times concurrently
    // even if the cycle repeats every minute.
    if (!(global as any).activeExecutions) {
      (global as any).activeExecutions = new Set<string>()
    }
    const activeExecutions = (global as any).activeExecutions as Set<string>

    // Decoupled Execution (Fire and Forget)
    // We don't await Promise.all(rulePromises) because long-running tasks (delay anti-spam)
    // shouldn't block the next check cycle (1 minute interval).
    rules.forEach((rule) => {
      // Check if this specific rule is already running
      if (activeExecutions.has(rule.rule_id)) {
        logger.warn(`Rule ${rule.rule_id} (${rule.name}) is still running from previous cycle, skipping`)
        return
      }

      // Start execution in background (Decoupled)
      activeExecutions.add(rule.rule_id)

      executeRule(rule)
        .catch((error) => {
          logger.error(`Error executing rule ${rule.rule_id}`, error)
        })
        .finally(() => {
          // Rule finished, remove from active set
          activeExecutions.delete(rule.rule_id)
          logger.info(`Rule ${rule.rule_id} (${rule.name}) background execution finished`)
        })
    })

    const duration = Date.now() - startTime
    logger.info(`Rule execution start-trigger cycle completed in ${duration}ms. Active rules decoupled.`)
  } catch (error) {
    logger.error('Error in rule execution cycle', error)
  } finally {
    // isRunning lock is only for the "Scheduler/Trigger" logic
    // which completes instantly after firing rules into background.
    isRunning = false
  }
}

/**
 * Start the automation worker
 */
export function startWorker(): void {
  if (workerInterval) {
    logger.warn('Worker is already running')
    return
  }

  logger.info('Starting automation worker')
  logger.info(`Check interval: ${WORKER_CHECK_INTERVAL / 1000} seconds`)

  // Execute immediately on start
  executeScheduledRules()

  // Then execute on interval
  workerInterval = setInterval(() => {
    executeScheduledRules()
  }, WORKER_CHECK_INTERVAL)

  logger.info('Automation worker started')
}

/**
 * Stop the automation worker
 */
export function stopWorker(): void {
  if (!workerInterval) {
    logger.warn('Worker is not running')
    return
  }

  logger.info('Stopping automation worker')

  if (workerInterval) {
    clearInterval(workerInterval)
    workerInterval = null
  }

  logger.info('Automation worker stopped')
}

/**
 * Restart the automation worker
 */
export function restartWorker(): void {
  logger.info('Restarting automation worker')
  stopWorker()
  // Wait a bit before restarting
  setTimeout(() => {
    startWorker()
  }, 1000)
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  stopWorker()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  stopWorker()
  process.exit(0)
})

// Start worker if this file is run directly
if (require.main === module) {
  startWorker()
}

