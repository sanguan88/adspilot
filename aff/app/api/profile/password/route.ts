import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
    }

    const affiliateId = affiliate.affiliateId
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password dan new password harus diisi' },
        { status: 400 }
      )
    }

    // Update password in database
    const connection = await getDatabaseConnection()

    try {
      // Verify current password
      const result = await connection.query(
        `SELECT password_hash FROM affiliates WHERE affiliate_id = $1`,
        [affiliateId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Affiliate not found' },
          { status: 404 }
        )
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        result.rows[0].password_hash
      )

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password salah' },
          { status: 401 }
        )
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password
      await connection.query(
        `UPDATE affiliates
        SET password_hash = $1, updated_at = NOW()
        WHERE affiliate_id = $2`,
        [hashedPassword, affiliateId]
      )

      return NextResponse.json({ success: true })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
