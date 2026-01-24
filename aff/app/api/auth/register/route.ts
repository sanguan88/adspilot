import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, password, whatsapp, telegram } = body

        if (!name || !email || !password) {
            return NextResponse.json(
                { success: false, error: 'Nama, email, dan password harus diisi' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password minimal 8 karakter' },
                { status: 400 }
            )
        }

        const connection = await getDatabaseConnection()

        try {
            // 1. Check if email already exists
            const existingUser = await connection.query(
                'SELECT affiliate_id FROM affiliates WHERE email = $1',
                [email]
            )

            if (existingUser.rows.length > 0) {
                return NextResponse.json(
                    { success: false, error: 'Email sudah terdaftar' },
                    { status: 400 }
                )
            }

            // 2. Generate Affiliate Code
            // Generate random code: 3 letters of name + 4 random chars
            const namePrefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'AFF')
            const randomSuffix = randomUUID().substring(0, 4).toUpperCase()
            const affiliateCode = `${namePrefix}${randomSuffix}`

            // 3. Hash Password
            const salt = await bcrypt.genSalt(10)
            const passwordHash = await bcrypt.hash(password, salt)

            // 4. Get Default Commission Rate
            const settingsRes = await connection.query(
                "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'default_commission_rate'"
            )
            const defaultRate = parseFloat(settingsRes.rows[0]?.setting_value || '10')

            // 5. Insert New Affiliate
            const affiliateId = randomUUID()

            await connection.query(
                `INSERT INTO affiliates (
          affiliate_id, affiliate_code, name, email, password_hash, 
          status, commission_rate, whatsapp_number, telegram_username, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, NOW(), NOW())`,
                [affiliateId, affiliateCode, name, email, passwordHash, defaultRate, whatsapp, telegram]
            )

            // 6. Generate Token for Auto-Login
            const token = jwt.sign(
                {
                    affiliateId: affiliateId,
                    email: email,
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            )

            return NextResponse.json({
                success: true,
                message: 'Registrasi berhasil',
                data: {
                    token,
                    user: {
                        affiliateId,
                        affiliateCode,
                        name,
                        email,
                        status: 'active',
                        commissionRate: defaultRate
                    }
                }
            })

        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Register error:', error)
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat registrasi' },
            { status: 500 }
        )
    }
}
