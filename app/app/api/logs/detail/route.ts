import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { getUserRole, checkPermission } from '@/lib/role-checker'
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

export async function GET(request: NextRequest) {
    let connection: PoolClient | null = null

    try {
        const user = await requireActiveStatus(request)

        // RBAC Check
        const canViewAll = checkPermission(user, 'logs.view.all')
        const canViewOwn = checkPermission(user, 'logs.view.own')
        if (!canViewOwn && !canViewAll) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const logId = searchParams.get('logId')

        if (!logId) {
            return NextResponse.json(
                { success: false, error: 'logId is required' },
                { status: 400 }
            )
        }

        connection = await getDatabaseConnection()

        // RBAC: Get allowed stores
        const allowedUsernames = await getAllowedUsernames(user)

        // 1. Get the base log entry to find rule_id and executed_at
        // Also check if user has access to this log's toko
        const baseLogResult = await connection.query(
            `SELECT rule_id, executed_at, toko_id FROM rule_execution_logs WHERE id = $1`,
            [logId]
        )

        if (baseLogResult.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Log not found' },
                { status: 404 }
            )
        }

        const { rule_id: ruleId, executed_at: executedAt, toko_id: logTokoId } = baseLogResult.rows[0]

        // Verify access to this specific log if not superadmin/admin
        if (!canViewAll && !allowedUsernames.includes(logTokoId)) {
            return NextResponse.json({ success: false, error: 'Access denied to this log data' }, { status: 403 })
        }

        // 2. Get rule data
        const ruleResult = await connection.query(
            `SELECT 
        dr.rule_id,
        dr.name,
        dr.deskripsi,
        dr.category,
        dr.conditions,
        dr.actions,
        dr.campaign_assignments
      FROM data_rules dr
      WHERE dr.rule_id = $1`,
            [ruleId]
        )

        if (!ruleResult.rows || ruleResult.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Rule associated with log not found' },
                { status: 404 }
            )
        }

        const rule = ruleResult.rows[0]

        // 3. Find all logs for this rule that happened at the same time (within 10 seconds)
        // This groups together campaigns that were processed in the same run
        let concurrentLogsQuery = `
      SELECT 
        rel.campaign_id,
        rel.toko_id,
        rel.status,
        rel.error_message,
        rel.execution_data,
        rel.executed_at,
        dt.nama_toko,
        dp.title as campaign_name
      FROM rule_execution_logs rel
      LEFT JOIN data_toko dt ON rel.toko_id = dt.id_toko
      LEFT JOIN data_produk dp ON rel.campaign_id::text = dp.campaign_id::text AND rel.toko_id = dp.id_toko
      WHERE rel.rule_id = $1 
        AND rel.executed_at >= $2::timestamp - interval '10 seconds'
        AND rel.executed_at <= $2::timestamp + interval '10 seconds'
    `
        const concurrentLogsParams: any[] = [ruleId, executedAt]

        if (!canViewAll) {
            if (allowedUsernames.length > 0) {
                const placeholders = allowedUsernames.map((_, i) => `$${i + 3}`).join(',')
                concurrentLogsQuery += ` AND rel.toko_id IN (${placeholders})`
                concurrentLogsParams.push(...allowedUsernames)
            } else {
                // If user can't view all and has no allowed usernames, they shouldn't see any logs.
                // This case should ideally be caught by the earlier `!allowedUsernames.includes(logTokoId)` check
                // if logTokoId is not in allowedUsernames. However, if for some reason allowedUsernames is empty
                // and the base log passed, it means the user has no access to any toko.
                return NextResponse.json({
                    success: true,
                    data: {
                        ruleId: rule.rule_id,
                        ruleName: rule.name,
                        ruleDescription: rule.deskripsi || '',
                        category: rule.category || '',
                        conditions: '', // No conditions string if no logs are returned
                        campaignDetails: []
                    }
                })
            }
        }

        concurrentLogsQuery += ` ORDER BY rel.campaign_id`

        const concurrentLogsResult = await connection.query(concurrentLogsQuery, concurrentLogsParams)

        // Filter to ensure only unique campaign + toko combinations are shown
        const seenCampaigns = new Set();
        const concurrentLogs = concurrentLogsResult.rows.filter(log => {
            const key = `${log.toko_id}-${log.campaign_id}`;
            if (seenCampaigns.has(key)) return false;
            seenCampaigns.add(key);
            return true;
        });

        // Parse JSON fields
        let conditions: ConditionGroup[] = []
        try {
            if (rule.conditions) {
                conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions
            }
        } catch (e) { console.error('Error parsing conditions:', e) }

        let actions: Action[] = []
        try {
            if (rule.actions) {
                actions = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions
            }
        } catch (e) { console.error('Error parsing actions:', e) }

        // Helper functions for formatting (re-used from existing route)
        const formatMetricName = (metric: string): string => {
            const metricMap: { [key: string]: string } = {
                'ctr': 'Tingkat Klik (CTR)', 'cost': 'Total Biaya Iklan', 'clicks': 'Jumlah Klik',
                'impressions': 'Jumlah Tampilan', 'budget': 'Anggaran Harian', 'orders': 'Jumlah Order',
                'gmv': 'Total Penjualan (GMV)', 'broad_order': 'Jumlah Order', 'report_cost': 'Total Biaya Iklan',
                'report_click': 'Jumlah Klik', 'report_impression': 'Jumlah Tampilan', 'report_ctr': 'Tingkat Klik (CTR)',
                'report_broad_order': 'Jumlah Order', 'report_broad_gmv': 'Total Penjualan (GMV)', 'daily_budget': 'Anggaran Harian'
            }
            return metricMap[metric.toLowerCase()] || metric
        }

        const formatOperator = (operator: string): string => {
            const operatorMap: { [key: string]: string } = {
                'greater_than': 'lebih besar dari', 'less_than': 'kurang dari',
                'greater_than_or_equal': 'lebih besar atau sama dengan', 'less_than_or_equal': 'kurang atau sama dengan',
                'equal': 'sama dengan', '>': 'lebih besar dari', '<': 'kurang dari',
                '>=': 'lebih besar atau sama dengan', '<=': 'kurang atau sama dengan', '=': 'sama dengan', '==': 'sama dengan'
            }
            return operatorMap[operator.toLowerCase()] || operator
        }

        const formatValue = (value: number | string, metric: string): string => {
            if (value === undefined || value === null) return 'Tidak tersedia'
            if (typeof value === 'number') {
                const metricLower = metric.toLowerCase()
                if (metricLower.includes('ctr') || metricLower === 'ctr') return `${value.toFixed(2)}%`
                if (metricLower.includes('cost') || metricLower.includes('budget') || metricLower.includes('gmv')) return `Rp ${value.toLocaleString('id-ID')}`
                return value.toLocaleString('id-ID')
            }
            return String(value)
        }

        const conditionsStr = conditions.map((group, idx) => {
            const groupStr = group.conditions.map((c: Condition) => {
                return `${formatMetricName(c.metric)} ${formatOperator(c.operator)} ${formatValue(c.value, c.metric)}`
            }).join(' DAN ')
            return idx > 0 ? ` ATAU (${groupStr})` : `(${groupStr})`
        }).join('')

        // Map logs to campaignDetails format
        const campaignDetails = concurrentLogs.map(log => {
            let executionData: any = null
            try {
                if (log.execution_data) {
                    executionData = typeof log.execution_data === 'string' ? JSON.parse(log.execution_data) : log.execution_data
                }
            } catch (e) { /* ignore */ }

            const conditionResults: any[] = []
            if (executionData?.evaluations && Array.isArray(executionData.evaluations)) {
                for (const evalItem of executionData.evaluations) {
                    conditionResults.push({
                        metric: evalItem.metric || '',
                        operator: evalItem.operator || '=',
                        value: evalItem.expectedValue || 0,
                        actualValue: evalItem.actualValue !== undefined ? evalItem.actualValue : 'N/A',
                        met: !!evalItem.met
                    })
                }
            }

            const isSkipped = executionData?.skipped === true
            let status: 'success' | 'skipped' | 'failed' = log.status === 'success' ? (isSkipped ? 'skipped' : 'success') : 'failed'

            let message = ''
            const totalConds = conditionResults.length
            const metConds = conditionResults.filter(r => r.met).length
            const failedConds = totalConds - metConds
            const condSummary = `(${totalConds} Kondisi: Terpenuhi ${metConds}, Gagal ${failedConds})`

            if (isSkipped) {
                message = `Dilewati - ${condSummary}`
                status = 'skipped'
            } else if (log.status === 'failed') {
                message = `Gagal Eksekusi - ${log.error_message || 'Terjadi kendala saat mengeksekusi rule'}`
                status = 'failed'
            } else {
                message = `Berhasil - ${condSummary}`
                status = 'success'
            }

            // Determine action description
            let actionDesc: any = undefined
            if (actions.length > 0 && !isSkipped && log.status === 'success') {
                const firstAction = actions[0]
                const actionType = firstAction.type || 'Unknown'
                if (actionType === 'update_budget' || actionType === 'set_budget' || actionType === 'add_budget' || actionType === 'reduce_budget') {
                    actionDesc = {
                        type: actionType,
                        description: `Aksi: ${actionType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}`
                    }
                } else {
                    actionDesc = {
                        type: actionType,
                        description: `Aksi: ${actionType}`
                    }
                }
            }

            return {
                campaignId: log.campaign_id,
                campaignName: log.campaign_name || `Campaign ${log.campaign_id}`,
                tokoId: log.toko_id,
                tokoName: log.nama_toko || log.toko_id,
                status,
                conditionResults,
                action: actionDesc,
                message
            }
        })

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
        if (connection) connection.release()
        console.error('Error fetching log detail:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch log detail' }, { status: 500 })
    }
}
