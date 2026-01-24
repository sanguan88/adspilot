import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

// PUT /api/pixels/[id] - Update pixel
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, response, affiliate } = await requireAffiliateAuth(request)
        if (!authorized || !affiliate) return response

        const { id } = await params
        const body = await request.json()
        const { name, isActive, pixelId } = body

        const connection = await getDatabaseConnection()

        try {
            // Verify ownership
            const check = await connection.query(
                `SELECT id FROM affiliate_pixels WHERE id = $1 AND affiliate_id = $2`,
                [id, affiliate.affiliateId]
            )

            if (check.rows.length === 0) {
                return NextResponse.json({ success: false, error: 'Pixel not found' }, { status: 404 })
            }

            await connection.query(
                `UPDATE affiliate_pixels 
         SET name = COALESCE($1, name), 
             is_active = COALESCE($2, is_active),
             pixel_id = COALESCE($3, pixel_id),
             updated_at = NOW()
         WHERE id = $4`,
                [name, isActive, pixelId, id]
            )

            return NextResponse.json({ success: true })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Update pixel error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/pixels/[id] - Delete pixel
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { authorized, response, affiliate } = await requireAffiliateAuth(request)
        if (!authorized || !affiliate) return response

        const { id } = await params
        const connection = await getDatabaseConnection()

        try {
            // Verify ownership
            const check = await connection.query(
                `SELECT id FROM affiliate_pixels WHERE id = $1 AND affiliate_id = $2`,
                [id, affiliate.affiliateId]
            )

            if (check.rows.length === 0) {
                return NextResponse.json({ success: false, error: 'Pixel not found' }, { status: 404 })
            }

            await connection.query(
                `DELETE FROM affiliate_pixels WHERE id = $1`,
                [id]
            )

            return NextResponse.json({ success: true })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Delete pixel error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
