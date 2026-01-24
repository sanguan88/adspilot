import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors'

interface Condition {
  metric: string
  operator: string
  value: number | string
}

interface ConditionGroup {
  conditions: Condition[]
  logic?: 'AND' | 'OR'
}

interface Action {
  type: string
  value?: number | string
  [key: string]: any
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  let connection: PoolClient | null = null

  try {
    const user = await requireActiveStatus(request)
    const allowedUsernames = await getAllowedUsernames(user)
    const { ruleId } = params

    connection = await getDatabaseConnection()

    // Get rule data
    const ruleResult = await connection.query(
      `SELECT 
        dr.rule_id,
        dr.name,
        dr.deskripsi,
        dr.category,
        dr.conditions,
        dr.actions,
        dr.campaign_assignments,
        dr.status,
        dr.error_count,
        dr.triggers,
        dr.success_rate,
        dr.update_at,
        dr.created_at
      FROM data_rules dr
      WHERE dr.rule_id = $1`,
      [ruleId]
    )

    if (!ruleResult.rows || ruleResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      )
    }

    const rule = ruleResult.rows[0]

    // Parse JSON fields
    let conditions: ConditionGroup[] = []
    let actions: Action[] = []
    let campaignAssignments: { [tokoId: string]: string[] } = {}

    try {
      if (rule.conditions) {
        conditions = typeof rule.conditions === 'string'
          ? JSON.parse(rule.conditions)
          : rule.conditions
      }
    } catch (e) {
      console.error('Error parsing conditions:', e)
    }

    try {
      if (rule.actions) {
        actions = typeof rule.actions === 'string'
          ? JSON.parse(rule.actions)
          : rule.actions
      }
    } catch (e) {
      console.error('Error parsing actions:', e)
    }

    try {
      if (rule.campaign_assignments) {
        campaignAssignments = typeof rule.campaign_assignments === 'string'
          ? JSON.parse(rule.campaign_assignments)
          : rule.campaign_assignments
      }
    } catch (e) {
      console.error('Error parsing campaign_assignments:', e)
    }

    // Format conditions string - user-friendly
    const formatMetricName = (metric: string): string => {
      const metricMap: { [key: string]: string } = {
        'ctr': 'Tingkat Klik (CTR)',
        'cost': 'Total Biaya Iklan',
        'clicks': 'Jumlah Klik',
        'impressions': 'Jumlah Tampilan',
        'budget': 'Anggaran Harian',
        'orders': 'Jumlah Order',
        'gmv': 'Total Penjualan (GMV)',
        'broad_order': 'Jumlah Order',
        'report_cost': 'Total Biaya Iklan',
        'report_click': 'Jumlah Klik',
        'report_impression': 'Jumlah Tampilan',
        'report_ctr': 'Tingkat Klik (CTR)',
        'report_broad_order': 'Jumlah Order',
        'report_broad_gmv': 'Total Penjualan (GMV)',
        'daily_budget': 'Anggaran Harian'
      }
      return metricMap[metric.toLowerCase()] || metric
    }

    const formatOperator = (operator: string): string => {
      const operatorMap: { [key: string]: string } = {
        'greater_than': 'lebih besar dari',
        'less_than': 'kurang dari',
        'greater_than_or_equal': 'lebih besar atau sama dengan',
        'less_than_or_equal': 'kurang atau sama dengan',
        'equal': 'sama dengan',
        '>': 'lebih besar dari',
        '<': 'kurang dari',
        '>=': 'lebih besar atau sama dengan',
        '<=': 'kurang atau sama dengan',
        '=': 'sama dengan',
        '==': 'sama dengan'
      }
      return operatorMap[operator.toLowerCase()] || operator
    }

    const formatValue = (value: number | string, metric: string): string => {
      if (value === undefined || value === null) return 'Tidak tersedia'

      if (typeof value === 'number') {
        const metricLower = metric.toLowerCase()
        if (metricLower.includes('ctr') || metricLower === 'ctr') {
          return `${value.toFixed(2)}%`
        } else if (metricLower.includes('cost') || metricLower.includes('budget') || metricLower.includes('gmv')) {
          return `Rp ${value.toLocaleString('id-ID')}`
        } else {
          return value.toLocaleString('id-ID')
        }
      }

      return String(value)
    }

    const formatConditions = (conditionGroups: ConditionGroup[]): string => {
      if (!conditionGroups || conditionGroups.length === 0) {
        return 'Tidak ada kondisi'
      }

      return conditionGroups.map((group, idx) => {
        const groupStr = group.conditions.map((c: Condition) => {
          const metricName = formatMetricName(c.metric || 'Unknown')
          const operator = formatOperator(c.operator || '=')
          const value = formatValue(c.value !== undefined ? c.value : 0, c.metric || '')
          return `${metricName} ${operator} ${value}`
        }).join(' DAN ')

        return idx > 0 ? ` ATAU (${groupStr})` : `(${groupStr})`
      }).join('')
    }

