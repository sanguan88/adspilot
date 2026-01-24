import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all referrals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const affiliateId = searchParams.get('affiliateId') || ''

    // Query from real referrals table
    const result = await withDatabaseConnection(async (connection) => {
      let query = `
        SELECT 
          r.referral_id as id,
          r.affiliate_id as "affiliateId",
          r.user_id as "userId",
          u.username,
          u.email,
          r.status,
          r.first_payment_date as "convertedAt",
          r.created_at as "createdAt",
          a.name as "affiliateName",
          a.email as "affiliateEmail"
        FROM affiliate_referrals r
        JOIN data_user u ON r.user_id = u.user_id
        LEFT JOIN affiliates a ON r.affiliate_id = a.affiliate_id
        WHERE 1=1
      `
      const queryParams: any[] = []

      if (affiliateId) {
        query += ` AND r.affiliate_id = $${queryParams.length + 1}`
        queryParams.push(affiliateId)
      }

      const offset = (page - 1) * limit
      query += ` ORDER BY r.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
      queryParams.push(limit, offset)

      const referralsRes = await connection.query(query, queryParams)

      const countRes = await connection.query('SELECT COUNT(*) FROM affiliate_referrals')
      const total = parseInt(countRes.rows[0].count)

      return {
        referrals: referralsRes.rows,
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
  } catch (error) {
    console.error('Get referrals error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data referrals' },
      { status: 500 }
    )
  }
}

