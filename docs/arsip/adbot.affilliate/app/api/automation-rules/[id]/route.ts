import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user
    const user = requireAuth(request);
    
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)

    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);

    // Fetch rule
    const ruleResult = await connection.query(
      `SELECT * FROM automation_rules WHERE rule_id = $1`,
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
        triggers: rule.triggers,
        success_rate: Number(rule.success_rate),
        last_run: rule.last_run,
        last_check: rule.last_check,
        next_check: rule.next_check,
        error_count: rule.error_count,
        ruleGroups: rule.conditions ? JSON.parse(rule.conditions) : [],
        conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
        actions: rule.actions ? JSON.parse(rule.actions) : [],
        telegram_notification: Boolean(rule.telegram_notification),
        telegramNotification: Boolean(rule.telegram_notification),
        precision_mode: rule.precision_mode,
        precisionMode: rule.precision_mode,
        execution_mode: rule.execution_mode,
        executionMode: rule.execution_mode,
        selected_times: rule.selected_times ? JSON.parse(rule.selected_times) : [],
        selectedTimes: rule.selected_times ? JSON.parse(rule.selected_times) : [],
        selected_days: rule.selected_days ? JSON.parse(rule.selected_days) : [],
        selectedDays: rule.selected_days ? JSON.parse(rule.selected_days) : [],
        selected_interval: rule.selected_interval,
        selectedInterval: rule.selected_interval,
        custom_interval: rule.custom_interval,
        customInterval: rule.custom_interval,
        campaignIds: campaignRows.map(c => c.campaign_id.toString()),
        usernames: usernameRows.map(u => u.username),
        createdAt: rule.created_at,
        updated_at: rule.updated_at,
        updatedAt: rule.updated_at
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
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)
    const body = await request.json()

    // Get database connection
    connection = await getDatabaseConnection()

    // Check if rule exists
    const ruleResult = await connection.query(
      `SELECT * FROM automation_rules WHERE rule_id = $1`,
      [ruleId]
    )
    const ruleRows = ruleResult.rows

    if (!ruleRows || ruleRows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    // Build update query dynamically based on body
    const updateFields: string[] = []
    const updateParams: any[] = []
    let paramIndex = 1

    // Common fields that can be updated
    if (body.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`)
      updateParams.push(body.status)
    }
    if (body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      updateParams.push(body.name)
    }
    if (body.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
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

    // Always update updated_at
    updateFields.push('updated_at = NOW()')
    // Add ruleId at the end for WHERE clause
    updateParams.push(ruleId)

    const updateQuery = `
      UPDATE automation_rules 
      SET ${updateFields.join(', ')}
      WHERE rule_id = $${paramIndex}
    `

    console.log('PATCH Update Query:', updateQuery)
    console.log('PATCH Update Params:', updateParams)
    
    await connection.query(updateQuery, updateParams)

    // Fetch updated rule
    const updatedResult = await connection.query(
      `SELECT * FROM automation_rules WHERE rule_id = $1`,
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
    // Authenticate user
    const user = requireAuth(request);
    
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)

    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);

    // Check if rule exists
    const ruleResult = await connection.query(
      `SELECT rule_id FROM automation_rules WHERE rule_id = $1`,
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

    // Check if user has access to this rule
    if (user.role !== 'superadmin') {
      const usernameResult = await connection.query(
        `SELECT username FROM automation_rule_usernames WHERE rule_id = $1`,
        [ruleId]
      )
      const usernameRows = usernameResult.rows
      
      const ruleUsernames = usernameRows.map((row: any) => row.username);
      const hasAccess = ruleUsernames.some((username: string) => 
        allowedUsernames.includes(username)
      );
      
      if (!hasAccess) {
        connection.release();
        return NextResponse.json(
          { error: 'Rule not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Delete related records first (CASCADE should handle this, but explicit for safety)
    await connection.query(
      `DELETE FROM automation_rule_campaigns WHERE rule_id = $1`,
      [ruleId]
    )

    await connection.query(
      `DELETE FROM automation_rule_usernames WHERE rule_id = $1`,
      [ruleId]
    )

    // Delete the rule
    await connection.query(
      `DELETE FROM automation_rules WHERE rule_id = $1`,
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
    // Authenticate user
    const user = requireAuth(request);
    
    const { id } = await params
    const ruleId = id // rule_id is string (UUID)
    const body = await request.json()

    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);

    // Check if rule exists
    const ruleResult = await connection.query(
      `SELECT * FROM automation_rules WHERE rule_id = $1`,
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

    // Check if user has access to this rule
    if (user.role !== 'superadmin') {
      const usernameResult = await connection.query(
        `SELECT username FROM automation_rule_usernames WHERE rule_id = $1`,
        [ruleId]
      )
      const usernameRows = usernameResult.rows
      
      const ruleUsernames = usernameRows.map((row: any) => row.username);
      const hasAccess = ruleUsernames.some((username: string) => 
        allowedUsernames.includes(username)
      );
      
      if (!hasAccess) {
        connection.release();
        return NextResponse.json(
          { error: 'Rule not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Start transaction
    await connection.query('BEGIN')

    try {
      // Prepare JSON data if provided
      const conditionsJson = body.ruleGroups ? JSON.stringify(body.ruleGroups) : ruleRows[0].conditions
      const actionsJson = body.actions ? JSON.stringify(body.actions) : ruleRows[0].actions
      const selectedTimesJson = body.selectedTimes && body.selectedTimes.length > 0 ? JSON.stringify(body.selectedTimes) : ruleRows[0].selected_times
      const selectedDaysJson = body.selectedDays && body.selectedDays.length > 0 ? JSON.stringify(body.selectedDays) : ruleRows[0].selected_days

      // Update rule
      const updateQuery = `
        UPDATE automation_rules SET
          name = $1,
          description = $2,
          status = $3,
          category = $4,
          priority = $5,
          conditions = $6,
          actions = $7,
          telegram_notification = $8,
          precision_mode = $9,
          execution_mode = $10,
          selected_times = $11,
          selected_days = $12,
          selected_interval = $13,
          custom_interval = $14,
          updated_at = NOW()
        WHERE rule_id = $15
      `

      await connection.query(updateQuery, [
        body.name || ruleRows[0].name,
        body.description ?? ruleRows[0].description,
        body.status || ruleRows[0].status,
        body.category || ruleRows[0].category,
        body.priority || ruleRows[0].priority,
        conditionsJson,
        actionsJson,
        body.telegramNotification !== undefined ? (body.telegramNotification ? 1 : 0) : ruleRows[0].telegram_notification,
        body.precisionMode || ruleRows[0].precision_mode,
        body.executionMode || ruleRows[0].execution_mode,
        selectedTimesJson,
        selectedDaysJson,
        body.selectedInterval ?? ruleRows[0].selected_interval,
        body.customInterval ?? ruleRows[0].custom_interval,
        ruleId
      ])

      // Update campaigns if provided
      if (body.campaignIds && Array.isArray(body.campaignIds)) {
        // Delete existing campaigns
        await connection.query(
          `DELETE FROM automation_rule_campaigns WHERE rule_id = $1`,
          [ruleId]
        )

        // Insert new campaigns
        if (body.campaignIds.length > 0) {
          const campaignIdsInt = body.campaignIds.map((id: string | number) => 
            typeof id === 'string' ? parseInt(id, 10) : id
          ).filter((id: number) => !isNaN(id))

          if (campaignIdsInt.length > 0) {
            let paramIndex = 1
            const placeholders = campaignIdsInt.map(() => `($${paramIndex++}, $${paramIndex++}, NOW())`).join(', ')
            const insertCampaignsQuery = `
              INSERT INTO automation_rule_campaigns (rule_id, campaign_id, created_at)
              VALUES ${placeholders}
            `
            const campaignParams = campaignIdsInt.flatMap(campaignId => [ruleId, campaignId])
            await connection.query(insertCampaignsQuery, campaignParams)
          }
        }
      }

      // Update usernames if provided
      if (body.usernames && Array.isArray(body.usernames)) {
        // Validate and filter usernames based on user role
        const validUsernames = body.usernames.filter((username: string) => 
          user.role === 'superadmin' || allowedUsernames.includes(username)
        );

        // Delete existing usernames
        await connection.query(
          `DELETE FROM automation_rule_usernames WHERE rule_id = $1`,
          [ruleId]
        )

        // Insert new usernames (only allowed ones)
        if (validUsernames.length > 0) {
          let paramIndex = 1
          const placeholders = validUsernames.map(() => `($${paramIndex++}, $${paramIndex++}, NOW())`).join(', ')
          const insertUsernamesQuery = `
            INSERT INTO automation_rule_usernames (rule_id, username, created_at)
            VALUES ${placeholders}
          `
          const usernameParams = validUsernames.flatMap(username => [ruleId, username])
          await connection.query(insertUsernamesQuery, usernameParams)
        }
      }

      // Commit transaction
      await connection.query('COMMIT')

      // Fetch updated rule with relations
      const updatedResult = await connection.query(
        `SELECT * FROM automation_rules WHERE rule_id = $1`,
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