    const conditionsStr = formatConditions(conditions)

    // Get campaign and toko names
    const allTokoIds = Object.keys(campaignAssignments)
    const allCampaignIds = Object.values(campaignAssignments).flat()

    // Get toko names
    const tokoMap = new Map<string, string>()
    if (allTokoIds.length > 0) {
      const tokoPlaceholders = allTokoIds.map((_, i) => `$${i + 1}`).join(',')
      const tokoResult = await connection.query(
        `SELECT id_toko, nama_toko FROM data_toko WHERE id_toko IN (${tokoPlaceholders})`,
        allTokoIds
      )
      tokoResult.rows.forEach((row: any) => {
        tokoMap.set(row.id_toko, row.nama_toko || row.id_toko)
      })
    }

    // Get campaign names (from latest data_produk)
    const campaignMap = new Map<string, string>()
    if (allCampaignIds.length > 0) {
      // Get latest campaign data
      const campaignPlaceholders = allCampaignIds.map((_, i) => `$${i + 1}`).join(',')
      const campaignResult = await connection.query(
        `SELECT DISTINCT ON (campaign_id) 
          campaign_id, 
          title,
          id_toko
        FROM data_produk 
        WHERE campaign_id IN (${campaignPlaceholders})
        ORDER BY campaign_id, update_at DESC NULLS LAST, created_at DESC`,
        allCampaignIds
      )
      campaignResult.rows.forEach((row: any) => {
        campaignMap.set(row.campaign_id, row.title || `Campaign ${row.campaign_id}`)
      })
    }

    // Generate detail for each campaign
    const campaignDetails: Array<{
      campaignId: string
      campaignName: string
      tokoId: string
      tokoName: string
      status: 'success' | 'skipped' | 'failed'
      conditionResults: Array<{
        metric: string
        operator: string
        value: number | string
        actualValue?: number | string
        met: boolean
      }>
      action?: {
        type: string
        from?: number | string
        to?: number | string
        description: string
      }
      message: string
    }> = []

