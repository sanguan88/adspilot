/**
 * Rule Scheduler
 * 
 * Filter dan schedule rules berdasarkan interval, times, dan days
 */

import { getDatabaseConnection } from '@/lib/db'
import { MISSED_SCHEDULE_TOLERANCE } from './config'
import { logger } from './logger'

export interface ScheduledRule {
  rule_id: string
  name: string
  user_id: string
  campaign_assignments: Record<string, string[]>
  conditions: any
  actions: any
  telegram_notification: boolean
  selected_interval: number | null
  selected_times: string[] | null
  selected_days: string[] | null
  selected_dates: string[] | null
  date_time_map: Record<string, string[]> | null
  execution_mode: string
  last_executed_at?: Date
}

/**
 * Check if current time matches selected times
 */
function isTimeMatch(selectedTimes: string[] | null, now: Date): boolean {
  if (!selectedTimes || selectedTimes.length === 0) {
    return true // No time restriction
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return selectedTimes.includes(currentTime)
}

/**
 * Check if current day matches selected days
 */
function isDayMatch(selectedDays: string[] | null, now: Date): boolean {
  if (!selectedDays || selectedDays.length === 0) {
    return true // No day restriction
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()].toLowerCase()
  return selectedDays.map(d => d.toLowerCase()).includes(currentDay)
}

/**
 * Check if interval-based rule should execute
 */
function shouldExecuteByInterval(
  selectedInterval: number | null,
  lastExecutedAt: Date | null,
  now: Date
): boolean {
  if (!selectedInterval) {
    return true // No interval restriction
  }

  if (!lastExecutedAt) {
    return true // Never executed, should execute
  }

  const timeSinceLastExecution = now.getTime() - lastExecutedAt.getTime()
  const intervalMs = selectedInterval * 1000 // Convert seconds to milliseconds

  // Execute if interval has passed
  return timeSinceLastExecution >= intervalMs
}

/**
 * Check if scheduled time was missed and should still execute
 */
function isMissedSchedule(
  selectedTimes: string[] | null,
  lastExecutedAt: Date | null,
  now: Date
): boolean {
  if (!selectedTimes || selectedTimes.length === 0) {
    return false // No time-based schedule
  }

  if (!lastExecutedAt) {
    return false // Never executed, not a missed schedule
  }

  // Check each selected time
  for (const timeStr of selectedTimes) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const scheduledTime = new Date(now)
    scheduledTime.setHours(hours, minutes, 0, 0)

    // If scheduled time is in the past but within tolerance
    if (scheduledTime < now && scheduledTime > lastExecutedAt) {
      const timeSinceScheduled = now.getTime() - scheduledTime.getTime()
      if (timeSinceScheduled <= MISSED_SCHEDULE_TOLERANCE) {
        return true
      }
    }
  }

  return false
}

/**
 * Get active rules that should be executed now
 */
