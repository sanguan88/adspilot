import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

// GET - List all payouts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || ''

    const offset = (page - 1) * limit

    const result = await withDatabaseConnection(async (connection) => {
      let query = `
        SELECT 
          p.payout_id as id,
          p.payout_batch as "payoutBatch",
          p.payout_date as "payoutDate",
          p.total_amount as "amount",
          p.total_affiliates as "totalAffiliates",
          p.status,
          p.created_at as "createdAt",
          p.affiliate_id as "affiliateId",
          a.name as "affiliateName",
          a.email as "affiliateEmail"
        FROM affiliate_payouts p
        LEFT JOIN affiliates a ON p.affiliate_id = a.affiliate_id
        WHERE 1=1
      `
      const queryParams: any[] = []

      if (status) {
        query += ` AND status = $${queryParams.length + 1}`
        queryParams.push(status)
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`
      queryParams.push(limit, offset)

      const payoutsRes = await connection.query(query, queryParams)

      const countRes = await connection.query('SELECT COUNT(*) FROM affiliate_payouts')
      const total = parseInt(countRes.rows[0].count)

      return {
        payouts: payoutsRes.rows.map(row => ({
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
    console.error('Get payouts error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data payouts' },
      { status: 500 }
    )
  }
}

// POST - Process payout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { affiliateId, amount } = body

    if (!affiliateId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Affiliate ID dan amount harus diisi' },
        { status: 400 }
      )
    }

    const result = await withDatabaseConnection(async (connection) => {
      await connection.query('BEGIN')

      try {
        // 1. Get all pending commissions for this affiliate
        const commissionsRes = await connection.query(
          `SELECT commission_id, amount FROM affiliate_commissions 
           WHERE affiliate_id = $1 AND status = 'pending'`,
          [affiliateId]
        )

        if (commissionsRes.rows.length === 0) {
          throw new Error('Tidak ada komisi pending untuk affiliate ini')
        }

        const totalPending = commissionsRes.rows.reduce((sum, c) => sum + parseFloat(c.amount), 0)

        // Use the requested amount if it's less than total pending, otherwise use all pending
        const payoutAmount = Math.min(parseFloat(amount), totalPending)

        // 2. Create Payout Batch
        const payoutBatch = `PAY-${Date.now()}`
        const payoutRes = await connection.query(
          `INSERT INTO affiliate_payouts (
            payout_batch, payout_date, total_amount, total_affiliates, total_commissions, status, created_at, affiliate_id
          ) VALUES ($1, NOW(), $2, 1, $3, 'pending', NOW(), $4)
          RETURNING payout_id`,
          [payoutBatch, payoutAmount, commissionsRes.rows.length, affiliateId]
        )

        const payoutId = payoutRes.rows[0].payout_id

        // 3. Link commissions to this payout and update status to 'paid' (or 'processing' if you prefer)
        // For this simple implementation, we'll mark them as 'paid' once payout is created
        await connection.query(
          `UPDATE affiliate_commissions 
           SET status = 'paid', payout_id = $1, paid_at = NOW()
           WHERE affiliate_id = $2 AND status = 'pending'`,
          [payoutId, affiliateId]
        )

        await connection.query('COMMIT')

        return {
          id: payoutId,
          batch: payoutBatch,
          amount: payoutAmount,
          status: 'pending'
        }
      } catch (err) {
        await connection.query('ROLLBACK')
        throw err
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payout processed successfully',
      data: result,
    })
  } catch (error: any) {
    console.error('Process payout error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat memproses payout' },
      { status: 500 }
    )
  }
}