    // Process each toko and campaign
    for (const [tokoId, campaignIds] of Object.entries(campaignAssignments)) {
      const tokoName = tokoMap.get(tokoId) || tokoId

      for (const campaignId of campaignIds) {
        const campaignName = campaignMap.get(campaignId) || `Campaign ${campaignId}`

        // Get latest campaign metrics for condition evaluation simulation
        // Note: This is a simplified simulation - actual execution would use real-time data
        // Get data with the most recent report_date, or if no report_date, get the most recent update_at
        // Use SUM to aggregate data if there are multiple entries for the same report_date
        // Try to get data with latest report_date first, fallback to latest update_at if no report_date
        const campaignDataResult = await connection.query(
          `SELECT 
            COALESCE(SUM(dp.report_ctr), 0) as ctr,
            COALESCE(SUM(dp.report_cost), 0) as cost,
            COALESCE(SUM(dp.report_click), 0) as clicks,
            COALESCE(SUM(dp.report_impression), 0) as impressions,
            COALESCE(MAX(dp.daily_budget), 0) as daily_budget,
            COALESCE(SUM(dp.report_broad_order), 0) as orders,
            COALESCE(SUM(dp.report_broad_gmv), 0) as gmv,
            COALESCE(MAX(dp.report_broad_roi), 0) as roi,
            COALESCE(AVG(dp.report_cpc), 0) as cpc,
            COALESCE(SUM(dp.report_view), 0) as views,
            COALESCE(
              CASE 
                WHEN SUM(dp.report_impression) > 0 AND SUM(dp.report_cost) > 0 
                THEN (SUM(dp.report_cost)::numeric / SUM(dp.report_impression)::numeric * 1000)
                ELSE 0
              END, 
              0
            ) as cpm,
            MAX(dp.report_date) as report_date
          FROM data_produk dp
          WHERE dp.campaign_id = $1
            AND (
              dp.report_date = (SELECT MAX(report_date) FROM data_produk WHERE campaign_id = $1 AND report_date IS NOT NULL)
              OR (
                (SELECT MAX(report_date) FROM data_produk WHERE campaign_id = $1 AND report_date IS NOT NULL) IS NULL
                AND dp.update_at = (SELECT MAX(update_at) FROM data_produk WHERE campaign_id = $1)
              )
            )
          GROUP BY dp.campaign_id`,
          [campaignId]
        )

        const campaignData = campaignDataResult.rows[0] || {}

        // Debug: Log campaign data to check if orders data exists
        console.log(`[Log Detail] Campaign ${campaignId} - Query result:`, {
          rowCount: campaignDataResult.rows.length,
          orders: campaignData.orders,
          ordersType: typeof campaignData.orders,
          ordersValue: campaignData.orders,
          cost: campaignData.cost,
          report_date: campaignData.report_date,
          allFields: campaignDataResult.rows[0] ? Object.keys(campaignDataResult.rows[0]) : [],
          rawData: campaignDataResult.rows[0]
        })

        // If orders is 0 but we know from campaign management it should have data,
        // it might be a data sync issue. For now, we'll use what we have.

        // Get latest execution log for this campaign to get specific error message
        const executionLogResult = await connection.query(
          `SELECT status, error_message, execution_data, executed_at
           FROM rule_execution_logs
           WHERE rule_id = $1 AND campaign_id = $2
           ORDER BY executed_at DESC
           LIMIT 1`,
          [rule.rule_id, campaignId]
        )

        // Determine status and execution data from the actual log
        const executionLog = executionLogResult.rows[0]
        let executionData: any = null
        try {
          if (executionLog && executionLog.execution_data) {
            executionData = typeof executionLog.execution_data === 'string'
              ? JSON.parse(executionLog.execution_data)
              : executionLog.execution_data
          }
        } catch (e) {
          console.error('Error parsing execution data:', e)
        }

        const conditionResults: Array<{
          metric: string
          operator: string
          value: number | string
          actualValue?: number | string
          met: boolean
        }> = []

        let allConditionsMet = true

        // Use stored evaluations if available (more accurate as it captures state at execution time)
        if (executionData && executionData.evaluations && Array.isArray(executionData.evaluations)) {
          console.log(`[Log Detail] Using stored evaluations for campaign ${campaignId}`)
          for (const evalItem of executionData.evaluations) {
            conditionResults.push({
              metric: evalItem.metric || '',
              operator: evalItem.operator || '=',
              value: evalItem.expectedValue || 0,
              actualValue: evalItem.actualValue !== undefined ? evalItem.actualValue : 'N/A',
              met: !!evalItem.met
            })
            if (!evalItem.met) allConditionsMet = false
          }
        }
        // Fallback: Simulation logic if log data is missing (older logs)
        else if (conditions && conditions.length > 0) {
          console.log(`[Log Detail] Simulation fallback for campaign ${campaignId}`)
          for (const group of conditions) {
            for (const condition of group.conditions) {
              const metric = condition.metric || ''
              const operator = condition.operator || '='
              const threshold = condition.value

              // Get actual value from campaign data
              let actualValue: number | string | undefined
              const metricMap: { [key: string]: string } = {
                'ctr': 'ctr',
                'cost': 'cost',
                'clicks': 'clicks',
                'impressions': 'impressions',
                'impression': 'impressions',
                'report_impression': 'impressions',
                'budget': 'daily_budget',
                'daily_budget': 'daily_budget',
                'orders': 'orders',
                'broad_order': 'orders',
                'report_broad_order': 'orders',
                'gmv': 'gmv',
                'broad_gmv': 'gmv',
                'report_broad_gmv': 'gmv',
                'broad_roi': 'roi',
                'report_broad_roi': 'roi',
                'roi': 'roi',
                'click': 'clicks',
                'report_click': 'clicks',
                'view': 'views',
                'report_view': 'views',
                'cpc': 'cpc',
                'report_cpc': 'cpc',
                'cpm': 'cpm'
              }

              const dbField = metricMap[metric.toLowerCase()] || metric.toLowerCase()
              actualValue = campaignData[dbField]

              if (actualValue !== undefined && actualValue !== null && typeof actualValue === 'string') {
                const parsed = parseFloat(actualValue)
                if (!isNaN(parsed)) actualValue = parsed
              }

              if (actualValue === undefined || actualValue === null) {
                actualValue = 0
              }

              let met = false
              if (actualValue !== undefined && actualValue !== null && threshold !== undefined) {
                const actual = typeof actualValue === 'string' ? parseFloat(actualValue) : actualValue as number
                const thresh = typeof threshold === 'string' ? parseFloat(threshold) : threshold as number

                if (!isNaN(actual) && !isNaN(thresh)) {
                  const normalizedOperator = operator.toLowerCase().trim()
                  switch (normalizedOperator) {
                    case '<': case 'less_than': met = actual < thresh; break
                    case '>': case 'greater_than': met = actual > thresh; break
                    case '<=': case 'less_than_or_equal': case 'less_equal': met = actual <= thresh; break
                    case '>=': case 'greater_than_or_equal': case 'greater_equal': met = actual >= thresh; break
                    case '=': case '==': case 'equal': met = Math.abs(actual - thresh) < 0.01; break
                    case '!=': case 'not_equal': met = Math.abs(actual - thresh) >= 0.01; break
                  }
                }
              }

              conditionResults.push({
                metric,
                operator,
                value: threshold,
                actualValue,
                met
              })

              if (!met) allConditionsMet = false
            }
          }
        }

        // Determine action description
        let actionDesc: { type: string; from?: number | string; to?: number | string; description: string } | undefined
        if (actions && actions.length > 0 && allConditionsMet) {
          const firstAction = actions[0]
          const actionType = firstAction.type || 'Unknown'

          if (actionType === 'update_budget' && firstAction.value !== undefined) {
            const currentBudget = campaignData.daily_budget || 0
            const newBudget = firstAction.value
            actionDesc = {
              type: actionType,
              from: currentBudget,
              to: newBudget,
              description: `Update Budget dari Rp ${Number(currentBudget).toLocaleString('id-ID')} → Rp ${Number(newBudget).toLocaleString('id-ID')}`
            }
          } else if (actionType === 'pause') {
            actionDesc = {
              type: actionType,
              description: 'Pause Campaign'
            }
          } else if (actionType === 'resume') {
            actionDesc = {
              type: actionType,
              description: 'Resume Campaign'
            }
          } else {
            actionDesc = {
              type: actionType,
              description: `Action: ${actionType}`
            }
          }
        }

        const isSkipped = executionData?.skipped === true
        let status: 'success' | 'skipped' | 'failed' = 'skipped'
        let message = ''

        // Calculate conditions summary for message
        const totalConds = conditionResults.length
        const metConds = conditionResults.filter(r => r.met).length
        const failedConds = totalConds - metConds
        const condSummary = `(${totalConds} Kondisi: Terpenuhi ${metConds}, Gagal ${failedConds})`

        if (!allConditionsMet || isSkipped) {
          // Condition not met or skipped - this is success (no error occurred)
          status = 'success'
          message = `Dilewati - ${condSummary}`
        } else if (executionLog && executionLog.status === 'failed') {
          // Execution failed - this is an actual error
          status = 'failed'
          const errorMsg = executionLog.error_message || 'Terjadi kendala saat mengeksekusi rule'

          // Format error message to be more user-friendly, but keep original error details
          if (errorMsg.includes('cookies') || errorMsg.includes('cookie') || errorMsg.includes('authentication')) {
            message = 'Gagal Eksekusi - Cookies akun tidak valid atau sudah kadaluarsa. Silakan update cookies di halaman Akun.'
          } else if (errorMsg.includes('pause') || errorMsg.includes('paused')) {
            message = 'Gagal Eksekusi - Campaign sudah dalam status pause atau tidak dapat di-pause.'
          } else if (errorMsg.includes('budget') || errorMsg.includes('Budget')) {
            message = `Gagal Eksekusi - Gagal mengubah budget: ${errorMsg}`
          } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
            message = 'Gagal Eksekusi - Terlalu banyak request ke Shopee. Silakan coba lagi nanti.'
          } else {
            // Show the actual error message from endpoint response
            message = `Gagal Eksekusi - ${errorMsg}`
          }
        } else if (rule.status === 'error' || rule.error_count > 0) {
          // Fallback: use generic message if no specific log found
          status = 'failed'
          message = 'Gagal Eksekusi - Terjadi kendala saat mengeksekusi rule.'
        } else {
          status = 'success'
          message = `Berhasil - ${condSummary}`
        }

        campaignDetails.push({
          campaignId,
          campaignName,
          tokoId,
          tokoName,
          status,
          conditionResults,
          action: actionDesc,
          message
        })
      }
    }

    connection.release()

    return NextResponse.json({
      success: true,
      data: {
        ruleId: rule.rule_id,
        ruleName: rule.name,
        ruleDescription: rule.deskripsi || '',
        category: rule.category || '',
        conditions: conditionsStr,
        campaignDetails
      }
    })

  } catch (error) {
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
    }

    if (isDatabaseConnectionError(error)) {
      const sanitized = sanitizeErrorForLogging(error)
      const timestamp = new Date().toISOString()
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

      return NextResponse.json(
        {
          success: false,
          error: getGenericDatabaseErrorMessage(),
        },
        { status: 503 }
      )
    }

    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error fetching log detail: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch log detail'
      },
      { status: 500 }
    )
  }
}

