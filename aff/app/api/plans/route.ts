import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get real plans from database
    try {
      const connection = await getDatabaseConnection()

      try {
        const result = await connection.query(
          `SELECT plan_id as id, name 
          FROM subscription_plans 
          WHERE is_active = true
          ORDER BY name`
        )

        const plans = result.rows.map(row => ({
          id: row.id,
          name: row.name,
        }))

        return NextResponse.json({ success: true, data: plans })
      } finally {
        connection.release()
      }
    } catch (dbError: any) {
      // If table doesn't exist, return empty array (graceful fallback)
      if (dbError.code === '42P01') {
        console.warn('Subscription plans table not found, returning empty array')
        return NextResponse.json({ success: true, data: [] })
      }
      console.error('Get plans error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Terjadi kesalahan' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Get plans error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
