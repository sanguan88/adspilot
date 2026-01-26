import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors'
import { getUserRole, checkPermission, checkCanAccessAll } from '@/lib/role-checker'

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null
  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);

    // ✅ ROLE CHECKING: Check if user has permission to view logs
    const role = getUserRole(user)
    const canViewAll = checkPermission(user, 'logs.view.all')
    const canViewOwn = checkPermission(user, 'logs.view.own')

    // User must have at least view.own permission
    if (!canViewOwn && !canViewAll) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Anda tidak memiliki permission untuk melihat logs.'
        },
        { status: 403 }
      )
    }

    // Log permission check for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RBAC] Logs access - Role: ${role}, CanViewAll: ${canViewAll}, CanViewOwn: ${canViewOwn}`)
    }

    const allowedUsernames = await getAllowedUsernames(user);
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const ruleFilter = searchParams.get('ruleFilter')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const campaignFilter = searchParams.get('campaignFilter')
    const tokoFilter = searchParams.get('tokoFilter')
    const sortField = searchParams.get('sortField') || 'timestamp'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = (page - 1) * limit

    // Get database connection
    try {
      connection = await getDatabaseConnection()
    } catch (dbError) {
      if (isDatabaseConnectionError(dbError)) {
        const sanitized = sanitizeErrorForLogging(dbError)
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
      throw dbError
    }

    // Query rule_execution_logs instead of data_rules to show individual execution logs
    // Build WHERE conditions for rule_execution_logs
    let logWhereConditions: string[] = []
    let logParams: any[] = []

    // Note: JOIN condition is in FROM clause, not WHERE clause

    // Filter by status
    if (status && status !== 'all') {
      // List of shops for filter UI
      let availableShops: { id: string, name: string }[] = []
      try {
        let shopsQuery = `SELECT DISTINCT rel.toko_id, dt.nama_toko 
                        FROM rule_execution_logs rel 
                        LEFT JOIN data_toko dt ON rel.toko_id = dt.id_toko`
        const shopsParams: any[] = []

        if (!canViewAll && allowedUsernames.length > 0) {
          const placeholders = allowedUsernames.map((_, i) => `$${i + 1}`).join(',')
          shopsQuery += ` WHERE rel.toko_id IN (${placeholders})`
          shopsParams.push(...allowedUsernames)
        }

        const shopsResult = await connection.query(shopsQuery, shopsParams)
        availableShops = shopsResult.rows.map((r: any) => ({
          id: r.toko_id,
          name: r.nama_toko || r.toko_id
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
      } catch (e) {
        console.error('Error fetching available shops:', e)
      }

      if (status && status !== 'all') {
        if (status === 'success') {
          logWhereConditions.push(`rel.status = 'success'`)
        } else if (status === 'failed') {
          logWhereConditions.push(`rel.status = 'failed'`)
        } else if (status === 'pending') {
          logWhereConditions.push(`rel.status = 'pending'`)
        }
      }

      // Search filter (on rule name, campaign name, or toko id)
      if (search) {
        logWhereConditions.push(`(dr.name ILIKE $${logParams.length + 1} OR dp.title ILIKE $${logParams.length + 1} OR rel.toko_id ILIKE $${logParams.length + 1})`)
        logParams.push(`%${search}%`)
      }

      // Date range filter
      if (dateFrom) {
        logWhereConditions.push(`rel.executed_at >= $${logParams.length + 1}`)
        logParams.push(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setDate(endDate.getDate() + 1)
        logWhereConditions.push(`rel.executed_at < $${logParams.length + 1}`)
        logParams.push(endDate.toISOString().split('T')[0])
      }

      // Filter by campaign ID
      if (campaignFilter && campaignFilter !== 'all-campaigns') {
        logWhereConditions.push(`rel.campaign_id = $${logParams.length + 1}`)
        logParams.push(campaignFilter)
      }

      // Filter by toko ID (from UI parameter 'tokoFilter')
      const tokoFilterFromUI = searchParams.get('tokoFilter')
      if (tokoFilterFromUI && tokoFilterFromUI !== 'all-tokos') {
        logWhereConditions.push(`rel.toko_id = $${logParams.length + 1}`)
        logParams.push(tokoFilterFromUI)
      }

      // Filter rules based on allowed toko IDs
      // If user does not have 'view all' permission, strictly filter by their allowed stores
      if (!canViewAll) {
        if (allowedUsernames.length > 0) {
          const placeholders = allowedUsernames.map((_, i) => `$${logParams.length + i + 1}`).join(',')
          logWhereConditions.push(`rel.toko_id IN (${placeholders})`)
          logParams.push(...allowedUsernames)
        } else {
          // If user cannot view all and has no assignments, return empty
          return NextResponse.json({
            success: true,
            data: [],
            total: 0
          })
        }
      }

      const logWhereClause = logWhereConditions.length > 0
        ? 'WHERE ' + logWhereConditions.join(' AND ')
        : ''

      // Check if rule_execution_logs table exists, if not return empty result
      try {
        const tableCheck = await connection.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'rule_execution_logs'
        )
      `)

        if (!tableCheck.rows[0]?.exists) {
          // Table doesn't exist yet, return empty result
          return NextResponse.json({
            success: true,
            data: [],
            total: 0
          })
        }
      } catch (tableCheckError) {
        console.error('Error checking table existence:', tableCheckError)
        // Continue anyway
      }

      // Get total count for pagination
      // Use separate params array for count query to avoid parameter conflicts
      const countParams = [...logParams]
      const countQuery = `
      SELECT COUNT(*) as total 
      FROM rule_execution_logs rel
      INNER JOIN data_rules dr ON rel.rule_id = dr.rule_id
      LEFT JOIN (
        SELECT DISTINCT ON (campaign_id, id_toko) campaign_id, id_toko, title
        FROM data_produk
        ORDER BY campaign_id, id_toko, no DESC
      ) dp ON rel.campaign_id::text = dp.campaign_id::text AND rel.toko_id::text = dp.id_toko::text
      ${logWhereClause}
    `

      let total = 0
      try {
        const countResult = await connection.query(countQuery, countParams)
        total = parseInt(countResult.rows[0]?.total || '0', 10)
      } catch (countError) {
        console.error('Error counting logs:', countError)
        return NextResponse.json({
          success: true,
          data: [],
          total: 0
        })
      }

      // Build ORDER BY clause
      let orderBy = 'rel.executed_at DESC'
      if (sortField === 'timestamp') {
        orderBy = sortOrder === 'asc'
          ? 'rel.executed_at ASC'
          : 'rel.executed_at DESC'
      } else if (sortField === 'rule') {
        orderBy = sortOrder === 'asc' ? 'dr.name ASC' : 'dr.name DESC'
      } else if (sortField === 'status') {
        orderBy = sortOrder === 'asc' ? 'rel.status ASC' : 'rel.status DESC'
      }

      // Query rule_execution_logs with rule information
      const query = `
      SELECT 
        rel.id as log_id,
        rel.rule_id,
        rel.campaign_id,
        rel.toko_id,
        rel.action_type,
        rel.status,
        rel.error_message,
        rel.execution_data,
        rel.executed_at,
        dr.name as rule_name,
        dr.deskripsi as rule_deskripsi,
        dr.category,
        dr.actions,
        dp.title as campaign_name
      FROM rule_execution_logs rel
      INNER JOIN data_rules dr ON rel.rule_id = dr.rule_id
      LEFT JOIN (
        SELECT DISTINCT ON (campaign_id, id_toko) campaign_id, id_toko, title
        FROM data_produk
        ORDER BY campaign_id, id_toko, no DESC -- Use latest entry if duplicates exist
      ) dp ON rel.campaign_id::text = dp.campaign_id::text AND rel.toko_id::text = dp.id_toko::text
      ${logWhereClause}
      ORDER BY ${orderBy}
      LIMIT $${logParams.length + 1} OFFSET $${logParams.length + 2}
    `
      // Create separate params array for the main query (includes limit and offset)
      const queryParams = [...logParams, limit, offset]

      let logRows: any[] = []
      try {
        const logResult = await connection.query(query, queryParams)
        logRows = logResult.rows || []
      } catch (queryError: any) {
        console.error('Error querying logs:', queryError)
        // Log the actual query for debugging
        console.error('Query:', query.replace(/\s+/g, ' ').trim())
        console.error('Params count:', queryParams.length)
        console.error('Where clause:', logWhereClause)

        // If it's a column error (like campaign_name missing or type mismatch), 
        // try fallback query without the join
        if (queryError?.code === '42703' || queryError?.message?.includes('column') || queryError?.message?.includes('type')) {
          console.error('Query error detected, trying fallback without campaign titles')
          const fallbackQuery = `
          SELECT 
            rel.id as log_id, rel.rule_id, rel.campaign_id, rel.toko_id, rel.action_type,
            rel.status, rel.error_message, rel.execution_data, rel.executed_at,
            dr.name as rule_name, dr.deskripsi as rule_deskripsi, dr.category, dr.actions
          FROM rule_execution_logs rel
          INNER JOIN data_rules dr ON rel.rule_id = dr.rule_id
          ${logWhereClause}
          ORDER BY ${orderBy}
          LIMIT $${logParams.length + 1} OFFSET $${logParams.length + 2}
        `
          const fallbackResult = await connection.query(fallbackQuery, queryParams)
          logRows = fallbackResult.rows || []
        } else {
          throw queryError
        }
      }

      if (!logRows || logRows.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0
        })
      }

      // Get unique toko IDs for lookup
      const allTokoIds = Array.from(new Set(logRows.map((row: any) => row.toko_id).filter(Boolean)))

      // Query nama_toko sekali saja
      const tokoNameMap = new Map<string, string>()
      if (allTokoIds.length > 0) {
        try {
          const tokoResult = await connection.query(
            'SELECT id_toko, nama_toko FROM data_toko WHERE id_toko = ANY($1::text[])',
            [allTokoIds]
          )
          for (const row of tokoResult.rows) {
            if (row.id_toko && row.nama_toko) {
              tokoNameMap.set(row.id_toko, row.nama_toko)
            }
          }
        } catch {
          // jika query gagal, fallback ke id_toko saat transform
        }
      }

      // Transform data ke format logs
      const logs = logRows.map((log: any) => {
        // Parse execution_data to check if it was skipped
        let executionData: any = null
        let isSkipped = false
        try {
          if (log.execution_data) {
            executionData = typeof log.execution_data === 'string'
              ? JSON.parse(log.execution_data)
              : log.execution_data
            isSkipped = executionData?.skipped === true
          }
        } catch (e) {
          // Ignore parse error
        }

        // Determine log status
        // If status is 'success' but execution_data indicates skipped, it's still 'success' but will show as skipped in UI
        let logStatus = log.status || 'pending'

        // Get action type from log or parse from rule actions
        let actionType = log.action_type || 'Unknown'
        try {
          if (!actionType || actionType === 'Unknown') {
            const actions = typeof log.actions === 'string' ? JSON.parse(log.actions) : log.actions
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

        // Get timestamp
        const timestamp = log.executed_at

        // Get account (toko) name
        const account = tokoNameMap.get(log.toko_id) || log.toko_id || 'No account assigned'

        // Target is primarily the ID for label, Name is sent separately for second line
        const target = `Iklan: ${log.campaign_id}`

        // Build details summary
        let detailsSummary = ''
        let passedCount = 0
        let failedCount = 0
        const totalConditions = executionData?.evaluations?.length || 0

        if (executionData?.evaluations && Array.isArray(executionData.evaluations)) {
          passedCount = executionData.evaluations.filter((e: any) => e.met).length
          failedCount = totalConditions - passedCount
        }

        if (isSkipped) {
          // Skipped: condition not met
          detailsSummary = `Dilewati - (${totalConditions} Kondisi: Terpenuhi ${passedCount}, Gagal ${failedCount})`
        } else if (log.status === 'failed') {
          // Failed: execution error
          const errorMsg = log.error_message || 'Aksi gagal dieksekusi'
          detailsSummary = `Gagal Eksekusi - ${errorMsg}`
        } else if (log.status === 'success') {
          // Success: action executed successfully
          detailsSummary = `Berhasil - (${totalConditions} Kondisi: Terpenuhi ${passedCount}, Gagal ${failedCount})`
        } else {
          detailsSummary = 'Status tidak diketahui'
        }

        return {
          id: log.log_id || `${log.rule_id}_${log.campaign_id}_${log.executed_at}`,
          timestamp: timestamp ? new Date(timestamp).toLocaleString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }) : 'N/A',
          rule: log.rule_name || 'Unknown Rule',
          action: actionType,
          target: target,
          status: log.status === 'success' ? 'Berhasil' : 'Gagal',
          details: detailsSummary,
          account: account,
          // Additional data for filtering and UI
          category: log.category,
          rule_id: log.rule_id,
          campaign_id: log.campaign_id,
          campaign_name: log.campaign_name,
          toko_id: log.toko_id,
          isSkipped: isSkipped, // Flag to indicate if this is a skipped execution
          errorMessage: log.error_message // Store error message for display
        }
      })

      return NextResponse.json({
        success: true,
        data: logs,
        total: total,
        availableShops: availableShops
      })

    } catch (error) {
      // Check if database connection error
      if (isDatabaseConnectionError(error)) {
        const sanitized = sanitizeErrorForLogging(error)
        const timestamp = new Date().toISOString()
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
        if (process.env.NODE_ENV === 'development') {
          console.error(`[DEBUG] Full error message: ${errorMsg}`)
        }

        return NextResponse.json(
          {
            success: true, // Return success true even on DB error but with empty data to prevent UI crash
            data: [],
            total: 0,
            error: getGenericDatabaseErrorMessage(),
            debug: process.env.NODE_ENV === 'development' ? errorMsg : undefined
          },
          { status: 200 } // Changed to 200 with empty data and error info to be more resilient
        )
      }

      const sanitized = sanitizeErrorForLogging(error)
      const timestamp = new Date().toISOString()
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[${timestamp}] Error fetching logs: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
      if (process.env.NODE_ENV === 'development') {
        console.error(`[DEBUG] Full error message: ${errorMsg}`)
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch logs'
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
