import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getRoleBasedFilter } from '@/lib/role-filter'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user
    const user = requireAuth(request);
    
    const body = await request.json()
    
    const {
      name,
      description,
      category,
      priority,
      precisionMode,
      executionMode,
      selectedTimes,
      selectedDays,
      selectedInterval,
      customInterval,
      ruleGroups,
      conditionGroups,
      actions,
      telegramNotification,
      campaignIds = [],
      usernames = []
    } = body

    // Validate required fields
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // Generate UUID untuk rule_id
    const ruleId = randomUUID()

    // Convert campaignIds to integers (handle both string and number)
    const campaignIdsInt = campaignIds.map((id: string | number) => 
      typeof id === 'string' ? parseInt(id, 10) : id
    ).filter((id: number) => !isNaN(id))

    // Prepare JSON data
    const conditionsJson = ruleGroups ? JSON.stringify(ruleGroups) : null
    const actionsJson = actions ? JSON.stringify(actions) : null
    const selectedTimesJson = selectedTimes && selectedTimes.length > 0 ? JSON.stringify(selectedTimes) : null
    const selectedDaysJson = selectedDays && selectedDays.length > 0 ? JSON.stringify(selectedDays) : null

    // Get database connection
    connection = await getDatabaseConnection()
    
    // Start transaction
    await connection.query('BEGIN')

    try {
      // Insert automation rule
      const insertRuleQuery = `
        INSERT INTO automation_rules (
          rule_id, name, description, status, category, priority,
          triggers, success_rate, error_count, conditions, actions,
          telegram_notification, precision_mode, execution_mode,
          selected_times, selected_days, selected_interval, custom_interval,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      `

      await connection.query(insertRuleQuery, [
        ruleId,
        name,
        description || null,
        'draft',
        category,
        priority || 'medium',
        0, // triggers
        0, // success_rate
        0, // error_count
        conditionsJson,
        actionsJson,
        telegramNotification ? 1 : 0,
        precisionMode || 'standard',
        executionMode || 'continuous',
        selectedTimesJson,
        selectedDaysJson,
        selectedInterval || null,
        customInterval || null
      ])

      // Insert related campaigns
      if (campaignIdsInt.length > 0) {
        let paramIndex = 1
        const placeholders = campaignIdsInt.map(() => `($${paramIndex++}, $${paramIndex++}, NOW())`).join(', ')
        const insertCampaignsQuery = `
          INSERT INTO automation_rule_campaigns (rule_id, campaign_id, created_at)
          VALUES ${placeholders}
        `
        const campaignParams = campaignIdsInt.flatMap((campaignId: number) => [ruleId, campaignId])
        await connection.query(insertCampaignsQuery, campaignParams)
      }

      // Validate and filter usernames based on user role
      const allowedUsernames = await getAllowedUsernames(user);
      const validUsernames = usernames.filter((username: string) => 
        allowedUsernames.includes(username)
      );

      // Insert related usernames (only allowed ones)
      if (validUsernames.length > 0) {
        let paramIndex = 1
        const placeholders = validUsernames.map(() => `($${paramIndex++}, $${paramIndex++}, NOW())`).join(', ')
        const insertUsernamesQuery = `
          INSERT INTO automation_rule_usernames (rule_id, username, created_at)
          VALUES ${placeholders}
        `
        const usernameParams = validUsernames.flatMap((username: string) => [ruleId, username])
        await connection.query(insertUsernamesQuery, usernameParams)
      }

      // Commit transaction
      await connection.query('COMMIT')

      // Fetch the created rule with relations
      const ruleResult = await connection.query(
        `SELECT * FROM automation_rules WHERE rule_id = $1`,
        [ruleId]
      )
      const ruleRows = ruleResult.rows

      if (!ruleRows || ruleRows.length === 0) {
        throw new Error('Failed to retrieve created rule')
      }

      const rule = ruleRows[0]

      // Fetch related campaigns
      const campaignResult = await connection.query(
        `SELECT campaign_id FROM automation_rule_campaigns WHERE rule_id = $1`,
        [ruleId]
      )
      const campaignRows = campaignResult.rows

      // Fetch related usernames
      const usernameResult = await connection.query(
        `SELECT username FROM automation_rule_usernames WHERE rule_id = $1`,
        [ruleId]
      )
      const usernameRows = usernameResult.rows

      return NextResponse.json({
        success: true,
        data: {
          id: rule.rule_id,
          rule_id: rule.rule_id,
          name: rule.name,
          description: rule.description,
          category: rule.category,
          priority: rule.priority,
          status: rule.status,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : [],
          telegram_notification: Boolean(rule.telegram_notification),
          precision_mode: rule.precision_mode,
          execution_mode: rule.execution_mode,
          selected_times: rule.selected_times ? JSON.parse(rule.selected_times) : [],
          selected_days: rule.selected_days ? JSON.parse(rule.selected_days) : [],
          selected_interval: rule.selected_interval,
          custom_interval: rule.custom_interval,
          campaignIds: campaignRows.map(c => c.campaign_id),
          usernames: usernameRows.map(u => u.username),
          triggers: rule.triggers,
          success_rate: Number(rule.success_rate),
          last_run: rule.last_run,
          last_check: rule.last_check,
          next_check: rule.next_check,
          error_count: rule.error_count,
          created_at: rule.created_at,
          updated_at: rule.updated_at
        },
        message: 'Automation rule created successfully'
      })

    } catch (error) {
      // Rollback transaction on error
      if (connection) {
        await connection.query('ROLLBACK')
      }
      throw error
    }

  } catch (error) {
    console.error('Error creating automation rule:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create automation rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    // Close connection
    if (connection) {
      connection.release()
    }
  }
}

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user
    const user = requireAuth(request);
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);
    
    // If no allowed usernames, return empty result
    if (allowedUsernames.length === 0 && user.role !== 'superadmin') {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      });
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const skip = (page - 1) * limit

    // Build WHERE conditions
    let whereConditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (status && status !== 'all') {
      whereConditions.push(`ar.status = $${paramIndex++}`)
      params.push(status)
    }
    if (category && category !== 'all') {
      whereConditions.push(`ar.category = $${paramIndex++}`)
      params.push(category)
    }

    // Filter rules based on allowed usernames
    // Only show rules that have at least one username in the allowed list
    if (user.role !== 'superadmin' && allowedUsernames.length > 0) {
      const placeholders = allowedUsernames.map(() => `$${paramIndex++}`).join(',')
      whereConditions.push(`ar.rule_id IN (
        SELECT DISTINCT rule_id 
        FROM automation_rule_usernames 
        WHERE username IN (${placeholders})
      )`)
      params.push(...allowedUsernames)
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Get database connection
    connection = await getDatabaseConnection()

    // Get total count
    const countResult = await connection.query(
      `SELECT COUNT(DISTINCT ar.rule_id) as total FROM automation_rules ar ${whereClause}`,
      params
    )
    const total = countResult.rows[0]?.total || 0

    // Fetch rules with pagination
    const ruleResult = await connection.query(
      `SELECT DISTINCT ar.* FROM automation_rules ar ${whereClause} ORDER BY ar.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, skip]
    )
    const ruleRows = ruleResult.rows

    if (!ruleRows || ruleRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      })
    }

    // Get all rule_ids untuk fetch relasi
    const ruleIds = ruleRows.map(rule => rule.rule_id)

    // Fetch all campaigns untuk rules ini
    let campaignRows: any[] = []
    if (ruleIds.length > 0) {
      const placeholders = ruleIds.map((_, idx) => `$${idx + 1}`).join(',')
      const campaignResult = await connection.query(
        `SELECT rule_id, campaign_id FROM automation_rule_campaigns WHERE rule_id IN (${placeholders})`,
        ruleIds
      )
      campaignRows = campaignResult.rows
    }

    // Fetch all usernames untuk rules ini
    let usernameRows: any[] = []
    if (ruleIds.length > 0) {
      const placeholders = ruleIds.map((_, idx) => `$${idx + 1}`).join(',')
      const usernameResult = await connection.query(
        `SELECT rule_id, username FROM automation_rule_usernames WHERE rule_id IN (${placeholders})`,
        ruleIds
      )
      usernameRows = usernameResult.rows
    }

    // Group campaigns and usernames by rule_id
    const campaignsByRuleId: { [key: string]: number[] } = {}
    campaignRows.forEach((row: any) => {
      if (!campaignsByRuleId[row.rule_id]) {
        campaignsByRuleId[row.rule_id] = []
      }
      campaignsByRuleId[row.rule_id].push(row.campaign_id)
    })

    const usernamesByRuleId: { [key: string]: string[] } = {}
    usernameRows.forEach((row: any) => {
      if (!usernamesByRuleId[row.rule_id]) {
        usernamesByRuleId[row.rule_id] = []
      }
      usernamesByRuleId[row.rule_id].push(row.username)
    })

    // Transform the data untuk frontend
    const transformedRules = ruleRows.map(rule => {
      const ruleId = rule.rule_id
      
      // Parse conditions untuk menghitung jumlah
      let conditionsCount = 0
      try {
        if (rule.conditions) {
          const parsedConditions = JSON.parse(rule.conditions)
          if (Array.isArray(parsedConditions)) {
            conditionsCount = parsedConditions.reduce((sum: number, group: any) => {
              return sum + (Array.isArray(group.conditions) ? group.conditions.length : 0)
            }, 0)
          }
        }
      } catch (e) {
        // If parsing fails, count as 0
      }

      // Parse actions untuk label
      let actionsList: string[] = []
      try {
        if (rule.actions) {
          const parsedActions = JSON.parse(rule.actions)
          if (Array.isArray(parsedActions)) {
            const actionLabelMap: { [key: string]: string } = {
              "add_budget": "Tambah Budget",
              "reduce_budget": "Kurangi Budget",
              "set_budget": "Set Budget",
              "start_campaign": "Mulai Iklan",
              "pause_campaign": "Pause Iklan",
              "duplicate_campaign": "Duplikat Iklan"
            }
            actionsList = parsedActions.map((action: any) => action.label || actionLabelMap[action.type] || action.type || 'Unknown')
          }
        }
      } catch (e) {
        // If parsing fails, return empty array
      }

      const campaigns = campaignsByRuleId[ruleId] || []
      const usernames = usernamesByRuleId[ruleId] || []

      // Parse ruleGroups for tooltip
      let ruleGroups = []
      try {
        if (rule.conditions) {
          const parsedConditions = JSON.parse(rule.conditions)
          if (Array.isArray(parsedConditions)) {
            ruleGroups = parsedConditions
          }
        }
      } catch (e) {
        // If parsing fails, return empty array
      }

      // Parse actions detail for tooltip
      let actionsDetail = []
      try {
        if (rule.actions) {
          const parsedActionsDetail = JSON.parse(rule.actions)
          if (Array.isArray(parsedActionsDetail)) {
            actionsDetail = parsedActionsDetail
          }
        }
      } catch (e) {
        // If parsing fails, return empty array
      }

      return {
        id: ruleId,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        priority: rule.priority,
        status: rule.status,
        triggers: rule.triggers || 0,
        successRate: Number(rule.success_rate || 0),
        lastRun: rule.last_run ? new Date(rule.last_run).toISOString() : '',
        lastCheck: rule.last_check ? new Date(rule.last_check).toLocaleString() : 'Never',
        lastCheckDate: rule.last_check ? new Date(rule.last_check).toLocaleDateString('id-ID') : 'Never',
        lastCheckTime: rule.last_check ? new Date(rule.last_check).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Never',
        nextCheck: rule.next_check ? new Date(rule.next_check).toLocaleString() : 'Pending',
        errorCount: rule.error_count || 0,
        conditions: conditionsCount,
        actions: actionsList,
        accounts: usernames, // For backward compatibility
        assignments: {
          accountIds: usernames,
          campaignIds: campaigns.map(c => c.toString()),
          totalAccounts: usernames.length,
          totalCampaigns: campaigns.length
        },
        createdAt: rule.created_at ? new Date(rule.created_at).toISOString() : new Date().toISOString(),
        updatedAt: rule.updated_at ? new Date(rule.updated_at).toISOString() : new Date().toISOString(),
        campaignIds: campaigns.map(c => c.toString()),
        usernames: usernames,
        ruleGroups: ruleGroups,
        actionsDetail: actionsDetail
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedRules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching automation rules:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch automation rules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    // Close connection
    if (connection) {
      connection.release()
    }
  }
}
