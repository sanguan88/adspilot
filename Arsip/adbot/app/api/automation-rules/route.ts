import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getRoleBasedFilter } from '@/lib/role-filter'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { randomUUID } from 'crypto'
import { sanitizeErrorForLogging, isDatabaseConnectionError, getGenericDatabaseErrorMessage } from '@/lib/db-errors'
import { validateAutomationRulesLimit, validateCampaignAssignments } from '@/lib/subscription-limits'

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null
  const timestamp = new Date().toISOString()

  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    console.log(`[${timestamp}] [Create Rule] User authenticated:`, {
      userId: (user as any).userId || (user as any).user_id,
      username: (user as any).username,
      role: user.role
    })
    
    const body = await request.json()
    console.log(`[${timestamp}] [Create Rule] Request body received:`, {
      name: body.name,
      category: body.category,
      priority: body.priority,
      precisionMode: body.precisionMode,
      executionMode: body.executionMode,
      selectedInterval: body.selectedInterval,
      usernamesCount: body.usernames?.length || 0,
      campaignIdsCount: body.campaignIds?.length || 0,
      actionsCount: body.actions?.length || 0,
      ruleGroupsCount: body.ruleGroups?.length || 0
    })
    
    const {
      name,
      description,
      category,
      priority,
      precisionMode,
      executionMode,
      selectedTimes,
      selectedDays,
      selectedDates,
      dateTimeMap,
      selectedInterval,
      customInterval,
      ruleGroups,
      conditionGroups,
      actions,
      telegramNotification,
      campaignIds = [],
      usernames = [],
      campaignAssignments = []
    } = body

    // Validate required fields
    if (!name || !category) {
      console.error(`[${timestamp}] [Create Rule] Validation failed:`, {
        hasName: !!name,
        hasCategory: !!category
      })
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // Generate UUID untuk rule_id
    const ruleId = randomUUID()
    console.log(`[${timestamp}] [Create Rule] Generated rule_id:`, ruleId)

    // Convert campaignIds to integers (handle both string and number)
    const campaignIdsInt = campaignIds.map((id: string | number) => 
      typeof id === 'string' ? parseInt(id, 10) : id
    ).filter((id: number) => !isNaN(id))
    console.log(`[${timestamp}] [Create Rule] Campaign IDs converted:`, {
      original: campaignIds,
      converted: campaignIdsInt
    })

    // Prepare JSON data
    const conditionsJson = ruleGroups ? JSON.stringify(ruleGroups) : null
    const actionsJson = actions ? JSON.stringify(actions) : null
    const selectedTimesJson = selectedTimes && selectedTimes.length > 0 ? JSON.stringify(selectedTimes) : null
    const selectedDaysJson = selectedDays && selectedDays.length > 0 ? JSON.stringify(selectedDays) : null
    const selectedDatesJson = selectedDates && selectedDates.length > 0 ? JSON.stringify(selectedDates) : null
    const dateTimeMapJson = dateTimeMap && Object.keys(dateTimeMap).length > 0 ? JSON.stringify(dateTimeMap) : null
    console.log(`[${timestamp}] [Create Rule] JSON data prepared:`, {
      conditionsLength: conditionsJson?.length || 0,
      actionsLength: actionsJson?.length || 0,
      selectedTimesLength: selectedTimesJson?.length || 0,
      selectedDaysLength: selectedDaysJson?.length || 0,
      selectedDatesLength: selectedDatesJson?.length || 0,
      dateTimeMapLength: dateTimeMapJson?.length || 0
    })

    // Get database connection
    console.log(`[${timestamp}] [Create Rule] Getting database connection...`)
    connection = await getDatabaseConnection()
    console.log(`[${timestamp}] [Create Rule] Database connection established`)
    
    // Start transaction
    await connection.query('BEGIN')
    console.log(`[${timestamp}] [Create Rule] Transaction started`)

    try {
      // Get user_id (VARCHAR) from token
      // Handle both old token format (number/no) and new format (string/user_id)
      let userId: string = ''
      
      if (typeof user.userId === 'string') {
        // New format: user_id (VARCHAR) as string
        userId = user.userId
      } else if (typeof user.userId === 'number') {
        // Old format: no (INTEGER) - need to query user_id from database
        console.log(`[${timestamp}] [Create Rule] Old token format detected (number), querying user_id from database...`)
        const userNo = user.userId
        const userResult = await connection.query(
          'SELECT user_id FROM data_user WHERE no = $1',
          [userNo]
        )
        
        if (!userResult.rows || userResult.rows.length === 0) {
          console.error(`[${timestamp}] [Create Rule] User not found in database with no:`, userNo)
          throw new Error(`User tidak ditemukan di database. Silakan login ulang.`);
        }
        
        userId = userResult.rows[0].user_id
        console.log(`[${timestamp}] [Create Rule] Converted user_id from no:`, { no: userNo, user_id: userId })
      } else {
        // Fallback
        userId = (user as any).user_id || ''
      }
      
      console.log(`[${timestamp}] [Create Rule] User ID (VARCHAR):`, userId, `(type: ${typeof userId})`)
      
      if (!userId) {
        console.error(`[${timestamp}] [Create Rule] User ID not found in token`)
        throw new Error(`User ID tidak ditemukan. Silakan login ulang.`);
      }
      
      // Get id_toko from usernames (validate and filter)
      console.log(`[${timestamp}] [Create Rule] Validating usernames...`, {
        usernamesProvided: usernames,
        userRole: user.role,
        userId: userId
      })
      const allowedTokoIds = await getAllowedUsernames(user);
      console.log(`[${timestamp}] [Create Rule] Allowed toko IDs:`, allowedTokoIds, `(count: ${allowedTokoIds.length})`)
      
      // For case-insensitive comparison
      const allowedTokoIdsLower = allowedTokoIds.map((id: string) => id.toLowerCase())
      const validTokoIds = usernames.filter((tokoId: string) => 
        allowedTokoIds.includes(tokoId) || allowedTokoIdsLower.includes(tokoId.toLowerCase())
      );
      console.log(`[${timestamp}] [Create Rule] Valid toko IDs:`, validTokoIds, `(count: ${validTokoIds.length})`)
      
      if (validTokoIds.length === 0 && user.role !== 'superadmin') {
        console.error(`[${timestamp}] [Create Rule] No valid toko IDs provided`, {
          usernamesProvided: usernames,
          allowedTokoIds: allowedTokoIds,
          userRole: user.role,
          userId: userId,
          userObject: { userId: user.userId, username: user.username, email: user.email }
        })
        
        // Provide more helpful error message
        if (allowedTokoIds.length === 0) {
          throw new Error(`User tidak memiliki akses ke toko manapun. User ID: ${userId}, Role: ${user.role}. Silakan hubungi administrator untuk memberikan akses.`);
        } else {
          throw new Error(`Toko yang dipilih (${usernames.join(', ')}) tidak tersedia untuk user ini. Toko yang tersedia: ${allowedTokoIds.join(', ')}`);
        }
      }
      
      // Prepare campaign_assignments (mapping toko-campaign)
      // Format: {toko1: ["campaign1", "campaign2"], toko2: ["campaign3", "campaign4", "campaign5"]}
      let campaignAssignmentsJson = '{}'
      let finalCampaignAssignments: Record<string, string[]> = {}
      
      if (campaignAssignments && Object.keys(campaignAssignments).length > 0) {
        // Use provided campaignAssignments (already in correct format)
        finalCampaignAssignments = campaignAssignments
        console.log(`[${timestamp}] [Create Rule] Using provided campaignAssignments:`, campaignAssignments)
      } else {
        // Fallback: create mapping from campaignIds and usernames
        // Group campaigns by toko
        const assignments: Record<string, string[]> = {}
        if (validTokoIds.length > 0 && campaignIdsInt.length > 0) {
          // Distribute campaigns to toko (simple: first toko gets all if no mapping provided)
          assignments[validTokoIds[0]] = campaignIdsInt.map((id: number) => id.toString())
        }
        finalCampaignAssignments = assignments
        console.log(`[${timestamp}] [Create Rule] Generated campaignAssignments:`, assignments)
      }

      // Validate campaign assignments (check if campaigns exist and belong to user)
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

      // Insert automation rule
      // Note: created_at and update_at have DEFAULT CURRENT_TIMESTAMP, so we don't need to include them
      const insertRuleQuery = `
        INSERT INTO data_rules (
          user_id, campaign_assignments, rule_id, name, deskripsi, status, category, priority,
          triggers, success_rate, error_count, conditions, actions,
          telegram_notification, precision_mode, execution_mode,
          selected_times, selected_days, selected_interval, selected_dates, date_time_map
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `

      // Convert precisionMode from string to boolean
      // "critical" -> true, "standard" -> false
      const precisionModeBool = precisionMode === "critical" || precisionMode === true
      console.log(`[${timestamp}] [Create Rule] Precision mode converted:`, {
        original: precisionMode,
        converted: precisionModeBool
      })

      // Convert selectedInterval from string to integer (in seconds)
      // Examples: "5 menit" -> 300, "60 detik" -> 60, "1 jam" -> 3600
      let selectedIntervalInt: number | null = null
      if (selectedInterval) {
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
        } else {
          // Try to parse as number (assume seconds)
          const num = parseInt(intervalStr.replace(/\D/g, ''))
          selectedIntervalInt = isNaN(num) ? null : num
        }
      }
      console.log(`[${timestamp}] [Create Rule] Selected interval converted:`, {
        original: selectedInterval,
        converted: selectedIntervalInt
      })

      // Prepare insert parameters
      const insertParams = [
        userId,
        campaignAssignmentsJson, // campaign_assignments (JSONB) - format: {toko: [campaigns]}
        ruleId,
        name,
        description || null,
        'draft',
        category,
        priority || 0,
        0, // triggers
        0, // success_rate
        0, // error_count
        conditionsJson,
        actionsJson,
        telegramNotification || false,
        precisionModeBool,
        executionMode || 'auto',
        selectedTimesJson,
        selectedDaysJson,
        selectedIntervalInt,
        selectedDatesJson,
        dateTimeMapJson
      ]
      console.log(`[${timestamp}] [Create Rule] Insert parameters prepared:`, {
        userId,
        ruleId,
        name,
        category,
        priority: priority || 0,
        precisionMode: precisionModeBool,
        executionMode: executionMode || 'auto',
        selectedInterval: selectedIntervalInt,
        campaignAssignmentsLength: campaignAssignmentsJson.length,
        conditionsLength: conditionsJson?.length || 0,
        actionsLength: actionsJson?.length || 0
      })

      console.log(`[${timestamp}] [Create Rule] Executing INSERT query...`)
      await connection.query(insertRuleQuery, insertParams)
      console.log(`[${timestamp}] [Create Rule] INSERT query executed successfully`)

      // Commit transaction
      console.log(`[${timestamp}] [Create Rule] Committing transaction...`)
      await connection.query('COMMIT')
      console.log(`[${timestamp}] [Create Rule] Transaction committed successfully`)

      // Fetch the created rule
      console.log(`[${timestamp}] [Create Rule] Fetching created rule with rule_id:`, ruleId)
      const ruleResult = await connection.query(
        `SELECT * FROM data_rules WHERE rule_id = $1`,
        [ruleId]
      )
      const ruleRows = ruleResult.rows
      console.log(`[${timestamp}] [Create Rule] Rule fetch result:`, {
        found: ruleRows.length > 0,
        ruleId: ruleRows[0]?.rule_id
      })

      if (!ruleRows || ruleRows.length === 0) {
        console.error(`[${timestamp}] [Create Rule] Failed to retrieve created rule after insert`)
        throw new Error('Failed to retrieve created rule')
      }

      const rule = ruleRows[0]
      
      // Helper function to safely parse JSON
      const safeJsonParse = (value: any, defaultValue: any = null) => {
        if (!value) return defaultValue
        if (typeof value === 'string') {
          try {
            return JSON.parse(value)
          } catch (e) {
            return defaultValue
          }
        }
        // Already an object/array
        return value
      }
      
      // Parse campaign_assignments to generate lists for response
      let responseCampaignAssignments: Record<string, string[]> = {}
      let responseUsernames: string[] = []
      let responseCampaigns: string[] = []
      
      try {
        if (rule.campaign_assignments) {
          responseCampaignAssignments = safeJsonParse(rule.campaign_assignments, {})
          responseUsernames = Object.keys(responseCampaignAssignments)
          responseCampaigns = Object.values(responseCampaignAssignments).flat()
        } else {
          // Fallback: empty if no campaign_assignments
          responseUsernames = []
          responseCampaigns = []
          responseCampaignAssignments = {}
        }
      } catch (e) {
        // If parsing fails, return empty
        responseUsernames = []
        responseCampaigns = []
        responseCampaignAssignments = {}
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
          conditions: safeJsonParse(rule.conditions, []),
          actions: safeJsonParse(rule.actions, []),
          telegram_notification: Boolean(rule.telegram_notification),
          precision_mode: rule.precision_mode,
          execution_mode: rule.execution_mode,
          selected_times: safeJsonParse(rule.selected_times, []),
          selected_days: safeJsonParse(rule.selected_days, []),
          selected_dates: safeJsonParse(rule.selected_dates, []),
          dateTimeMap: safeJsonParse(rule.date_time_map, {}),
          selected_interval: rule.selected_interval,
          user_id: rule.user_id,
          // Parse campaign_assignments and generate lists for backward compatibility
          campaignAssignments: responseCampaignAssignments,
          id_toko_list: responseUsernames,
          campaign_id_list: responseCampaigns,
          campaignIds: responseCampaigns,
          usernames: responseUsernames,
          triggers: rule.triggers,
          success_rate: Number(rule.success_rate),
          error_count: rule.error_count,
          created_at: rule.created_at,
          updated_at: rule.update_at
        },
        message: 'Automation rule created successfully'
      })

    } catch (error) {
      // Rollback transaction on error
      console.error(`[${timestamp}] [Create Rule] Error in transaction, rolling back...`)
      if (connection) {
        try {
        await connection.query('ROLLBACK')
          console.log(`[${timestamp}] [Create Rule] Transaction rolled back`)
        } catch (rollbackError) {
          console.error(`[${timestamp}] [Create Rule] Error during rollback:`, {
            message: (rollbackError as any)?.message,
            code: (rollbackError as any)?.code
          })
        }
      }
      
      // Log detailed error information
      const errorDetails = {
        message: (error as any)?.message,
        code: (error as any)?.code,
        name: (error as any)?.name,
        stack: (error as any)?.stack,
        detail: (error as any)?.detail,
        hint: (error as any)?.hint,
        position: (error as any)?.position,
        internalPosition: (error as any)?.internalPosition,
        internalQuery: (error as any)?.internalQuery,
        where: (error as any)?.where,
        schema: (error as any)?.schema,
        table: (error as any)?.table,
        column: (error as any)?.column,
        dataType: (error as any)?.dataType,
        constraint: (error as any)?.constraint
      }
      console.error(`[${timestamp}] [Create Rule] Detailed error information:`, errorDetails)
      
      throw error
    }

  } catch (error) {
    const errorTimestamp = new Date().toISOString()
    const sanitized = sanitizeErrorForLogging(error)
    
    // Log comprehensive error information
    const errorDetails = {
      type: sanitized.type,
      code: (error as any)?.code || sanitized.code,
      message: (error as any)?.message,
      name: (error as any)?.name,
      // PostgreSQL specific errors
      detail: (error as any)?.detail,
      hint: (error as any)?.hint,
      position: (error as any)?.position,
      internalPosition: (error as any)?.internalPosition,
      internalQuery: (error as any)?.internalQuery,
      where: (error as any)?.where,
      schema: (error as any)?.schema,
      table: (error as any)?.table,
      column: (error as any)?.column,
      dataType: (error as any)?.dataType,
      constraint: (error as any)?.constraint,
      // Stack trace for debugging
      stack: process.env.NODE_ENV === 'development' ? (error as any)?.stack : undefined
    }
    
    console.error(`[${errorTimestamp}] [Create Rule] Error creating automation rule:`, errorDetails)
    
    // Check if it's a database connection error
    if (isDatabaseConnectionError(error)) {
      console.error(`[${errorTimestamp}] [Create Rule] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
      return NextResponse.json(
        { 
          success: false,
          error: getGenericDatabaseErrorMessage(),
          ...(process.env.NODE_ENV === 'development' && { 
            errorDetails: {
              type: errorDetails.type,
              code: errorDetails.code,
              message: errorDetails.message
            }
          })
        },
        { status: 503 }
      )
    }
    
    // Check if it's a PostgreSQL query error
    const isPostgresError = (error as any)?.code && typeof (error as any).code === 'string' && (error as any).code.match(/^[0-9A-Z]{5}$/)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Gagal membuat automation rule. Silakan coba lagi.',
        ...(process.env.NODE_ENV === 'development' && {
          errorDetails: {
            type: errorDetails.type,
            code: errorDetails.code,
            message: errorDetails.message,
            detail: errorDetails.detail,
            hint: errorDetails.hint,
            table: errorDetails.table,
            column: errorDetails.column,
            constraint: errorDetails.constraint,
            isPostgresError
          }
        })
      },
      { status: 500 }
    )
  } finally {
    // Close connection
    if (connection) {
      try {
      connection.release()
        console.log(`[${new Date().toISOString()}] [Create Rule] Database connection released`)
      } catch (releaseError) {
        console.error(`[${new Date().toISOString()}] [Create Rule] Error releasing connection:`, {
          message: (releaseError as any)?.message
        })
      }
    }
  }
}

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    // Get database connection early (reuse for all queries) with error handling
    try {
      connection = await getDatabaseConnection()
    } catch (dbError) {
      // If connection error, return appropriate response
      if (isDatabaseConnectionError(dbError)) {
        const sanitized = sanitizeErrorForLogging(dbError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
        return NextResponse.json(
          {
            success: false,
            error: getGenericDatabaseErrorMessage(),
          },
          { status: 503 }
        );
      }
      throw dbError;
    }
    
    // Get allowed usernames only for non-admin users (optimize: skip for admin/superadmin)
    let allowedUsernames: string[] = []
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      try {
        // Reuse existing connection instead of creating new one
        const allowedTokoResult = await connection.query(
          'SELECT DISTINCT id_toko FROM data_toko WHERE user_id = $1',
          [user.userId.toString()]
        )
        allowedUsernames = allowedTokoResult.rows.map((row: any) => row.id_toko).filter((id_toko: string) => id_toko)
        
        // Early return if no allowed usernames
        if (allowedUsernames.length === 0) {
          if (connection) {
            try {
              connection.release()
            } catch (releaseError) {
              // Ignore release error
            }
          }
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
      } catch (queryError: any) {
        // Handle query errors (including connection terminated)
        if (queryError?.message?.includes('Connection terminated') || isDatabaseConnectionError(queryError)) {
          if (connection) {
            try {
              connection.release()
            } catch (releaseError) {
              // Ignore release error
            }
            connection = null
          }
          const sanitized = sanitizeErrorForLogging(queryError);
          const timestamp = new Date().toISOString();
          console.error(`[${timestamp}] Database query error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
          
          return NextResponse.json(
            {
              success: false,
              error: 'Database tidak dapat diakses saat ini. Silakan coba lagi dalam beberapa saat.',
            },
            { status: 503 }
          );
        }
        throw queryError;
      }
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
      whereConditions.push(`dr.status = $${paramIndex++}`)
      params.push(status)
    }
    if (category && category !== 'all') {
      whereConditions.push(`dr.category = $${paramIndex++}`)
      params.push(category)
    }

    // User isolation: Filter by user_id (unless admin/superadmin)
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      whereConditions.push(`dr.user_id = $${paramIndex++}`)
      params.push(user.userId)
    
      // Filter rules based on allowed toko IDs (only if needed)
      // Use simpler query if possible - check if campaign_assignments has matching keys
      if (allowedUsernames.length > 0) {
      const placeholders = allowedUsernames.map(() => `$${paramIndex++}`).join(',')
        whereConditions.push(`(
          dr.campaign_assignments IS NULL OR
          dr.campaign_assignments = '{}'::jsonb OR
          EXISTS (
        SELECT 1 FROM jsonb_object_keys(COALESCE(dr.campaign_assignments, '{}'::jsonb)) AS toko_id 
        WHERE toko_id IN (${placeholders})
          )
      )`)
      params.push(...allowedUsernames)
      }
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Get total count with error handling
    let countResult
    let total = 0
    try {
      countResult = await connection.query(
      `SELECT COUNT(DISTINCT dr.rule_id) as total FROM data_rules dr ${whereClause}`,
      params
    )
      total = countResult.rows[0]?.total || 0
    } catch (queryError: any) {
      // Handle query errors (including connection terminated)
      if (queryError?.message?.includes('Connection terminated') || isDatabaseConnectionError(queryError)) {
        if (connection) {
          try {
            connection.release()
          } catch (releaseError) {
            // Ignore release error
          }
          connection = null
        }
        const sanitized = sanitizeErrorForLogging(queryError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Database query error (count): ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
        return NextResponse.json(
          {
            success: false,
            error: 'Database tidak dapat diakses saat ini. Silakan coba lagi dalam beberapa saat.',
          },
          { status: 503 }
        );
      }
      throw queryError;
    }

    // Fetch rules with pagination (include campaign_assignments JSONB column) with error handling
    let ruleResult
    let ruleRows
    try {
      ruleResult = await connection.query(
      `SELECT DISTINCT dr.rule_id, dr.name, dr.deskripsi, dr.status, dr.category, dr.priority, 
              dr.triggers, dr.success_rate, dr.error_count, dr.conditions, dr.actions,
              dr.telegram_notification, dr.precision_mode, dr.execution_mode,
              dr.selected_times, dr.selected_days, dr.selected_interval,
              dr.selected_dates, dr.date_time_map,
              dr.user_id, dr.campaign_assignments,
              dr.created_at, dr.update_at
       FROM data_rules dr ${whereClause} ORDER BY dr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, skip]
    )
      ruleRows = ruleResult.rows
    } catch (queryError: any) {
      // Handle query errors (including connection terminated)
      if (queryError?.message?.includes('Connection terminated') || isDatabaseConnectionError(queryError)) {
        if (connection) {
          try {
            connection.release()
          } catch (releaseError) {
            // Ignore release error
          }
          connection = null
        }
        const sanitized = sanitizeErrorForLogging(queryError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Database query error (fetch rules): ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
        return NextResponse.json(
          {
            success: false,
            error: 'Database tidak dapat diakses saat ini. Silakan coba lagi dalam beberapa saat.',
          },
          { status: 503 }
        );
      }
      throw queryError;
    }

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

    // Helper function to safely parse JSON (for GET endpoint)
    const safeJsonParse = (value: any, defaultValue: any = null) => {
      if (!value) return defaultValue
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch (e) {
          return defaultValue
        }
      }
      // Already an object/array
      return value
    }

    // Transform the data untuk frontend
    const transformedRules = ruleRows.map(rule => {
      const ruleId = rule.rule_id
      
      // Parse conditions untuk menghitung jumlah
      let conditionsCount = 0
      try {
        if (rule.conditions) {
          const parsedConditions = safeJsonParse(rule.conditions, [])
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
          const parsedActions = safeJsonParse(rule.actions, [])
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

      // Parse campaign_assignments and extract toko and campaign lists
      // Format: {toko1: ["campaign1", "campaign2"], toko2: ["campaign3", "campaign4", "campaign5"]}
      let campaignAssignments: Record<string, string[]> = {}
      let campaigns: string[] = []
      let usernames: string[] = []
      
      try {
        if (rule.campaign_assignments) {
          campaignAssignments = safeJsonParse(rule.campaign_assignments, {})
          
          // Extract toko list from keys
          usernames = Object.keys(campaignAssignments)
          
          // Extract all campaigns from values (flatten arrays)
          campaigns = Object.values(campaignAssignments).flat()
        } else {
          // Fallback: empty if no campaign_assignments
          usernames = []
          campaigns = []
          campaignAssignments = {}
        }
      } catch (e) {
        // If parsing fails, return empty
        usernames = []
        campaigns = []
        campaignAssignments = {}
      }

      // Parse ruleGroups for tooltip
      let ruleGroups = []
      try {
        if (rule.conditions) {
          const parsedConditions = safeJsonParse(rule.conditions, [])
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
          const parsedActionsDetail = safeJsonParse(rule.actions, [])
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
        description: rule.deskripsi,
        category: rule.category,
        priority: rule.priority,
        status: rule.status,
        triggers: Number(rule.triggers) || 0,
        successRate: Number(rule.success_rate || 0),
        errorCount: Number(rule.error_count) || 0,
        conditions: conditionsCount,
        actions: actionsList,
        accounts: usernames, // For backward compatibility
        assignments: {
          accountIds: usernames,
          campaignIds: campaigns.map(c => c.toString()),
          totalAccounts: usernames.length,
          totalCampaigns: campaigns.length
        },
        // campaign_assignments dalam format {toko: [campaigns]}
        campaignAssignments: campaignAssignments,
        // Generate id_toko_list and campaign_id_list for backward compatibility
        id_toko_list: usernames,
        campaign_id_list: campaigns.map(c => c.toString()),
        createdAt: rule.created_at ? new Date(rule.created_at).toISOString() : new Date().toISOString(),
        updatedAt: rule.update_at ? new Date(rule.update_at).toISOString() : new Date().toISOString(),
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

  } catch (error: any) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    
    // Check if it's a database connection error or connection terminated
    const isConnectionTerminated = error?.message?.includes('Connection terminated') ||
      (error?.code === 'UNKNOWN' && error?.message?.includes('Connection'))
    
    if (isDatabaseConnectionError(error) || isConnectionTerminated) {
      console.error(`[${timestamp}] Database connection error fetching automation rules: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
      console.error(`[${timestamp}] Error details:`, {
        code: error?.code,
        message: error?.message,
        isConnectionTerminated
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Database tidak dapat diakses saat ini. Silakan coba lagi dalam beberapa saat.'
        },
        { status: 503 }
      )
    }
    
    console.error(`[${timestamp}] Error fetching automation rules: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    return NextResponse.json(
      { 
        success: false,
        error: 'Gagal memuat automation rules. Silakan coba lagi.'
      },
      { status: 500 }
    )
  } finally {
    // Close connection safely
    if (connection) {
      try {
      connection.release()
      } catch (releaseError) {
        // Ignore release error - connection mungkin sudah terputus
        console.error('[Automation Rules] Error releasing connection in finally:', releaseError)
      }
    }
  }
}