export async function getScheduledRules(): Promise<ScheduledRule[]> {
  const connection = await getDatabaseConnection()

  try {
    const now = new Date()
    
    // Get all active rules
    // Include all execution modes: 'continuous', 'specific', 'interval'
    // - 'continuous' = run continuously (24/7), respect interval if set
    // - 'specific' = run on specific times and days
    // - 'interval' = run based on interval
    const result = await connection.query(
      `SELECT 
        rule_id, name, user_id, campaign_assignments, conditions, actions,
        telegram_notification, selected_interval, selected_times, selected_days,
        selected_dates, date_time_map,
        execution_mode, update_at as last_executed_at
      FROM data_rules
      WHERE status = 'active'
        AND execution_mode IN ('continuous', 'specific', 'interval', 'auto')
      ORDER BY priority DESC, created_at ASC`
    )

    const scheduledRules: ScheduledRule[] = []

    for (const rule of result.rows) {
      // Parse JSONB fields
      const campaignAssignments = typeof rule.campaign_assignments === 'string'
        ? JSON.parse(rule.campaign_assignments)
        : rule.campaign_assignments || {}
      
      const conditions = typeof rule.conditions === 'string'
        ? JSON.parse(rule.conditions)
        : rule.conditions
      
      const actions = typeof rule.actions === 'string'
        ? JSON.parse(rule.actions)
        : rule.actions
      
      const selectedTimes = typeof rule.selected_times === 'string'
        ? JSON.parse(rule.selected_times)
        : rule.selected_times
      
      const selectedDays = typeof rule.selected_days === 'string'
        ? JSON.parse(rule.selected_days)
        : rule.selected_days

      const selectedDates = typeof rule.selected_dates === 'string'
        ? JSON.parse(rule.selected_dates)
        : rule.selected_dates || []

      const dateTimeMap = typeof rule.date_time_map === 'string'
        ? JSON.parse(rule.date_time_map)
        : rule.date_time_map || {}

      const lastExecutedAt = rule.last_executed_at ? new Date(rule.last_executed_at) : null

      // Check if rule should execute based on execution mode
      let shouldExecute = false
      
      if (rule.execution_mode === 'continuous') {
        // Continuous mode: execute every cycle, but respect interval if set
        // If no interval is set, execute every cycle (every 1 minute)
        const intervalMatch = shouldExecuteByInterval(rule.selected_interval, lastExecutedAt, now)
        shouldExecute = intervalMatch
      } else if (rule.execution_mode === 'specific') {
        // Specific mode: execute on specific times and days, or on specific dates with times
        let timeMatch = isTimeMatch(selectedTimes, now)
        let dayMatch = isDayMatch(selectedDays, now)
        const missedSchedule = isMissedSchedule(selectedTimes, lastExecutedAt, now)

        // Check if rule has specific dates with times (date_time_map)
        let dateTimeMatch = false
        let dateTimeMissedSchedule = false
        if (selectedDates && selectedDates.length > 0 && dateTimeMap && Object.keys(dateTimeMap).length > 0) {
          const todayStr = now.toISOString().split('T')[0] // Format: YYYY-MM-DD
          if (selectedDates.includes(todayStr)) {
            const timesForToday = dateTimeMap[todayStr] || []
            if (timesForToday.length > 0) {
              const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
              dateTimeMatch = timesForToday.includes(currentTimeStr)
              
              // Check for missed schedule for date-specific times
              if (!dateTimeMatch && lastExecutedAt) {
                for (const timeStr of timesForToday) {
                  const [hours, minutes] = timeStr.split(':').map(Number)
                  const scheduledTime = new Date(now)
                  scheduledTime.setHours(hours, minutes, 0, 0)
                  
                  // If scheduled time is in the past but within tolerance
                  if (scheduledTime < now && scheduledTime > lastExecutedAt) {
                    const timeSinceScheduled = now.getTime() - scheduledTime.getTime()
                    if (timeSinceScheduled <= MISSED_SCHEDULE_TOLERANCE) {
                      dateTimeMissedSchedule = true
                      break
                    }
                  }
                }
              }
            }
          }
        }

        // Execute if:
        // 1. (Time matches AND Day matches) OR (Date and Time match) AND
        // 2. (Never executed before OR it's a missed schedule OR dateTimeMissedSchedule)
        // Note: For date-specific times, we allow execution even if lastExecutedAt exists, as long as the time matches
        if (dateTimeMatch) {
          // For date-specific times, execute if time matches
          // Check if we haven't executed at this exact time today before
          if (lastExecutedAt) {
            const lastExecutedToday = lastExecutedAt.toISOString().split('T')[0] === todayStr
            if (lastExecutedToday) {
              const lastExecutedTimeStr = `${String(lastExecutedAt.getHours()).padStart(2, '0')}:${String(lastExecutedAt.getMinutes()).padStart(2, '0')}`
              // Only execute if it's a different time or missed schedule
              shouldExecute = lastExecutedTimeStr !== currentTimeStr || dateTimeMissedSchedule
            } else {
              // Last execution was on a different date, so we can execute
              shouldExecute = true
            }
          } else {
            // Never executed before, so execute
            shouldExecute = true
          }
        } else {
          // For regular time/day matching
          shouldExecute = (timeMatch && dayMatch) && (!lastExecutedAt || missedSchedule)
        }
        
        if (missedSchedule) {
          logger.warn(`Rule ${rule.rule_id} (${rule.name}) - Executing missed schedule`)
        }
        if (dateTimeMissedSchedule) {
          logger.warn(`Rule ${rule.rule_id} (${rule.name}) - Executing missed date-specific schedule`)
        }
      } else if (rule.execution_mode === 'interval') {
        // Interval mode: execute based on interval only (no time/day restrictions)
        const intervalMatch = shouldExecuteByInterval(rule.selected_interval, lastExecutedAt, now)
        shouldExecute = intervalMatch
      } else if (rule.execution_mode === 'auto') {
        // Auto mode (legacy): execute based on schedule (time, day, interval)
        // This is kept for backward compatibility
        const timeMatch = isTimeMatch(selectedTimes, now)
        const dayMatch = isDayMatch(selectedDays, now)
        const intervalMatch = shouldExecuteByInterval(rule.selected_interval, lastExecutedAt, now)
        const missedSchedule = isMissedSchedule(selectedTimes, lastExecutedAt, now)

        // Execute if:
        // 1. Time matches (or no time restriction) AND
        // 2. Day matches (or no day restriction) AND
        // 3. (Interval has passed OR it's a missed schedule)
        shouldExecute = timeMatch && dayMatch && (intervalMatch || missedSchedule)
        
        if (missedSchedule) {
          logger.warn(`Rule ${rule.rule_id} (${rule.name}) - Executing missed schedule`)
        }
      } else {
        logger.warn(`Unknown execution mode: ${rule.execution_mode} for rule ${rule.rule_id}`)
        shouldExecute = false
      }

      if (shouldExecute) {
        logger.debug(
          `Rule ${rule.rule_id} (${rule.name}) - Scheduled for execution. ` +
          `Mode: ${rule.execution_mode}, Interval: ${rule.selected_interval}s, ` +
          `Last executed: ${lastExecutedAt ? lastExecutedAt.toISOString() : 'never'}`
        )
        scheduledRules.push({
          rule_id: rule.rule_id,
          name: rule.name,
          user_id: rule.user_id,
          campaign_assignments: campaignAssignments,
          conditions,
          actions,
          telegram_notification: rule.telegram_notification,
          selected_interval: rule.selected_interval,
          selected_times: selectedTimes,
          selected_days: selectedDays,
          selected_dates: selectedDates,
          date_time_map: dateTimeMap,
          execution_mode: rule.execution_mode,
          last_executed_at: lastExecutedAt || undefined,
        })
      } else {
        logger.debug(
          `Rule ${rule.rule_id} (${rule.name}) - Skipped. ` +
          `Mode: ${rule.execution_mode}, Interval: ${rule.selected_interval}s, ` +
          `Last executed: ${lastExecutedAt ? lastExecutedAt.toISOString() : 'never'}, ` +
          `Time since last: ${lastExecutedAt ? Math.floor((now.getTime() - lastExecutedAt.getTime()) / 1000) : 'N/A'}s`
        )
      }
    }

    logger.info(`Found ${scheduledRules.length} rules to execute`)
    return scheduledRules
  } finally {
    connection.release()
  }
}

