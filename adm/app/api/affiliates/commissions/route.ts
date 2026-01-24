import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all commissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const affiliateId = searchParams.get('affiliateId') || ''
    const status = searchParams.get('status') || ''

    // Query from real commissions table
    const result = await withDatabaseConnection(async (connection) => {
      let query = `
        SELECT 
          c.commission_id as id,
          c.affiliate_id as "affiliateId",
          c.referral_id as "referralId",
          c.user_id as "userId",
          c.type,
          c.amount,
          c.status,
          c.created_at as "createdAt",
          a.name as "affiliateName",
          a.email as "affiliateEmail",
          u.username as "username",
          u.email as "email"
        FROM affiliate_commissions c
        LEFT JOIN affiliates a ON c.affiliate_id = a.affiliate_id
        LEFT JOIN data_user u ON c.user_id = u.user_id
        WHERE 1=1
      `
      const queryParams: any[] = []

      if (affiliateId) {
        query += ` AND affiliate_id = $${queryParams.length + 1}`
        queryParams.push(affiliateId)
      }

      if (status) {
        query += ` AND status = $${queryParams.length + 1}`
        queryParams.push(status)
      }

      const offset = (page - 1) * limit
      query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
      queryParams.push(limit, offset)

      const commissionsRes = await connection.query(query, queryParams)

      const countRes = await connection.query('SELECT COUNT(*) FROM affiliate_commissions')
      const total = parseInt(countRes.rows[0].count)

      return {
        commissions: commissionsRes.rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount)
        })),
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
    console.error('Get commissions error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data commissions' },
      { status: 500 }
    )
  }
}

