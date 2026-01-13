import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify JWT token
    let decoded: any
    const AFFILIATE_JWT_SECRET = process.env.AFFILIATE_JWT_SECRET || JWT_SECRET

    try {
      // Try affiliate secret first (for impersonation tokens)
      try {
        decoded = jwt.verify(token, AFFILIATE_JWT_SECRET)
      } catch {
        // Fallback to regular secret
        decoded = jwt.verify(token, JWT_SECRET)
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get connection
    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `SELECT 
          affiliate_id,
          affiliate_code,
          name,
          email,
          status,
          commission_rate,
          photo_profile
        FROM affiliates 
        WHERE affiliate_id = $1`,
        [decoded.affiliateId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Affiliate not found' },
          { status: 404 }
        )
      }

      const affiliate = result.rows[0]

      // Check if active (only block regular logins, impersonation can still view inactive profiles)
      if (affiliate.status !== 'active' && !decoded.isImpersonated) {
        return NextResponse.json(
          { success: false, error: 'Akun ditangguhkan' },
          { status: 403 }
        )
      }

      const userData = {
        affiliateId: affiliate.affiliate_id,
        affiliateCode: affiliate.affiliate_code,
        name: affiliate.name,
        email: affiliate.email,
        status: affiliate.status,
        commissionRate: affiliate.commission_rate,
        photoProfile: affiliate.photo_profile,
        isImpersonated: decoded.isImpersonated || false,
        impersonatedBy: decoded.impersonatedBy || null,
      }

      return NextResponse.json({ success: true, data: userData })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
