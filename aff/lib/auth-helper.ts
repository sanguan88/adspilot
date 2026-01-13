import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getDatabaseConnection } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AffiliateUser {
    affiliateId: string
    email: string
    name: string
    affiliateCode: string
    status: string
}

/**
 * Gets the current authenticated affiliate from the request header
 */
export async function getAuthenticatedAffiliate(request: NextRequest): Promise<AffiliateUser | null> {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.substring(7)

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        const affiliateId = decoded.affiliateId

        if (!affiliateId) return null

        // Verify affiliate exists and is active in database
        const connection = await getDatabaseConnection()
        try {
            const result = await connection.query(
                `SELECT affiliate_id, email, name, affiliate_code, status 
         FROM affiliates 
         WHERE affiliate_id = $1 AND status = 'active'`,
                [affiliateId]
            )

            if (result.rows.length === 0) {
                return null
            }

            const row = result.rows[0]
            return {
                affiliateId: row.affiliate_id,
                email: row.email,
                name: row.name,
                affiliateCode: row.affiliate_code,
                status: row.status
            }
        } finally {
            connection.release()
        }
    } catch (error) {
        console.error('Auth helper error:', error)
        return null
    }
}

/**
 * Middleware-like function to require authentication in API routes
 */
export async function requireAffiliateAuth(request: NextRequest) {
    const affiliate = await getAuthenticatedAffiliate(request)

    if (!affiliate) {
        return {
            authorized: false,
            response: NextResponse.json(
                { success: false, error: 'Unauthorized: Silakan login terlebih dahulu' },
                { status: 401 }
            ),
            affiliate: null
        }
    }

    return {
        authorized: true,
        response: null,
        affiliate
    }
}
