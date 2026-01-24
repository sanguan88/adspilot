import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { referralId: string } }) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
    }

    const { referralId } = params

    // Fetch activities from database
    // Since we don't have a dedicated activity log, we'll construct it from:
    // 1. Signup date (from affiliate_referrals)
    // 2. Transactions (purchases)

    const connection = await getDatabaseConnection()

    try {
      // Get referral info first
      const referralResult = await connection.query(
        `SELECT user_id, created_at, signup_date FROM affiliate_referrals 
         WHERE referral_id = $1 AND affiliate_id = $2`,
        [referralId, affiliate.affiliateId]
      )

      if (referralResult.rows.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }

      const referral = referralResult.rows[0]
      const activities = []

      // 1. Add Signup Activity
      if (referral.signup_date || referral.created_at) {
        activities.push({
          id: 'signup',
          type: 'signup',
          description: 'User mendaftar via link affiliate',
          timestamp: referral.signup_date || referral.created_at
        })
      }

      // 2. Add Transactions Activity
      const transactionsResult = await connection.query(
        `SELECT 
           t.created_at, 
           t.total_amount, 
           sp.name as plan_name,
           t.payment_status
         FROM transactions t
         LEFT JOIN subscription_plans sp ON t.plan_id = sp.plan_id
         WHERE t.user_id = $1
         ORDER BY t.created_at DESC`,
        [referral.user_id]
      )

      transactionsResult.rows.forEach((txn, index) => {
        if (txn.payment_status === 'paid') {
          activities.push({
            id: `txn-${index}`,
            type: 'purchase',
            description: `Pembelian paket ${txn.plan_name || 'Premium'} (Rp${parseFloat(txn.total_amount).toLocaleString('id-ID')})`,
            timestamp: txn.created_at
          })
        } else if (txn.payment_status === 'pending') {
          activities.push({
            id: `txn-pending-${index}`,
            type: 'checkout',
            description: `Checkout paket ${txn.plan_name || 'Premium'} (Menunggu Pembayaran)`,
            timestamp: txn.created_at
          })
        }
      })

      // Sort by timestamp desc
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      return NextResponse.json({ success: true, data: activities })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get referral activities error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
