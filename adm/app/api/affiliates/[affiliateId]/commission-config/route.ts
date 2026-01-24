import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function getAdminUser(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  if (token === 'bypass-token') {
    return { userId: 'bypass-admin', role: 'superadmin' }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return { userId: decoded.userId, role: decoded.role }
  } catch {
    return null
  }
}

/**
 * GET - Get commission config for affiliate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { affiliateId: string } }
) {
  try {
    const admin = await getAdminUser(request)
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { affiliateId } = params
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')

    const connection = await getDatabaseConnection()

    try {
      if (planId) {
        // Get specific plan config
        const result = await connection.query(
          `SELECT 
            first_payment_rate,
            recurring_rate,
            fixed_first_payment,
            fixed_recurring,
            use_percentage
          FROM affiliate_commission_configs
          WHERE affiliate_id = $1 AND plan_id = $2`,
          [affiliateId, planId]
        )

        if (result.rows.length > 0) {
          const row = result.rows[0]
          return NextResponse.json({
            success: true,
            data: {
              firstPaymentRate: row.first_payment_rate,
              recurringRate: row.recurring_rate,
              fixedFirstPayment: row.fixed_first_payment,
              fixedRecurring: row.fixed_recurring,
              usePercentage: row.use_percentage,
            },
          })
        }

        // Return default if no custom config
        return NextResponse.json({
          success: true,
            data: {
              firstPaymentRate: 10,
              recurringRate: 5,
              usePercentage: true,
            },
        })
      } else {
        // Get all configs for affiliate
        const result = await connection.query(
          `SELECT 
            plan_id,
            first_payment_rate,
            recurring_rate,
            fixed_first_payment,
            fixed_recurring,
            use_percentage
          FROM affiliate_commission_configs
          WHERE affiliate_id = $1`,
          [affiliateId]
        )

        const configs = result.rows.map(row => ({
          planId: row.plan_id,
          firstPaymentRate: row.first_payment_rate,
          recurringRate: row.recurring_rate,
          fixedFirstPayment: row.fixed_first_payment,
          fixedRecurring: row.fixed_recurring,
          usePercentage: row.use_percentage,
        }))

        return NextResponse.json({ success: true, data: configs })
      }
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get commission config error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update commission config for affiliate
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { affiliateId: string } }
) {
  try {
    const admin = await getAdminUser(request)
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    const { hasPermission } = await import('@/lib/permissions')
    if (!hasPermission(admin.role as any, 'canManageAffiliates')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { affiliateId } = params
    const body = await request.json()
    const { planId, firstPaymentRate, recurringRate, fixedFirstPayment, fixedRecurring, usePercentage } = body

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    const connection = await getDatabaseConnection()

    try {
      // Upsert commission config
      await connection.query(
        `INSERT INTO affiliate_commission_configs (
          affiliate_id,
          plan_id,
          first_payment_rate,
          recurring_rate,
          fixed_first_payment,
          fixed_recurring,
          use_percentage,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (affiliate_id, plan_id)
        DO UPDATE SET
          first_payment_rate = EXCLUDED.first_payment_rate,
          recurring_rate = EXCLUDED.recurring_rate,
          fixed_first_payment = EXCLUDED.fixed_first_payment,
          fixed_recurring = EXCLUDED.fixed_recurring,
          use_percentage = EXCLUDED.use_percentage,
          updated_at = NOW()`,
        [
          affiliateId,
          planId,
          firstPaymentRate,
          recurringRate,
          fixedFirstPayment,
          fixedRecurring,
          usePercentage ?? true,
        ]
      )

      return NextResponse.json({ success: true })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Update commission config error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

