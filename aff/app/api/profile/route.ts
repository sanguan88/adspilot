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

    // Get real profile from database
    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `SELECT 
          name,
          email,
          phone,
          payout_method as payoutMethod,
          bank_account as bankAccount,
          bank_name as bankName,
          ewallet as eWallet,
          ewallet_type as eWalletType,
          whatsapp_number as whatsapp,
          telegram_username as telegram,
          fb_pixel_id as fbPixelId,
          tiktok_pixel_id as tiktokPixelId,
          google_pixel_id as googlePixelId
        FROM affiliates
        WHERE affiliate_id = $1`,
        [affiliateId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Affiliate not found' },
          { status: 404 }
        )
      }

      const row = result.rows[0]
      return NextResponse.json({
        success: true,
        data: {
          name: row.name,
          email: row.email,
          phone: row.phone,
          payoutMethod: row.payoutmethod || 'bank',
          bankAccount: row.bankaccount,
          bankName: row.bankname,
          eWallet: row.ewallet,
          eWalletType: row.ewallettype,
          whatsapp: row.whatsapp,
          telegram: row.telegram,
          fbPixelId: row.fbpixelid,
          tiktokPixelId: row.tiktokpixelid,
          googlePixelId: row.googlepixelid,
        },
      })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
    }

    const affiliateId = affiliate.affiliateId
    const body = await request.json()

    // Update profile in database
    const connection = await getDatabaseConnection()

    try {
      await connection.query(
        `UPDATE affiliates
        SET 
          name = $1,
          email = $2,
          phone = $3,
          payout_method = $4,
          bank_account = $5,
          bank_name = $6,
          ewallet = $7,
          ewallet_type = $8,
          whatsapp_number = $9,
          telegram_username = $10,
          fb_pixel_id = $11,
          tiktok_pixel_id = $12,
          google_pixel_id = $13,
          updated_at = NOW()
        WHERE affiliate_id = $14`,
        [
          body.name,
          body.email,
          body.phone,
          body.payoutMethod,
          body.bankAccount,
          body.bankName,
          body.eWallet,
          body.eWalletType,
          body.whatsapp,
          body.telegram,
          body.fbPixelId,
          body.tiktokPixelId,
          body.googlePixelId,
          affiliateId,
        ]
      )

      return NextResponse.json({ success: true })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
