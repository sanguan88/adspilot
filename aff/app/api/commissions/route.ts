import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
    }

    const affiliateId = affiliate.affiliateId
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const typeFilter = searchParams.get('type')

    // Get real commissions from database
    const connection = await getDatabaseConnection()

    try {
      let query = `
        SELECT 
          ac.commission_id as id,
          ac.referral_id as "referralId",
          u.nama_lengkap as "referralName",
          ac.transaction_id as "transactionId",
          ac.type,
          ac.amount,
          ac.status,
          ac.created_at as "createdAt",
          ac.paid_at as "paidAt",
          ac.payout_id as "payoutId"
        FROM affiliate_commissions ac
        LEFT JOIN data_user u ON ac.user_id = u.user_id
        WHERE ac.affiliate_id = $1
      `

      const params: any[] = [affiliateId]
      let paramIndex = 2

      if (statusFilter) {
        query += ` AND ac.status = $${paramIndex}`
        params.push(statusFilter)
        paramIndex++
      }

      if (typeFilter) {
        query += ` AND ac.type = $${paramIndex}`
        params.push(typeFilter)
        paramIndex++
      }

      query += ` ORDER BY ac.created_at DESC`

      const result = await connection.query(query, params)

      const commissions = result.rows.map(row => ({
        id: row.id,
        referralId: row.referralId,
        referralName: row.referralName || 'Unknown',
        transactionId: row.transactionId,
        type: row.type,
        amount: parseFloat(row.amount || '0'),
        status: row.status,
        createdAt: row.createdAt,
        paidAt: row.paidAt,
        payoutId: row.payoutId,
      }))

      // Get summary
      const summaryResult = await connection.query(
        `SELECT 
          COALESCE(SUM(amount), 0) as total,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid,
          COALESCE(SUM(CASE WHEN type = 'first_payment' THEN amount ELSE 0 END), 0) as firstPayment,
          COALESCE(SUM(CASE WHEN type = 'recurring' THEN amount ELSE 0 END), 0) as recurring
        FROM affiliate_commissions
        WHERE affiliate_id = $1`,
        [affiliateId]
      )

      const summaryRow = summaryResult.rows[0]
      const summary = {
        total: parseFloat(summaryRow?.total || '0'),
        pending: parseFloat(summaryRow?.pending || '0'),
        paid: parseFloat(summaryRow?.paid || '0'),
        firstPayment: parseFloat(summaryRow?.firstpayment || '0'),
        recurring: parseFloat(summaryRow?.recurring || '0'),
      }

      return NextResponse.json({ success: true, data: commissions, summary })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get commissions error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
