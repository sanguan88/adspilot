/**
 * Condition Evaluator
 * 
 * Evaluate rule conditions against campaign data
 */

import { logger } from './logger'

interface Condition {
  id: string
  metric: string
  operator: string
  value: string
  groupType?: string
}

interface ConditionGroup {
  id: string
  logicalOperator: 'AND' | 'OR'
  conditions: Condition[]
}

interface CampaignMetrics {
  broad_gmv?: number
  broad_order?: number
  broad_roi?: number
  click?: number
  cost?: number
  cpc?: number
  ctr?: number
  impression?: number
  view?: number
  cpm?: number
  saldo?: number
  daily_budget?: number
}

/**
 * Get metric value from campaign data
 */
function getMetricValue(metric: string, data: CampaignMetrics): number | null {
  const metricMap: Record<string, keyof CampaignMetrics> = {
    'broad_gmv': 'broad_gmv',
    'broad_order': 'broad_order',
    'broad_roi': 'broad_roi',
    'click': 'click',
    'cost': 'cost',
    'cpc': 'cpc',
    'ctr': 'ctr',
    'impression': 'impression',
    'view': 'view',
    'cpm': 'cpm',
    'saldo': 'saldo',
    'daily_budget': 'daily_budget',
  }

  const key = metricMap[metric]
  if (!key) {
    logger.warn(`Unknown metric: ${metric}`)
    return null
  }

  const value = data[key]
  return typeof value === 'number' ? value : null
}

/**
 * Evaluate single condition
 */
function evaluateCondition(condition: Condition, data: CampaignMetrics): boolean {
  const metricValue = getMetricValue(condition.metric, data)
  if (metricValue === null) {
    logger.debug(
      `Condition evaluation: ${condition.metric} ${condition.operator} ${condition.value} → ` +
      `FAILED (metric value is null or undefined)`
    )
    return false
  }

  const conditionValue = parseFloat(condition.value)
  if (isNaN(conditionValue)) {
    logger.warn(`Invalid condition value: ${condition.value}`)
    return false
  }

  const operator = condition.operator
  let result = false

  switch (operator) {
    case 'greater_than':
    case '>':
      result = metricValue > conditionValue
      break

    case 'less_than':
    case '<':
      result = metricValue < conditionValue
      break

    case 'greater_equal':
    case '>=':
      result = metricValue >= conditionValue
      break

    case 'less_equal':
    case '<=':
      result = metricValue <= conditionValue
      break

    case 'equal':
    case '=':
      // Allow small floating point differences (epsilon comparison)
      // Use relative tolerance for better accuracy with different number scales
      const epsilon = 0.01
      result = Math.abs(metricValue - conditionValue) < epsilon
      break

    case 'not_equal':
    case '!=':
      // For not_equal, values are considered different if difference is >= epsilon
      // This ensures consistency with equal operator
      const notEqualEpsilon = 0.01
      result = Math.abs(metricValue - conditionValue) >= notEqualEpsilon
      break

    default:
      logger.warn(`Unknown operator: ${operator}`)
      return false
  }

  logger.debug(
    `Condition evaluation: ${condition.metric} ${condition.operator} ${condition.value} → ` +
    `${result ? 'PASS' : 'FAIL'} ` +
    `(actual: ${metricValue}, expected: ${conditionValue})`
  )

  return result
}

/**
 * Evaluate condition group
 */
function evaluateConditionGroup(group: ConditionGroup, data: CampaignMetrics): boolean {
  if (group.conditions.length === 0) {
    return true
  }

  const results = group.conditions.map(condition => evaluateCondition(condition, data))

  if (group.logicalOperator === 'AND') {
    return results.every(result => result === true)
  } else {
    // OR
    return results.some(result => result === true)
  }
}

/**
 * Evaluation detail for a single condition
 */
export interface EvaluationDetail {
  id: string
  metric: string
  operator: string
  expectedValue: string
  actualValue: number | null
  met: boolean
}

/**
 * Result of evaluating all rule conditions with details
 */
export interface EvaluationResult {
  passed: boolean
  totalConditions: number
  evaluations: EvaluationDetail[]
}

/**
 * Evaluate all rule groups and return detailed results for each condition
 * 
 * @param ruleGroups - Array of condition groups
 * @param data - Campaign metrics data
 * @returns Object with overall status and detailed evaluations
 */
export function evaluateConditionsWithDetails(
  ruleGroups: ConditionGroup[],
  data: CampaignMetrics
): EvaluationResult {
  const evaluations: EvaluationDetail[] = []

  if (!ruleGroups || ruleGroups.length === 0) {
    return { passed: false, totalConditions: 0, evaluations: [] }
  }

  // Evaluate all conditions in all groups
  const groupResults = ruleGroups.map((group) => {
    const groupEvaluations = group.conditions.map(condition => {
      const actualValue = getMetricValue(condition.metric, data)
      const met = evaluateCondition(condition, data)

      const detail: EvaluationDetail = {
        id: condition.id,
        metric: condition.metric,
        operator: condition.operator,
        expectedValue: condition.value,
        actualValue,
        met
      }

      evaluations.push(detail)
      return met
    })

    if (group.logicalOperator === 'AND') {
      return groupEvaluations.every(result => result === true)
    } else {
      return groupEvaluations.some(result => result === true)
    }
  })

  const passed = groupResults.every(result => result === true)

  return {
    passed,
    totalConditions: evaluations.length,
    evaluations
  }
}

/**
 * Evaluate all rule groups
 * 
 * @param ruleGroups - Array of condition groups
 * @param data - Campaign metrics data
 * @returns true if all groups pass (AND logic between groups)
 */
export function evaluateConditions(
  ruleGroups: ConditionGroup[],
  data: CampaignMetrics
): boolean {
  const result = evaluateConditionsWithDetails(ruleGroups, data)
  return result.passed
}

