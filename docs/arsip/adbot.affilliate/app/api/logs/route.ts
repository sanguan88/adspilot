import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user
    const user = requireAuth(request);
    const allowedUsernames = await getAllowedUsernames(user);
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const ruleFilter = searchParams.get('ruleFilter')
    const search = searchParams.get('search')

    // Get database connection
    connection = await getDatabaseConnection()

    // Build WHERE conditions
    let whereConditions: string[] = []
    let params: any[] = []

    // Filter by status akan dilakukan di application layer karena log status
    // ditentukan dari kombinasi rule status, error_count, dan last_run
    // Jadi kita tidak filter di SQL untuk status, filter akan dilakukan setelah transformasi

    // Filter by rule type/category
    if (ruleFilter && ruleFilter !== 'all-rules') {
      const categoryMap: { [key: string]: string } = {
        'budget': 'Budget',
        'performance': 'Performance',
        'notification': 'Notification'
      }
      const category = categoryMap[ruleFilter]
      if (category) {
        whereConditions.push(`category LIKE $${params.length + 1}`)
        params.push(`%${category}%`)
      }
    }

    // Search filter
    if (search) {
      whereConditions.push(`(ar.name LIKE $${params.length + 1} OR ar.description LIKE $${params.length + 2})`)
      params.push(`%${search}%`, `%${search}%`)
    }

    // Filter rules based on allowed usernames
    if (user.role !== 'superadmin' && allowedUsernames.length > 0) {
      const placeholders = allowedUsernames.map((_, i) => `$${params.length + i + 1}`).join(',')
      whereConditions.push(`ar.rule_id IN (
        SELECT DISTINCT rule_id 
        FROM automation_rule_usernames 
        WHERE username IN (${placeholders})
      )`)
      params.push(...allowedUsernames)
    } else if (user.role !== 'superadmin' && allowedUsernames.length === 0) {
      // No allowed usernames, return empty result
      if (connection) {
        connection.release()
      }
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Query automation_rules dengan relations
    const query = `
      SELECT 
        ar.rule_id,
        ar.name,
        ar.description,
        ar.status,
        ar.category,
        ar.last_run,
        ar.last_check,
        ar.next_check,
        ar.actions,
        ar.error_count,
        ar.triggers,
        ar.success_rate,
        ar.created_at,
        ar.updated_at
      FROM automation_rules ar
      ${whereClause}
      ORDER BY COALESCE(ar.last_run, ar.last_check, ar.updated_at) DESC
      LIMIT 100
    `

    const ruleResult = await connection.query(query, params)
    const ruleRows = ruleResult.rows

    if (!ruleRows || ruleRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Get all rule_ids untuk fetch relasi
    const ruleIds = ruleRows.map(rule => rule.rule_id)

    // Fetch usernames untuk rules
    let usernameRows: any[] = []
    if (ruleIds.length > 0) {
      const placeholders = ruleIds.map((_, i) => `$${i + 1}`).join(',')
      const usernameResult = await connection.query(
        `SELECT rule_id, username FROM automation_rule_usernames WHERE rule_id IN (${placeholders})`,
        ruleIds
      )
      usernameRows = usernameResult.rows
    }

    // Fetch campaigns untuk rules
    let campaignRows: any[] = []
    if (ruleIds.length > 0) {
      const placeholders = ruleIds.map((_, i) => `$${i + 1}`).join(',')
      const campaignResult = await connection.query(
        `SELECT rule_id, campaign_id FROM automation_rule_campaigns WHERE rule_id IN (${placeholders})`,
        ruleIds
      )
      campaignRows = campaignResult.rows
    }

    // Group usernames and campaigns by rule_id
    const usernamesByRuleId: { [key: string]: string[] } = {}
    usernameRows.forEach((row: any) => {
      if (!usernamesByRuleId[row.rule_id]) {
        usernamesByRuleId[row.rule_id] = []
      }
      usernamesByRuleId[row.rule_id].push(row.username)
    })

    const campaignsByRuleId: { [key: string]: number[] } = {}
    campaignRows.forEach((row: any) => {
      if (!campaignsByRuleId[row.rule_id]) {
        campaignsByRuleId[row.rule_id] = []
      }
      campaignsByRuleId[row.rule_id].push(row.campaign_id)
    })

    // Transform data ke format logs
    const logs = ruleRows.map((rule: any) => {
      // Parse actions JSON
      let actions = []
      let actionType = 'Unknown'
      try {
        if (rule.actions) {
          actions = JSON.parse(rule.actions)
          // Ambil action type dari actions array
          if (Array.isArray(actions) && actions.length > 0) {
            const firstAction = actions[0]
            if (firstAction.type) {
              actionType = firstAction.type
            } else if (firstAction.action) {
              actionType = firstAction.action
            }
          }
        }
      } catch (e) {
        // Ignore parse error
      }

      // Determine log status based on rule status, error_count, and last_run
      let logStatus = 'pending'
      
      // Jika ada last_run, berarti rule pernah dieksekusi
      if (rule.last_run) {
        if (rule.status === 'error' || rule.error_count > 0) {
          logStatus = 'failed'
        } else if (rule.status === 'active') {
          logStatus = 'success'
        } else {
          logStatus = 'pending'
        }
      } else if (rule.status === 'error') {
        logStatus = 'failed'
      } else if (rule.status === 'active' && rule.triggers > 0) {
        logStatus = 'success'
      } else {
        logStatus = 'pending'
      }

      // Get timestamp (prefer last_run, fallback to last_check, then updated_at)
      const timestamp = rule.last_run || rule.last_check || rule.updated_at || rule.created_at

      // Get account (first username or "No account assigned")
      const accounts = usernamesByRuleId[rule.rule_id] || []
      const account = accounts.length > 0 ? accounts[0] : 'No account assigned'

      // Get target (campaigns or rule name)
      const campaigns = campaignsByRuleId[rule.rule_id] || []
      let target = rule.name
      if (campaigns.length > 0) {
        target = `Campaign ${campaigns.length > 1 ? `(${campaigns.length})` : campaigns[0]}`
      }

      // Build details
      let details = rule.description || `Rule execution: ${rule.name}`
      if (rule.error_count > 0) {
        details = `Error: ${rule.error_count} error(s) occurred. ${details}`
      } else if (rule.triggers > 0) {
        details = `Triggered ${rule.triggers} time(s). Success rate: ${Number(rule.success_rate).toFixed(1)}%. ${details}`
      }

      return {
        id: rule.rule_id,
        timestamp: timestamp ? new Date(timestamp).toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : 'N/A',
        rule: rule.name,
        action: actionType,
        target: target,
        status: logStatus,
        details: details,
        account: account,
        // Additional data for filtering
        category: rule.category,
        rule_id: rule.rule_id
      }
    })

    // Filter by status setelah transformasi
    let filteredLogs = logs
    if (status && status !== 'all') {
      filteredLogs = logs.filter(log => log.status === status)
    }

    return NextResponse.json({
      success: true,
      data: filteredLogs
    })

  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release()
    }
  }
}

