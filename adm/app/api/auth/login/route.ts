import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Bypass authentication untuk development
    // Force enable bypass di development mode (untuk memudahkan testing)
    // Di development, bypass SELALU aktif, tidak peduli BYPASS_AUTH env variable
    const isDevelopment = process.env.NODE_ENV !== 'production' ||
      process.env.NODE_ENV === undefined ||
      !process.env.NODE_ENV

    // Bypass aktif jika:
    // 1. Development mode (FORCE ENABLE - ignore BYPASS_AUTH env)
    // 2. Production mode hanya jika BYPASS_AUTH=true (explicit enable)
    const BYPASS_AUTH = isDevelopment || process.env.BYPASS_AUTH === 'true'

    // Log untuk debugging
    console.log('[AUTH] ==========================================')
    console.log('[AUTH] NODE_ENV:', process.env.NODE_ENV || 'undefined (development)')
    console.log('[AUTH] isDevelopment:', isDevelopment)
    console.log('[AUTH] BYPASS_AUTH env:', process.env.BYPASS_AUTH || 'not set')
    console.log('[AUTH] BYPASS_AUTH final:', BYPASS_AUTH)
    console.log('[AUTH] ==========================================')
    const BYPASS_USERNAME = process.env.BYPASS_USERNAME || 'admin'

    // Jika bypass enabled, langsung return success untuk username tertentu
    // Bypass bekerja untuk: admin, test, bypass, atau username yang di-set di BYPASS_USERNAME
    if (BYPASS_AUTH && username) {
      const allowedBypassUsernames = [
        BYPASS_USERNAME.toLowerCase(),
        'admin',
        'test',
        'bypass',
        'dev',
        'developer'
      ]

      if (allowedBypassUsernames.includes(username.toLowerCase())) {
        console.log('[BYPASS] Login bypassed for username:', username)

        const jwtSecret = process.env.JWT_SECRET || 'ADBOT-SOROBOT-2026-CB45'
        const token = jwt.sign(
          {
            userId: 'bypass-user',
            username: username,
            role: 'superadmin',
          },
          jwtSecret,
          { expiresIn: '7d' }
        )

        return NextResponse.json({
          success: true,
          data: {
            user: {
              userId: 'bypass-user',
              username: username,
              email: `${username}@admin.local`,
              nama_lengkap: 'Bypass Admin User',
              role: 'superadmin' as const,
              photo_profile: null,
            },
            token,
          },
        })
      }
    }

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password harus diisi' },
        { status: 400 }
      )
    }

    const result = await withDatabaseConnection(async (connection) => {
      // Query user dari database
      const userResult = await connection.query(
        `SELECT no, user_id, username, email, password, nama_lengkap, role, photo_profile 
         FROM data_user 
         WHERE username = $1 OR email = $1`,
        [username]
      )

      if (userResult.rows.length === 0) {
        return null
      }

      const user = userResult.rows[0]

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return null
      }

      // Check if user role is allowed to access admin portal
      // Only manager, admin, and superadmin are allowed
      const allowedRoles = ['manager', 'admin', 'superadmin']
      const userRole = user.role?.toLowerCase()?.trim()
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Return null to show generic error message (security: don't expose that user exists)
        return null
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET || 'ADBOT-SOROBOT-2026-CB45'
      const token = jwt.sign(
        {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      return {
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          nama_lengkap: user.nama_lengkap,
          role: user.role,
          photo_profile: user.photo_profile,
        },
        token,
      }
    })

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'user atau password salah!' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat login' },
      { status: 500 }
    )
  }
}

