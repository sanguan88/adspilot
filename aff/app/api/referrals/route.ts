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

    // Get real referrals from database
    const connection = await getDatabaseConnection()

    try {
      let query = `
        SELECT 
          ar.referral_id as id,
          ar.user_id as "userId",
          u.nama_lengkap as "userName",
          u.email as "userEmail",
          ar.status,
          ar.first_payment_date as "convertedAt",
          ar.created_at as "createdAt",
          (
            SELECT COALESCE(SUM(total_amount), 0) 
            FROM transactions 
            WHERE user_id = ar.user_id 
            AND payment_status = 'paid'
          ) as "totalRevenue",
          (
            SELECT sp.name
            FROM transactions t
            JOIN subscription_plans sp ON t.plan_id = sp.plan_id
            WHERE t.user_id = ar.user_id AND t.payment_status = 'paid'
            ORDER BY t.created_at DESC LIMIT 1
          ) as "planName"
        FROM affiliate_referrals ar
        LEFT JOIN data_user u ON ar.user_id = u.user_id
        WHERE ar.affiliate_id = $1
      `

      const params: any[] = [affiliateId]

      if (statusFilter) {
        query += ` AND ar.status = $2`
        params.push(statusFilter)
      }

      query += ` ORDER BY ar.created_at DESC`

      const result = await connection.query(query, params)

      const referrals = result.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName || 'Unknown',
        userEmail: row.userEmail || 'unknown@example.com',
        status: row.status,
        convertedAt: row.convertedAt || row.createdAt, // Fallback to createdAt if convertedAt is null for converted users
        createdAt: row.createdAt,
        revenue: parseFloat(row.totalRevenue || 0),
        planName: row.planName || '-',
      }))

      return NextResponse.json({ success: true, data: referrals })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get referrals error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
