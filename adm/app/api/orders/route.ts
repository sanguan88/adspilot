import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { randomUUID } from 'crypto'
import { requirePermission } from '@/lib/auth-helper'

// GET - List all transactions (orders)
export async function GET(request: NextRequest) {
  try {
    // Check permission
    await requirePermission(request, 'canManageOrders')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const paymentStatus = searchParams.get('status') || '' // pending, paid, expired, cancelled
    const userId = searchParams.get('userId') || ''
    const planId = searchParams.get('planId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const orderDir = searchParams.get('orderDir') || 'DESC'

    // Validate orderBy and orderDir to prevent injection
    const allowedSortFields = ['created_at', 'total_amount', 'payment_status', 'plan_id', 'transaction_id']
    const finalOrderBy = allowedSortFields.includes(orderBy) ? `t.${orderBy}` : 't.created_at'
    const finalOrderDir = orderDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const offset = (page - 1) * limit

    const result = await withDatabaseConnection(async (connection) => {
      // Query transactions with user info
      let query = `
        SELECT 
          t.id,
          t.transaction_id,
          t.user_id,
          t.plan_id,
          t.base_amount,
          t.ppn_amount,
          t.unique_code,
          t.total_amount,
          t.payment_method,
          t.payment_status,
          t.payment_proof_url,
          t.payment_confirmed_at,
          t.payment_confirmed_by,
          t.payment_notes,
          t.created_at,
          t.updated_at,
          t.expires_at,
          t.voucher_code,
          t.voucher_affiliate_id,
          u.username,
          u.email,
          u.nama_lengkap,
          u.status_user,
          u.referred_by_affiliate as user_referral_code,
          a.affiliate_code as voucher_affiliate_code,
          a.name as affiliate_name,
          sp.name as database_plan_name,
          sp.duration_months,
          sp.billing_cycle
        FROM transactions t
        INNER JOIN data_user u ON t.user_id = u.user_id
        LEFT JOIN affiliates a ON t.voucher_affiliate_id = a.affiliate_id::text OR (t.voucher_affiliate_id IS NULL AND u.referred_by_affiliate = a.affiliate_code)
        LEFT JOIN subscription_plans sp ON t.plan_id = sp.plan_id
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      if (paymentStatus) {
        paramCount++
        query += ` AND t.payment_status = $${paramCount}`
        params.push(paymentStatus)
      }

      if (userId) {
        paramCount++
        query += ` AND t.user_id = $${paramCount}`
        params.push(userId)
      }

      if (planId) {
        paramCount++
        query += ` AND t.plan_id = $${paramCount}`
        params.push(planId)
      }

      if (startDate) {
        paramCount++
        query += ` AND t.created_at >= $${paramCount}`
        params.push(startDate)
      }

      if (endDate) {
        paramCount++
        query += ` AND t.created_at <= $${paramCount}`
        params.push(endDate)
      }

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM')
      const countParams = [...params]
      const countResult = await connection.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0]?.total || '0')

      // Add sorting and pagination
      query += ` ORDER BY ${finalOrderBy} ${finalOrderDir}`

      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(limit)

      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(offset)

      const transactionsResult = await connection.query(query, params)

      // Map transactions to orders format
      const orders = transactionsResult.rows.map((row: any) => {
        return {
          id: row.transaction_id,
          transactionId: row.transaction_id,
          orderNumber: row.transaction_id,
          userId: row.user_id,
          username: row.username,
          email: row.email,
          namaLengkap: row.nama_lengkap,
          planId: row.plan_id,
          planName: row.database_plan_name || row.plan_id,
          durationMonths: row.duration_months,
          billingCycle: row.billing_cycle,
          baseAmount: parseFloat(row.base_amount),
          ppnAmount: parseFloat(row.ppn_amount),
          uniqueCode: row.unique_code,
          totalAmount: parseFloat(row.total_amount),
          status: row.payment_status === 'paid' ? 'paid' : 'pending',
          paymentStatus: row.payment_status,
          paymentMethod: row.payment_method,
          paymentProofUrl: row.payment_proof_url || null,
          source: 'direct',
          voucherCode: row.voucher_code || null,
          referralCode: row.voucher_affiliate_code || row.user_referral_code || null,
          affiliateName: row.affiliate_name || null,
          affiliateId: row.voucher_affiliate_id || null,
          userStatus: row.status_user,
          paymentConfirmedAt: row.payment_confirmed_at,
          paymentConfirmedBy: row.payment_confirmed_by,
          paymentNotes: row.payment_notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          expiresAt: row.expires_at,
          paidAt: row.payment_confirmed_at || null,
          activatedAt: row.payment_confirmed_at || null,
        }
      })

      return {
        orders,
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

    console.error('Get orders error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data orders' },
      { status: 500 }
    )
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    // Check permission
    await requirePermission(request, 'canManageOrders')

    const body = await request.json()
    const { userId, planId, amount, paymentMethod, source, affiliateId } = body

    if (!userId || !planId) {
      return NextResponse.json(
        { success: false, error: 'User ID dan Plan ID harus diisi' },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = `ORD-${randomUUID().substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`

    // TODO: Save to orders table when available
    return NextResponse.json({
      success: true,
      message: 'Order created (not saved to database yet)',
      data: {
        id: randomUUID(),
        orderNumber,
        userId,
        planId,
        amount: amount || 0,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: paymentMethod || 'manual',
        source: source || 'direct',
        affiliateId: affiliateId || null,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error('Create order error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat membuat order' },
      { status: 500 }
    )
  }
}

