import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan password harus diisi' },
        { status: 400 }
      )
    }

    // Rate limiting
    const { checkRateLimit, getClientIP, resetRateLimit } = await import('@/lib/rate-limit')

    const clientIP = getClientIP(request)
    const ipRateLimit = checkRateLimit(`ip:${clientIP}`)
    const emailRateLimit = checkRateLimit(`aff:${email.toLowerCase().trim()}`)

    if (!ipRateLimit.allowed || !emailRateLimit.allowed) {
      const resetTime = Math.max(ipRateLimit.resetTime, emailRateLimit.resetTime)
      const minutesRemaining = Math.ceil((resetTime - Date.now()) / (60 * 1000))

      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${minutesRemaining} menit.`
        },
        { status: 429 }
      )
    }

    // Real authentication
    const connection = await getDatabaseConnection()

    try {
      // Query affiliate from database
      const result = await connection.query(
        `SELECT 
          affiliate_id,
          affiliate_code,
          name,
          email,
          password_hash,
          status,
          commission_rate,
          photo_profile
        FROM affiliates 
        WHERE email = $1 AND status = 'active'`,
        [email]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Email atau password salah' },
          { status: 401 }
        )
      }

      const affiliate = result.rows[0]

      // Verify password
      const isValidPassword = await bcrypt.compare(password, affiliate.password_hash)

      if (!isValidPassword) {
        // Increment rate limit handled by checkRateLimit at start
        return NextResponse.json(
          { success: false, error: 'Email atau password salah' },
          { status: 401 }
        )
      }

      // Reset rate limit on success
      resetRateLimit(`ip:${clientIP}`)
      resetRateLimit(`aff:${email.toLowerCase().trim()}`)

      // Generate JWT token
      const token = jwt.sign(
        {
          affiliateId: affiliate.affiliate_id,
          email: affiliate.email,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // Return user data (without password)
      const userData = {
        affiliateId: affiliate.affiliate_id,
        affiliateCode: affiliate.affiliate_code,
        name: affiliate.name,
        email: affiliate.email,
        status: affiliate.status,
        commissionRate: affiliate.commission_rate,
        photoProfile: affiliate.photo_profile,
      }

      return NextResponse.json({
        success: true,
        data: {
          token,
          user: userData,
        },
      })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat login' },
      { status: 500 }
    )
  }
}

