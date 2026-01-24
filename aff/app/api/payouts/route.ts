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

    // Get real payouts from database
    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `SELECT 
          po.payout_id as id,
          po.total_amount as amount,
          po.status,
          po.payout_batch as "payoutBatch",
          po.created_at as "createdAt",
          po.paid_at as "paidAt",
          (SELECT COUNT(*) FROM affiliate_commissions WHERE payout_id = po.payout_id) as "commissionCount"
        FROM affiliate_payouts po
        WHERE po.affiliate_id = $1
        ORDER BY po.created_at DESC`,
        [affiliateId]
      )

      const payouts = result.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount || '0'),
        status: row.status,
        payoutBatch: row.payoutBatch || 'N/A',
        createdAt: row.createdAt,
        paidAt: row.paidAt,
        commissionCount: parseInt(row.commissionCount || '0'),
      }))

      // Get summary
      const summaryResult = await connection.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as "totalPaid",
          COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0) as pending
        FROM affiliate_payouts
        WHERE affiliate_id = $1`,
        [affiliateId]
      )

      // Get next payout estimate (sum of pending commissions)
      const nextPayoutResult = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as "nextPayout"
        FROM affiliate_commissions
        WHERE affiliate_id = $1 AND status = 'pending'`,
        [affiliateId]
      )

      const summaryRow = summaryResult.rows[0]
      const summary = {
        totalPaid: parseFloat(summaryRow?.totalPaid || '0'),
        pending: parseFloat(summaryRow?.pending || '0'),
        nextPayout: parseFloat(nextPayoutResult.rows[0]?.nextPayout || '0'),
      }

      return NextResponse.json({ success: true, data: payouts, summary })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get payouts error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
