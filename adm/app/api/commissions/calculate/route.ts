import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { calculateCommission, getCommissionConfig, isFirstPayment } from '@/lib/commission-calculator'

/**
 * Calculate and create commission when order is paid
 * This should be called from order payment webhook or order status update
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, userId, affiliateId, amount, planId } = body

    if (!orderId || !userId || !affiliateId || !amount || !planId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const connection = await getDatabaseConnection()

    try {
      // Check if commission already exists for this order
      const existingResult = await connection.query(
        `SELECT commission_id FROM affiliate_commissions WHERE order_id = $1`,
        [orderId]
      )

      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Commission already exists for this order' },
          { status: 400 }
        )
      }

      // Check if this is first payment
      const firstPayment = await isFirstPayment(userId, connection)

      // Get commission config
      const config = await getCommissionConfig(affiliateId, planId, connection)

      // Calculate commission
      const commissionAmount = calculateCommission(
        {
          orderId,
          userId,
          affiliateId,
          amount: parseFloat(amount),
          planId,
          isFirstPayment: firstPayment,
        },
        config
      )

      if (commissionAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Commission amount is zero or negative' },
          { status: 400 }
        )
      }

      // Get referral ID
      const referralResult = await connection.query(
        `SELECT referral_id FROM affiliate_referrals 
        WHERE user_id = $1 AND affiliate_id = $2 AND status = 'converted'`,
        [userId, affiliateId]
      )

      const referralId = referralResult.rows[0]?.referral_id || null

      // Create commission record
      const insertResult = await connection.query(
        `INSERT INTO affiliate_commissions (
          affiliate_id,
          referral_id,
          order_id,
          type,
          amount,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
        RETURNING commission_id`,
        [
          affiliateId,
          referralId,
          orderId,
          firstPayment ? 'first_payment' : 'recurring',
          commissionAmount,
        ]
      )

      const commissionId = insertResult.rows[0].commission_id

      return NextResponse.json({
        success: true,
        data: {
          commissionId,
          amount: commissionAmount,
          type: firstPayment ? 'first_payment' : 'recurring',
        },
      })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Calculate commission error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghitung commission' },
      { status: 500 }
    )
  }
}

