import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { validateAutomationRulesLimit, validateCampaignAssignments } from '@/lib/subscription-limits'
import { getAllowedUsernames } from '@/lib/role-accounts'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)

    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);

    // Fetch rule
    const ruleResult = await connection.query(
      `SELECT * FROM data_rules WHERE rule_id = $1`,
      [ruleId]
    )
    const ruleRows = ruleResult.rows

    if (!ruleRows || ruleRows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    const rule = ruleRows[0]

    // Check access - user must own the rule or be superadmin
    // Check campaign_assignments (JSONB object keys)
    if (user.role !== 'superadmin') {
      let hasAccess = false
      
      // Check campaign_assignments
      if (rule.campaign_assignments) {
        try {
          const assignments = typeof rule.campaign_assignments === 'string' 
            ? JSON.parse(rule.campaign_assignments) 
            : rule.campaign_assignments
          // Check if any key (toko) in campaign_assignments is in allowed list
          if (typeof assignments === 'object' && !Array.isArray(assignments)) {
            hasAccess = Object.keys(assignments).some((tokoId: string) => allowedUsernames.includes(tokoId))
          }
        } catch (e) {
          // If parsing fails, deny access
          hasAccess = false
        }
      }
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Rule not found or access denied' },
          { status: 404 }
        )
      }
    }

    // Parse JSON fields
    const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions
    const actions = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions
    const selectedTimes = typeof rule.selected_times === 'string' ? JSON.parse(rule.selected_times) : rule.selected_times
    const selectedDays = typeof rule.selected_days === 'string' ? JSON.parse(rule.selected_days) : rule.selected_days
    
    // Parse campaign_assignments and extract toko and campaign lists
    // Format: {toko1: ["campaign1", "campaign2"], toko2: ["campaign3", "campaign4", "campaign5"]}
    let campaignAssignments: Record<string, string[]> = {}
    let usernames: string[] = []
    let campaignIds: string[] = []
    
    try {
      if (rule.campaign_assignments) {
        campaignAssignments = typeof rule.campaign_assignments === 'string' 
          ? JSON.parse(rule.campaign_assignments) 
          : rule.campaign_assignments
        
        // Extract toko list from keys
        usernames = Object.keys(campaignAssignments)
        
        // Extract all campaigns from values (flatten arrays)
        campaignIds = Object.values(campaignAssignments).flat()
        } else {
          // Fallback: empty if no campaign_assignments
          usernames = []
          campaignIds = []
          campaignAssignments = {}
        }
      } catch (e) {
        // If parsing fails, return empty
        usernames = []
        campaignIds = []
        campaignAssignments = {}
      }

    return NextResponse.json({
      success: true,
      data: {
        id: rule.rule_id,
        rule_id: rule.rule_id,
        name: rule.name,
        description: rule.deskripsi,
        category: rule.category,
        priority: rule.priority,
        status: rule.status,
        triggers: rule.triggers,
        success_rate: Number(rule.success_rate),
        error_count: rule.error_count,
        ruleGroups: conditions || [],
        conditions: conditions || [],
        actions: actions || [],
        telegram_notification: Boolean(rule.telegram_notification),
        telegramNotification: Boolean(rule.telegram_notification),
        precision_mode: rule.precision_mode,
        precisionMode: rule.precision_mode,
        execution_mode: rule.execution_mode,
        executionMode: rule.execution_mode,
        selected_times: selectedTimes || [],
        selectedTimes: selectedTimes || [],
        selected_days: selectedDays || [],
        selectedDays: selectedDays || [],
        selected_interval: rule.selected_interval,
        selectedInterval: rule.selected_interval,
        user_id: rule.user_id,
        campaignAssignments: campaignAssignments,
        id_toko_list: usernames, // Generated for backward compatibility
        campaign_id_list: campaignIds, // Generated for backward compatibility
        campaignIds: campaignIds,
        usernames: usernames,
        createdAt: rule.created_at,
        updated_at: rule.update_at,
        updatedAt: rule.update_at
      },
      message: 'Rule fetched successfully'
    })

  } catch (error) {
    console.error('Error fetching rule:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)
    const body = await request.json()

    // Get database connection
    connection = await getDatabaseConnection()

    // Check if rule exists
    const ruleResult = await connection.query(
      `SELECT * FROM data_rules WHERE rule_id = $1`,
      [ruleId]
    )
    const ruleRows = ruleResult.rows

    if (!ruleRows || ruleRows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    // Check access - User isolation: admin/superadmin can access all, others only own rules
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      // Check if rule belongs to user
      if (ruleRows[0].user_id !== user.userId) {
        return NextResponse.json(
          { error: 'Rule not found or access denied' },
          { status: 403 }
        )
      }
    }

    // Build update query dynamically based on body
    const updateFields: string[] = []
    const updateParams: any[] = []
    let paramIndex = 1

    // Common fields that can be updated
    if (body.status !== undefined) {
      // Validate limit if activating rule (status = 'active')
      if (body.status === 'active' && ruleRows[0].status !== 'active') {
        const userId = ruleRows[0].user_id
        const limitValidation = await validateAutomationRulesLimit(
          connection,
          userId,
          user.role
        )
        
        if (!limitValidation.allowed) {
          connection.release()
          return NextResponse.json(
            {
              error: limitValidation.error || 'Batas maksimal automation rules aktif telah tercapai',
              usage: limitValidation.usage,
              limit: limitValidation.limit
            },
            { status: 403 }
          )
        }
      }
      
      updateFields.push(`status = $${paramIndex++}`)
      updateParams.push(body.status)
    }
    if (body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      updateParams.push(body.name)
    }
    if (body.description !== undefined) {
      updateFields.push(`deskripsi = $${paramIndex++}`)
      updateParams.push(body.description)
    }
    if (body.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`)
      updateParams.push(body.category)
    }
    if (body.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`)
      updateParams.push(body.priority)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Always update update_at
    updateFields.push('update_at = NOW()')
    // Add ruleId at the end for WHERE clause
    updateParams.push(ruleId)

    const updateQuery = `
      UPDATE data_rules 
      SET ${updateFields.join(', ')}
      WHERE rule_id = $${paramIndex}
    `

    console.log('PATCH Update Query:', updateQuery)
    console.log('PATCH Update Params:', updateParams)
    
    await connection.query(updateQuery, updateParams)

    // Fetch updated rule
    const updatedResult = await connection.query(
      `SELECT * FROM data_rules WHERE rule_id = $1`,
      [ruleId]
    )
    const updatedRows = updatedResult.rows

    return NextResponse.json({
      success: true,
      data: updatedRows[0],
      message: 'Rule updated successfully'
    })

  } catch (error) {
    console.error('Error updating rule (PATCH):', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', error instanceof Error ? {
      message: error.message,
      name: error.name
    } : error)
    return NextResponse.json(
      { 
        error: 'Failed to update rule',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)

    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);

    // Check if rule exists
    const ruleResult = await connection.query(
      `SELECT rule_id, campaign_assignments FROM data_rules WHERE rule_id = $1`,
      [ruleId]
    )
    const ruleRows = ruleResult.rows

    if (!ruleRows || ruleRows.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this rule - User isolation
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      // Check if rule belongs to user
      if (ruleRows[0].user_id !== user.userId) {
        connection.release();
        return NextResponse.json(
          { error: 'Rule not found or access denied' },
          { status: 403 }
        );
      }
    }

    // Delete the rule (CASCADE will handle related data)
    await connection.query(
      `DELETE FROM data_rules WHERE rule_id = $1`,
      [ruleId]
    )

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting rule:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)
    const body = await request.json()

    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);

    // Check if rule exists
    const ruleResult = await connection.query(
      `SELECT * FROM data_rules WHERE rule_id = $1`,
      [ruleId]
    )
    const ruleRows = ruleResult.rows

    if (!ruleRows || ruleRows.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this rule - User isolation
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      // Check if rule belongs to user
      if (ruleRows[0].user_id !== user.userId) {
        connection.release();
        return NextResponse.json(
          { error: 'Rule not found or access denied' },
          { status: 403 }
        );
      }
    }

    // Start transaction
    await connection.query('BEGIN')

    try {
      // Get user_id from body or use existing
      const userId = body.user_id || ruleRows[0].user_id

      // Validate campaign assignments if provided in body
      if (body.campaignAssignments && Object.keys(body.campaignAssignments).length > 0) {
        const campaignValidation = await validateCampaignAssignments(
          connection,
          userId,
          body.campaignAssignments,
          user.role
        )
        
        if (!campaignValidation.allowed) {
          await connection.query('ROLLBACK')
          connection.release()
          return NextResponse.json(
            {
              error: campaignValidation.error || 'Campaign yang dipilih tidak valid',
              invalidCampaigns: campaignValidation.invalidCampaigns,
            },
            { status: 400 }
          )
        }
      }

      // Prepare JSON data if provided
      const conditionsJson = body.ruleGroups ? JSON.stringify(body.ruleGroups) : (typeof ruleRows[0].conditions === 'string' ? ruleRows[0].conditions : JSON.stringify(ruleRows[0].conditions))
      const actionsJson = body.actions ? JSON.stringify(body.actions) : (typeof ruleRows[0].actions === 'string' ? ruleRows[0].actions : JSON.stringify(ruleRows[0].actions))
      const selectedTimesJson = body.selectedTimes && body.selectedTimes.length > 0 ? JSON.stringify(body.selectedTimes) : (typeof ruleRows[0].selected_times === 'string' ? ruleRows[0].selected_times : JSON.stringify(ruleRows[0].selected_times))
      const selectedDaysJson = body.selectedDays && body.selectedDays.length > 0 ? JSON.stringify(body.selectedDays) : (typeof ruleRows[0].selected_days === 'string' ? ruleRows[0].selected_days : JSON.stringify(ruleRows[0].selected_days))
      
      // Prepare campaign_assignments (mapping toko-campaign)
      // Format: {toko1: ["campaign1", "campaign2"], toko2: ["campaign3", "campaign4", "campaign5"]}
      let campaignAssignmentsJson = '{}'
      let finalCampaignAssignments: Record<string, string[]> = {}
      
      if (body.campaignAssignments && Object.keys(body.campaignAssignments).length > 0) {
        // Use provided campaignAssignments (already in correct format)
        finalCampaignAssignments = body.campaignAssignments
      } else {
        // Fallback: use existing
        try {
          if (ruleRows[0].campaign_assignments) {
            const existing = typeof ruleRows[0].campaign_assignments === 'string' 
              ? JSON.parse(ruleRows[0].campaign_assignments) 
              : ruleRows[0].campaign_assignments
            // If existing is object format, use it
            if (typeof existing === 'object' && !Array.isArray(existing)) {
              finalCampaignAssignments = existing
            }
          }
        } catch (e) {
          finalCampaignAssignments = {}
        }
      }

      // Validate campaign assignments if provided (check if campaigns exist and belong to user)
      if (Object.keys(finalCampaignAssignments).length > 0) {
        const campaignValidation = await validateCampaignAssignments(
          connection,
          userId,
          finalCampaignAssignments,
          user.role
        )
        
        if (!campaignValidation.allowed) {
          await connection.query('ROLLBACK')
          connection.release()
          return NextResponse.json(
            {
              error: campaignValidation.error || 'Campaign yang dipilih tidak valid',
              invalidCampaigns: campaignValidation.invalidCampaigns,
            },
            { status: 400 }
          )
        }
      }

      if (Object.keys(finalCampaignAssignments).length > 0) {
        campaignAssignmentsJson = JSON.stringify(finalCampaignAssignments)
      }

      // Convert precisionMode from string to boolean
      // "critical" -> true, "standard" -> false
      let precisionModeBool: boolean
      if (body.precisionMode !== undefined) {
        precisionModeBool = body.precisionMode === "critical" || body.precisionMode === true
      } else {
        precisionModeBool = ruleRows[0].precision_mode
      }

      // Convert selectedInterval from string to integer (in seconds)
      // Examples: "5 menit" -> 300, "60 detik" -> 60, "1 jam" -> 3600
      let selectedIntervalInt: number | null = null
      if (body.selectedInterval !== undefined && body.selectedInterval !== null) {
        const selectedInterval = body.selectedInterval
        const intervalStr = selectedInterval.toString().toLowerCase()
        if (intervalStr.includes('detik')) {
          const seconds = parseInt(intervalStr.replace(/\D/g, ''))
          selectedIntervalInt = isNaN(seconds) ? null : seconds
        } else if (intervalStr.includes('menit')) {
          const minutes = parseInt(intervalStr.replace(/\D/g, ''))
          selectedIntervalInt = isNaN(minutes) ? null : minutes * 60
        } else if (intervalStr.includes('jam')) {
          const hours = parseInt(intervalStr.replace(/\D/g, ''))
          selectedIntervalInt = isNaN(hours) ? null : hours * 3600
        } else if (typeof selectedInterval === 'number') {
          // Already a number, use it directly
          selectedIntervalInt = selectedInterval
        } else {
          // Try to parse as number (assume seconds)
          const num = parseInt(intervalStr.replace(/\D/g, ''))
          selectedIntervalInt = isNaN(num) ? null : num
        }
      } else {
        selectedIntervalInt = ruleRows[0].selected_interval
      }

      // Validate limit if activating rule (status = 'active')
      const newStatus = body.status || ruleRows[0].status
      if (newStatus === 'active' && ruleRows[0].status !== 'active') {
        const limitValidation = await validateAutomationRulesLimit(
          connection,
          userId,
          user.role
        )
        
        if (!limitValidation.allowed) {
          await connection.query('ROLLBACK')
          connection.release()
          return NextResponse.json(
            {
              error: limitValidation.error || 'Batas maksimal automation rules aktif telah tercapai',
              usage: limitValidation.usage,
              limit: limitValidation.limit
            },
            { status: 403 }
          )
        }
      }

      // Update rule
      const updateQuery = `
        UPDATE data_rules SET
          user_id = $1,
          name = $2,
          deskripsi = $3,
          status = $4,
          category = $5,
          priority = $6,
          conditions = $7,
          actions = $8,
          telegram_notification = $9,
          precision_mode = $10,
          execution_mode = $11,
          selected_times = $12,
          selected_days = $13,
          selected_interval = $14,
          campaign_assignments = $15,
          update_at = NOW()
        WHERE rule_id = $16
      `

      await connection.query(updateQuery, [
        userId,
        body.name || ruleRows[0].name,
        body.description ?? ruleRows[0].deskripsi,
        newStatus,
        body.category || ruleRows[0].category,
        body.priority || ruleRows[0].priority,
        conditionsJson,
        actionsJson,
        body.telegramNotification !== undefined ? body.telegramNotification : ruleRows[0].telegram_notification,
        precisionModeBool,
        body.executionMode || ruleRows[0].execution_mode,
        selectedTimesJson,
        selectedDaysJson,
        selectedIntervalInt,
        campaignAssignmentsJson, // campaign_assignments (JSONB) - format: {toko: [campaigns]}
        ruleId
      ])

      // Commit transaction
      await connection.query('COMMIT')

      // Fetch updated rule
      const updatedResult = await connection.query(
        `SELECT * FROM data_rules WHERE rule_id = $1`,
        [ruleId]
      )
      const updatedRows = updatedResult.rows

      return NextResponse.json({
        success: true,
        data: updatedRows[0],
        message: 'Rule updated successfully'
      })

    } catch (error) {
      // Rollback transaction on error
      await connection.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error updating rule:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}
