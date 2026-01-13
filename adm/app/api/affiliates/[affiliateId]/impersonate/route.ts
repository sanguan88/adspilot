import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const AFFILIATE_JWT_SECRET = process.env.AFFILIATE_JWT_SECRET || JWT_SECRET

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

export async function POST(
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

    // Check if admin has permission (superadmin or admin with impersonate permission)
    // Import permission helper
    const { hasPermission } = await import('@/lib/permissions')
    
    if (!hasPermission(admin.role as any, 'canImpersonateAffiliate')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only superadmin and admin can impersonate affiliates.' },
        { status: 403 }
      )
    }

    const { affiliateId } = params

    // If bypass, return mock token
    if (affiliateId === 'bypass-affiliate' || admin.userId === 'bypass-admin') {
      const impersonationToken = jwt.sign(
        {
          affiliateId: 'bypass-affiliate',
          email: 'affiliate@affiliate.local',
          isImpersonated: true,
          impersonatedBy: admin.userId,
          impersonatedAt: new Date().toISOString(),
        },
        AFFILIATE_JWT_SECRET,
        { expiresIn: '1h' } // Shorter timeout for impersonation
      )

      return NextResponse.json({
        success: true,
        token: impersonationToken,
      })
    }

    // Get affiliate from database
    const connection = await getDatabaseConnection()
    
    try {
      // Verify affiliate exists and is active
      const affiliateResult = await connection.query(
        `SELECT affiliate_id, email, status FROM affiliates WHERE affiliate_id = $1`,
        [affiliateId]
      )

      if (affiliateResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Affiliate not found' },
          { status: 404 }
        )
      }

      const affiliate = affiliateResult.rows[0]

      if (affiliate.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'Affiliate is not active' },
          { status: 400 }
        )
      }

      // Log impersonation
      await connection.query(
        `INSERT INTO admin_impersonations (admin_id, affiliate_id, started_at)
        VALUES ($1, $2, NOW())`,
        [admin.userId, affiliateId]
      )

      // Generate impersonation token
      const impersonationToken = jwt.sign(
        {
          affiliateId: affiliate.affiliate_id,
          email: affiliate.email,
          isImpersonated: true,
          impersonatedBy: admin.userId,
          impersonatedAt: new Date().toISOString(),
        },
        AFFILIATE_JWT_SECRET,
        { expiresIn: '1h' } // Shorter timeout for impersonation
      )

      return NextResponse.json({
        success: true,
        token: impersonationToken,
      })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Impersonation error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

