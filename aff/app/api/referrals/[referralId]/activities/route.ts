import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function getAffiliateId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  if (token === 'bypass-token') {
    return 'bypass-affiliate'
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.affiliateId || null
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { referralId: string } }
) {
  try {
    const affiliateId = await getAffiliateId(request)
    
    if (!affiliateId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { referralId } = params

    // If bypass, return mock data
    if (affiliateId === 'bypass-affiliate') {
      return NextResponse.json({
        success: true,
        data: [
          {
            id: '1',
            type: 'click',
            description: 'User clicked affiliate link',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            type: 'signup',
            description: 'User registered account',
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            type: 'order',
            description: 'User created order',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '4',
            type: 'payment',
            description: 'User completed payment',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      })
    }

    // Get real activities from database
    const connection = await getDatabaseConnection()
    
    try {
      // Verify referral belongs to affiliate
      const verifyResult = await connection.query(
        `SELECT affiliate_id FROM affiliate_referrals WHERE referral_id = $1`,
        [referralId]
      )

      if (verifyResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Referral not found' },
          { status: 404 }
        )
      }

      if (verifyResult.rows[0].affiliate_id !== affiliateId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        )
      }

      // Get activities (from user_activities or similar table)
      // This is a simplified version - adjust based on your actual schema
      const result = await connection.query(
        `SELECT 
          activity_id as id,
          activity_type as type,
          description,
          created_at as timestamp
        FROM user_activities
        WHERE user_id = (SELECT user_id FROM affiliate_referrals WHERE referral_id = $1)
        ORDER BY created_at DESC
        LIMIT 50`,
        [referralId]
      )

      const activities = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        description: row.description,
        timestamp: row.timestamp,
      }))

      return NextResponse.json({ success: true, data: activities })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get activities error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

