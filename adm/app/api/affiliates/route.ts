import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { randomUUID } from 'crypto'

// GET - List all affiliates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const offset = (page - 1) * limit

    // Query from real affiliates table
    const result = await withDatabaseConnection(async (connection) => {
      let query = `
        SELECT 
          a.affiliate_id as id,
          a.affiliate_code as "referralCode",
          a.name as username,
          a.email,
          a.status,
          a.commission_rate as "commissionRate",
          a.created_at as "createdAt",
          av.voucher_code as "voucherCode",
          (SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = a.affiliate_id AND status = 'converted') as "totalReferrals",
          (SELECT COALESCE(SUM(amount), 0) FROM affiliate_commissions WHERE affiliate_id = a.affiliate_id AND status = 'paid') as "totalCommissions",
          (SELECT COALESCE(SUM(amount), 0) FROM affiliate_commissions WHERE affiliate_id = a.affiliate_id AND status = 'pending') as "pendingCommissions"
        FROM affiliates a
        LEFT JOIN affiliate_vouchers av ON a.affiliate_id = av.affiliate_id
        WHERE 1=1
      `
      const queryParams: any[] = []

      if (status) {
        query += ` AND status = $${queryParams.length + 1}`
        queryParams.push(status)
      }

      if (search) {
        query += ` AND (a.name ILIKE $${queryParams.length + 1} OR a.email ILIKE $${queryParams.length + 1} OR a.affiliate_code ILIKE $${queryParams.length + 1})`
        queryParams.push(`%${search}%`)
      }

      query += ` ORDER BY a.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
      queryParams.push(limit, offset)

      const affiliatesRes = await connection.query(query, queryParams)

      const countRes = await connection.query('SELECT COUNT(*) FROM affiliates')
      const total = parseInt(countRes.rows[0].count)

      return {
        affiliates: affiliatesRes.rows.map(row => ({
          ...row,
          totalCommissions: parseFloat(row.totalCommissions),
          pendingCommissions: parseFloat(row.pendingCommissions),
          totalReferrals: parseInt(row.totalReferrals)
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
    console.error('Get affiliates error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data affiliates' },
      { status: 500 }
    )
  }
}

// POST - Create new affiliate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, referralCode } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID harus diisi' },
        { status: 400 }
      )
    }

    // Generate referral code if not provided
    const code = referralCode || `AFF-${randomUUID().substring(0, 8).toUpperCase()}`

    // TODO: Save to affiliate table when available
    return NextResponse.json({
      success: true,
      message: 'Affiliate created (not saved to database yet)',
      data: {
        id: randomUUID(),
        userId,
        referralCode: code,
        status: 'active',
        totalReferrals: 0,
        totalCommissions: 0,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Create affiliate error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat membuat affiliate' },
      { status: 500 }
    )
  }
}

