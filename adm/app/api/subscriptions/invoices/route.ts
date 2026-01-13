import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('userId') || ''

    // TODO: Query from invoices table when available
    // For now, return empty or mock data
    const result = await withDatabaseConnection(async (connection) => {
      // Mock invoices based on users (temporary)
      let query = `
        SELECT 
          u.user_id, u.username, u.email, u.created_at
        FROM data_user u
        WHERE 1=1
      `
      const params: any[] = []

      if (userId) {
        query += ` AND u.user_id = $1`
        params.push(userId)
      }

      const offset = (page - 1) * limit
      params.push(limit, offset)
      query += ` ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`

      const usersResult = await connection.query(query, params)

      // Map to invoices (temporary)
      const invoices = usersResult.rows.map((row: any, index: number) => ({
        id: `INV-${row.user_id}-${index + 1}`,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        amount: 0,
        planId: 'free',
        planName: 'Free',
        status: 'paid',
        issueDate: row.created_at,
        dueDate: row.created_at,
        paidDate: row.created_at,
      }))

      return {
        invoices,
        total: invoices.length,
        page,
        limit,
        totalPages: Math.ceil(invoices.length / limit),
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data invoices' },
      { status: 500 }
    )
  }
}

