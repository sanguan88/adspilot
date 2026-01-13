import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser, requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

// GET - Get subscription by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  let connection = null

  try {
    const { subscriptionId } = params
    const adminUser = await getAdminUser(request)

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    connection = await getDatabaseConnection()

    const result = await connection.query(
      `SELECT 
        s.id, s.user_id, s.plan_id, s.transaction_id,
        s.status, s.start_date, s.end_date, s.billing_cycle,
        s.base_amount, s.ppn_amount, s.total_amount,
        s.auto_renew, s.created_at, s.updated_at,
        s.cancelled_at, s.cancelled_by, s.cancellation_reason,
        u.username, u.email, u.nama_lengkap
      FROM subscriptions s
      LEFT JOIN data_user u ON s.user_id = u.user_id
      WHERE s.id = $1`,
      [subscriptionId]
    )

    if (result.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Subscription tidak ditemukan' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const subscription = {
      id: row.id,
      userId: row.user_id,
      username: row.username || 'N/A',
      email: row.email || 'N/A',
      namaLengkap: row.nama_lengkap || null,
      planId: row.plan_id,
      transactionId: row.transaction_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      billingCycle: row.billing_cycle,
      baseAmount: parseFloat(row.base_amount || 0),
      ppnAmount: parseFloat(row.ppn_amount || 0),
      totalAmount: parseFloat(row.total_amount || 0),
      autoRenew: row.auto_renew || false,
      cancelledAt: row.cancelled_at,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    connection.release()

    return NextResponse.json({
      success: true,
      data: subscription,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data subscription' },
      { status: 500 }
    )
  }
}

// PUT - Update subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  let connection = null

  try {
    const { subscriptionId } = params
    const body = await request.json()

    // Require admin permission
    const adminUser = await requirePermission(request, 'canManageSubscriptions')

    const {
      planId,
      status,
      startDate,
      endDate,
      billingCycle,
      autoRenew,
    } = body

    connection = await getDatabaseConnection()

    // Get current subscription to validate and for audit
    const currentResult = await connection.query(
      `SELECT id, user_id, plan_id, status, start_date, end_date, billing_cycle, auto_renew FROM subscriptions WHERE id = $1`,
      [subscriptionId]
    )

    if (currentResult.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Subscription tidak ditemukan' },
        { status: 404 }
      )
    }

    const currentSubscription = currentResult.rows[0]

    // Validate status
    if (status && !['active', 'expired', 'cancelled', 'suspended'].includes(status)) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Status tidak valid' },
        { status: 400 }
      )
    }

    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Start date tidak boleh lebih besar dari end date' },
        { status: 400 }
      )
    }

    // Build update query dynamically
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 0

    if (planId !== undefined) {
      paramCount++
      updateFields.push(`plan_id = $${paramCount}`)
      updateValues.push(planId)
    }

    if (status !== undefined) {
      paramCount++
      updateFields.push(`status = $${paramCount}`)
      updateValues.push(status)

      // If status changed to cancelled, set cancelled_at and cancelled_by
      if (status === 'cancelled' && currentSubscription.status !== 'cancelled') {
        paramCount++
        updateFields.push(`cancelled_at = NOW()`)
        paramCount++
        updateFields.push(`cancelled_by = $${paramCount}`)
        updateValues.push(adminUser.userId)
      }

      // If status changed from cancelled, clear cancelled fields
      if (status !== 'cancelled' && currentSubscription.status === 'cancelled') {
        updateFields.push(`cancelled_at = NULL`)
        updateFields.push(`cancelled_by = NULL`)
        updateFields.push(`cancellation_reason = NULL`)
      }
    }

    if (startDate !== undefined) {
      paramCount++
      updateFields.push(`start_date = $${paramCount}`)
      updateValues.push(startDate)
    }

    if (endDate !== undefined) {
      paramCount++
      updateFields.push(`end_date = $${paramCount}`)
      updateValues.push(endDate)
    }

    if (billingCycle !== undefined) {
      paramCount++
      updateFields.push(`billing_cycle = $${paramCount}`)
      updateValues.push(billingCycle)
    }

    if (autoRenew !== undefined) {
      paramCount++
      updateFields.push(`auto_renew = $${paramCount}`)
      updateValues.push(autoRenew)
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`)

    if (updateFields.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Tidak ada field yang diupdate' },
        { status: 400 }
      )
    }

    // Add subscriptionId to params
    paramCount++
    updateValues.push(subscriptionId)

    const updateQuery = `
      UPDATE subscriptions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    const updateResult = await connection.query(updateQuery, updateValues)

    // If status changed to active, ensure only one active subscription per user
    if (status === 'active' && currentSubscription.status !== 'active') {
      await connection.query(
        `UPDATE subscriptions 
         SET status = 'expired', updated_at = NOW()
         WHERE user_id = $1 AND id != $2 AND status = 'active'`,
        [currentSubscription.user_id, subscriptionId]
      )
    }

    // Update user status if subscription status changed
    if (status && status !== currentSubscription.status) {
      if (status === 'active') {
        await connection.query(
          `UPDATE data_user SET status_user = 'aktif' WHERE user_id = $1`,
          [currentSubscription.user_id]
        )
      } else if (status === 'expired' || status === 'cancelled') {
        await connection.query(
          `UPDATE data_user SET status_user = 'inactive' WHERE user_id = $1`,
          [currentSubscription.user_id]
        )
      }
    }

    const updatedRow = updateResult.rows[0]
    const updatedSubscription = {
      id: updatedRow.id,
      userId: updatedRow.user_id,
      planId: updatedRow.plan_id,
      status: updatedRow.status,
      startDate: updatedRow.start_date,
      endDate: updatedRow.end_date,
      billingCycle: updatedRow.billing_cycle,
      autoRenew: updatedRow.auto_renew,
      updatedAt: updatedRow.updated_at,
    }

    // Log audit with old and new values
    const oldValues: Record<string, any> = {}
    const newValues: Record<string, any> = {}

    if (planId !== undefined && planId !== currentSubscription.plan_id) {
      oldValues.planId = currentSubscription.plan_id
      newValues.planId = planId
    }
    if (status !== undefined && status !== currentSubscription.status) {
      oldValues.status = currentSubscription.status
      newValues.status = status
    }
    if (startDate !== undefined && startDate !== currentSubscription.start_date) {
      oldValues.startDate = currentSubscription.start_date
      newValues.startDate = startDate
    }
    if (endDate !== undefined && endDate !== currentSubscription.end_date) {
      oldValues.endDate = currentSubscription.end_date
      newValues.endDate = endDate
    }
    if (billingCycle !== undefined && billingCycle !== currentSubscription.billing_cycle) {
      oldValues.billingCycle = currentSubscription.billing_cycle
      newValues.billingCycle = billingCycle
    }
    if (autoRenew !== undefined && autoRenew !== currentSubscription.auto_renew) {
      oldValues.autoRenew = currentSubscription.auto_renew
      newValues.autoRenew = autoRenew
    }

    await logAudit({
      userId: adminUser.userId,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: status === 'cancelled' ? AuditActions.SUBSCRIPTION_CANCEL : AuditActions.SUBSCRIPTION_UPDATE,
      resourceType: ResourceTypes.SUBSCRIPTION,
      resourceId: subscriptionId,
      resourceName: `Subscription #${subscriptionId}`,
      description: `Updated subscription for user ${currentSubscription.user_id}`,
      oldValues: Object.keys(oldValues).length > 0 ? oldValues : undefined,
      newValues: Object.keys(newValues).length > 0 ? newValues : undefined,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    })

    connection.release()

    return NextResponse.json({
      success: true,
      message: 'Subscription berhasil diupdate',
      data: updatedSubscription,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Update subscription error:', error)

    // If auth error, return 401/403
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message?.includes('Unauthorized') ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat update subscription' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  let connection = null

  try {
    const { subscriptionId } = params
    const adminUser = await getAdminUser(request)

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    connection = await getDatabaseConnection()

    // Get current subscription
    const currentResult = await connection.query(
      `SELECT id, user_id, status FROM subscriptions WHERE id = $1`,
      [subscriptionId]
    )

    if (currentResult.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Subscription tidak ditemukan' },
        { status: 404 }
      )
    }

    const currentSubscription = currentResult.rows[0]

    // Update subscription to cancelled
    await connection.query(
      `UPDATE subscriptions 
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancelled_by = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [adminUser.userId, subscriptionId]
    )

    // Log audit
    await logAudit({
      userId: adminUser.userId,
      userRole: adminUser.role,
      action: AuditActions.SUBSCRIPTION_CANCEL,
      resourceType: ResourceTypes.SUBSCRIPTION,
      resourceId: subscriptionId,
      resourceName: `Subscription #${subscriptionId}`,
      description: `Cancelled subscription for user ${currentSubscription.user_id}`,
      oldValues: { status: currentSubscription.status },
      newValues: { status: 'cancelled' },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    })

    // Update user status to inactive
    await connection.query(
      `UPDATE data_user SET status_user = 'inactive' WHERE user_id = $1`,
      [currentSubscription.user_id]
    )

    connection.release()

    return NextResponse.json({
      success: true,
      message: 'Subscription berhasil dibatalkan',
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat membatalkan subscription' },
      { status: 500 }
    )
  }
}

