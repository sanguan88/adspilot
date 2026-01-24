import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/database'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authorization token required'
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'sorobot-live-secret-key-change-in-production'
    
    let decoded: any
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch (jwtError: any) {
      console.error('JWT verification failed:', jwtError.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token'
        },
        { status: 401 }
      )
    }

    // Get user from database with team logo
    try {
      // Check database connection first
      const isConnected = await db.checkConnection()
      if (!isConnected) {
        console.error('Database connection failed in /api/auth/me')
        return NextResponse.json(
          {
            success: false,
            error: 'Database connection failed. Please try again.'
          },
          { status: 503 } // Service Unavailable
        )
      }

      // Get user data first (without join to avoid column issues)
      const result = await db.query(
        `SELECT * FROM data_user 
         WHERE no = $1 AND status_user = $2`,
        [decoded.id, 'aktif']
      )
      
      if (!result || result.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found or inactive'
          },
          { status: 401 }
        )
      }
      
      const user = result[0]
      
      // Get team logo separately if user has kode_tim
      let logoBase64 = null
      let namaTim = null
      if (user.kode_tim) {
        try {
          const teamResult = await db.query(
            `SELECT logo_tim, nama_tim FROM data_tim WHERE kode_tim = $1 LIMIT 1`,
            [user.kode_tim]
          )
          
          if (teamResult && teamResult.length > 0) {
            namaTim = teamResult[0].nama_tim
            const logoTim = teamResult[0].logo_tim
            if (logoTim) {
              if (Buffer.isBuffer(logoTim)) {
                logoBase64 = `data:image/png;base64,${logoTim.toString('base64')}`
              } else if (typeof logoTim === 'string') {
                logoBase64 = logoTim
              }
            }
          }
        } catch (error) {
          console.error('Error getting team logo:', error)
        }
      }
      
      // Convert bytea photo_profil to base64 if exists
      let photoBase64 = null
      
      // Also convert photo_profil from bytea if it's stored as bytea
      if (user.photo_profil) {
        try {
          if (Buffer.isBuffer(user.photo_profil)) {
            photoBase64 = `data:image/png;base64,${user.photo_profil.toString('base64')}`
          } else if (typeof user.photo_profil === 'string') {
            // Check if it's already a data URL or path
            if (user.photo_profil.startsWith('data:') || user.photo_profil.startsWith('http')) {
              photoBase64 = user.photo_profil
            } else {
              // It's a path, use as is
              photoBase64 = user.photo_profil
            }
          }
        } catch (error) {
          console.error('Error converting photo_profil to base64:', error)
        }
      }
      
      // Return user data
      return NextResponse.json({
        success: true,
        data: {
          id: user.no,
          email: user.email,
          name: user.nama_lengkap,
          role: user.role,
          status: user.status_user,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          photo: photoBase64 || user.photo_profil,
          photo_profile: photoBase64 || user.photo_profil,
          siteName: user.nama_site,
          whatsapp: user.no_whatsapp,
          telegram: user.username_telegram,
          kode_site: user.kode_site,
          nama_site: user.nama_site,
          kode_tim: user.kode_tim,
          nama_tim: namaTim || user.nama_tim,
          logo_tim: logoBase64,
          licenseCount: 0,
          deviceCount: 0
        }
      })
    } catch (dbError: any) {
      console.error('Database error during token validation:', dbError)
      console.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      })
      
      // Return more specific error message
      let errorMessage = 'Database error'
      if (dbError.code === 'ECONNREFUSED') {
        errorMessage = 'Database connection refused. Please check database server.'
      } else if (dbError.code === 'ETIMEDOUT') {
        errorMessage = 'Database connection timeout. Please try again.'
      } else if (dbError.code === '28P01') {
        errorMessage = 'Database authentication failed. Please check credentials.'
      } else if (dbError.message) {
        errorMessage = `Database error: ${dbError.message}`
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}

