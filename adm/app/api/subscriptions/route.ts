import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

// GET - List all subscriptions
export async function GET(request: NextRequest) {
  try {
    // Check permission
    await requirePermission(request, 'canManageSubscriptions')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || ''
    const planId = searchParams.get('planId') || ''

    // Query from subscriptions table
    const result = await withDatabaseConnection(async (connection) => {
      // Get subscriptions with user details
      let query = `
        SELECT 
          s.id, s.user_id, s.plan_id, s.transaction_id,
          s.status, s.start_date, s.end_date, s.billing_cycle,
          s.base_amount, s.ppn_amount, s.total_amount,
          s.auto_renew, s.created_at, s.updated_at,
          s.cancelled_at, s.cancelled_by, s.cancellation_reason,
          u.username, u.email, u.nama_lengkap, u.status_user
        FROM subscriptions s
        LEFT JOIN data_user u ON s.user_id = u.user_id
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      if (status) {
        paramCount++
        query += ` AND s.status = $${paramCount}`
        params.push(status)
      }

      if (planId) {
        paramCount++
        query += ` AND s.plan_id = $${paramCount}`
        params.push(planId)
      }

      const offset = (page - 1) * limit
      query += ` ORDER BY s.created_at DESC`

      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(limit)

      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(offset)

      const subscriptionsResult = await connection.query(query, params)

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM subscriptions s
        WHERE 1=1
      `
      const countParams: any[] = []
      let countParamCount = 0

      if (status) {
        countParamCount++
        countQuery += ` AND s.status = $${countParamCount}`
        countParams.push(status)
      }

      if (planId) {
        countParamCount++
        countQuery += ` AND s.plan_id = $${countParamCount}`
        countParams.push(planId)
      }

      const countResult = await connection.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0]?.total || '0')

      // Map plan_id to plan name
      const planNameMap: { [key: string]: string } = {
        '1-month': 'Paket 1 Bulan',
        '3-month': 'Paket 3 Bulan',
        '6-month': 'Paket 6 Bulan',
      }

      // Map subscriptions
      const subscriptions = subscriptionsResult.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username || 'N/A',
        email: row.email || 'N/A',
        namaLengkap: row.nama_lengkap || null,
        planId: row.plan_id,
        planName: planNameMap[row.plan_id] || row.plan_id,
        transactionId: row.transaction_id,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        billingCycle: row.billing_cycle,
        baseAmount: parseFloat(row.base_amount || 0),
        ppnAmount: parseFloat(row.ppn_amount || 0),
        totalAmount: parseFloat(row.total_amount || 0),
        autoRenew: row.auto_renew || false,
        userStatus: row.status_user,
        cancelledAt: row.cancelled_at,
        cancelledBy: row.cancelled_by,
        cancellationReason: row.cancellation_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))

      return {
        subscriptions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error('Get subscriptions error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data subscriptions' },
      { status: 500 }
    )
  }
}

// POST - Create new subscription
export async function POST(request: NextRequest) {
  try {
    // Check permission
    const adminUser = await requirePermission(request, 'canManageSubscriptions')

    const body = await request.json()
    const { userId, planId, billingCycle, startDate, endDate, status, totalAmount } = body

    if (!userId || !planId) {
      return NextResponse.json(
        { success: false, error: 'User ID dan Plan ID harus diisi' },
        { status: 400 }
      )
    }

    const result = await withDatabaseConnection(async (connection) => {
      // 1. Get plan details to calculate default values if not provided
      const planResult = await connection.query(
        'SELECT * FROM subscription_plans WHERE plan_id = $1',
        [planId]
      )

      if (planResult.rows.length === 0) {
        throw new Error('Plan tidak ditemukan')
      }

      const plan = planResult.rows[0]
      const finalBillingCycle = billingCycle || plan.billing_cycle || 'monthly'
      const finalStartDate = startDate ? new Date(startDate) : new Date()

      let finalEndDate = endDate ? new Date(endDate) : null
      if (!finalEndDate) {
        const durationMonths = plan.duration_months || 1
        const durationDays = plan.duration_days || 0
        finalEndDate = new Date(finalStartDate)
        if (durationMonths > 0) {
          finalEndDate.setMonth(finalEndDate.getMonth() + durationMonths)
        }
        if (durationDays > 0) {
          finalEndDate.setDate(finalEndDate.getDate() + durationDays)
        }
      }

      const finalStatus = status || 'active'
      const finalTotalAmount = totalAmount !== undefined ? parseFloat(totalAmount) : parseFloat(plan.price || 0)

      // 2. If new sub is active, expire all other active subs for this user
      if (finalStatus === 'active') {
        await connection.query(
          `UPDATE subscriptions 
           SET status = 'expired', updated_at = NOW() 
           WHERE user_id = $1 AND status = 'active'`,
          [userId]
        )
      }

      // 3. Create new subscription
      const manualTransactionId = `MANUAL-ADM-${Date.now()}`
      const baseAmount = finalTotalAmount
      const ppnAmount = 0 // Manual admin subscriptions usually don't track PPN separately unless specified

      const insertResult = await connection.query(
        `INSERT INTO subscriptions (
          user_id, plan_id, status, start_date, end_date, 
          billing_cycle, total_amount, base_amount, ppn_amount, 
          transaction_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          planId,
          finalStatus,
          finalStartDate.toISOString(),
          finalEndDate.toISOString(),
          finalBillingCycle,
          finalTotalAmount,
          baseAmount,
          ppnAmount,
          manualTransactionId,
        ]
      )

      const newSub = insertResult.rows[0]

      // 4. Update user status to 'aktif' if sub is active
      if (finalStatus === 'active') {
        await connection.query(
          "UPDATE data_user SET status_user = 'aktif' WHERE user_id = $1",
          [userId]
        )
      }

      // 5. Log audit
      await logAudit({
        userId: adminUser.userId,
        userEmail: adminUser.email,
        userRole: adminUser.role,
        action: AuditActions.SUBSCRIPTION_CREATE,
        resourceType: ResourceTypes.SUBSCRIPTION,
        resourceId: newSub.id,
        resourceName: `Subscription #${newSub.id}`,
        description: `Created manual subscription for user ${userId}`,
        newValues: {
          userId,
          planId,
          status: finalStatus,
          startDate: finalStartDate.toISOString(),
          endDate: finalEndDate.toISOString(),
        },
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      })

      return newSub
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription berhasil dibuat',
      data: result,
    })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error('Create subscription error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat membuat subscription' },
      { status: 500 }
    )
  }
}

