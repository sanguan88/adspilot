import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { randomUUID } from 'crypto'

// Force dynamic needed to read POST body
export const dynamic = 'force-dynamic'

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET

export async function POST(request: NextRequest) {
    // 1. Security Check
    // Get secret from header or body. Let's force header for security.
    const authHeader = request.headers.get('x-internal-secret')

    // Fallback: check body if not in header (for easier testing if needed, but header is standard)
    // Note: Always best to rely on env var matching
    if (!INTERNAL_API_SECRET || authHeader !== INTERNAL_API_SECRET) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized: Invalid internal secret' },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { name, email, password_hash, whatsapp, telegram } = body

        // Basic validation
        if (!name || !email || !password_hash) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: name, email, or password_hash' },
                { status: 400 }
            )
        }

        const connection = await getDatabaseConnection()

        try {
            // 2. Check if email already exists
            const existingUser = await connection.query(
                'SELECT affiliate_id, affiliate_code, status FROM affiliates WHERE email = $1',
                [email]
            )

            // If user exists, return success but explain it was existing
            if (existingUser.rows.length > 0) {
                const user = existingUser.rows[0]
                return NextResponse.json({
                    success: true,
                    isNew: false,
                    message: 'Affiliate account already exists',
                    data: {
                        affiliateId: user.affiliate_id,
                        affiliateCode: user.affiliate_code,
                        status: user.status
                    }
                })
            }

            // 3. Generate Affiliate Code
            // Logic: 3 letters of name + 4 random chars
            const namePrefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'AFF')
            const randomSuffix = randomUUID().substring(0, 4).toUpperCase()
            const affiliateCode = `${namePrefix}${randomSuffix}`

            // 4. Get Default Commission Rate
            const settingsRes = await connection.query(
                "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'default_commission_rate'"
            )
            const defaultRate = parseFloat(settingsRes.rows[0]?.setting_value || '10')

            // 5. Insert New Affiliate
            // Note: We use the existing password_hash from the main app!
            const affiliateId = randomUUID()

            await connection.query(
                `INSERT INTO affiliates (
          affiliate_id, affiliate_code, name, email, password_hash, 
          status, commission_rate, whatsapp_number, telegram_username, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, NOW(), NOW())`,
                [
                    affiliateId,
                    affiliateCode,
                    name,
                    email,
                    password_hash, // Direct hash insert
                    defaultRate,
                    whatsapp || null,
                    telegram || null
                ]
            )

            return NextResponse.json({
                success: true,
                isNew: true,
                message: 'Affiliate account created successfully',
                data: {
                    affiliateId,
                    affiliateCode,
                    name,
                    email,
                    status: 'active',
                    commissionRate: defaultRate
                }
            })

        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Internal create affiliate error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal Server Error: ' + error.message },
            { status: 500 }
        )
    }
}
