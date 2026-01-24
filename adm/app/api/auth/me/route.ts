import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token tidak ditemukan' },
        { status: 401 }
      )
    }

    // Handle bypass token
    if (token === 'bypass-token') {
      const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true'
      if (BYPASS_AUTH) {
        return NextResponse.json({
          success: true,
          data: {
            userId: 'bypass-user',
            username: 'admin',
            email: 'admin@admin.local',
            nama_lengkap: 'Bypass Admin',
            role: 'superadmin',
            photo_profile: null,
          },
        })
      }
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'ADBOT-SOROBOT-2026-CB45'
    let decoded: any
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Token tidak valid' },
        { status: 401 }
      )
    }

    // Get user from database
    const result = await withDatabaseConnection(async (connection) => {
      const userResult = await connection.query(
        `SELECT user_id, username, email, nama_lengkap, role, photo_profile 
         FROM data_user 
         WHERE user_id = $1`,
        [decoded.userId]
      )

      if (userResult.rows.length === 0) {
        return null
      }

      const user = userResult.rows[0]
      return {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
        photo_profile: user.photo_profile,
      }
    })

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

