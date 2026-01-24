import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAffiliate } from '@/lib/auth-helper'
import { getDatabaseConnection } from '@/lib/db'

/**
 * GET - List vouchers owned by authenticated affiliate
 */
export async function GET(request: NextRequest) {
    let connection = null;
    try {
        const affiliate = await getAuthenticatedAffiliate(request)
        if (!affiliate) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        connection = await getDatabaseConnection()
        const result = await connection.query(
            `SELECT 
          id,
          voucher_code,
          discount_type,
          discount_value,
          is_active,
          usage_count,
          created_at,
          updated_at
        FROM affiliate_vouchers
        WHERE affiliate_id = $1
        ORDER BY created_at DESC`,
            [affiliate.affiliateId]
        )

        return NextResponse.json({
            success: true,
            data: result.rows
        })
    } catch (error: any) {
        console.error('Error fetching affiliate vouchers:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch vouchers' },
            { status: 500 }
        )
    } finally {
        if (connection) connection.release()
    }
}

/**
 * POST - Create new voucher for authenticated affiliate
 * Only voucher_code is required, discount is fixed at 50%
 */
export async function POST(request: NextRequest) {
    let connection = null;
    try {
        const affiliate = await getAuthenticatedAffiliate(request)
        if (!affiliate) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { voucherCode } = body

        // Validate voucher code
        if (!voucherCode || typeof voucherCode !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Kode voucher wajib diisi' },
                { status: 400 }
            )
        }

        // Sanitize voucher code: uppercase, alphanumeric only, max 20 chars
        const sanitizedCode = voucherCode
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 20)

        if (sanitizedCode.length < 3) {
            return NextResponse.json(
                { success: false, error: 'Kode voucher minimal 3 karakter' },
                { status: 400 }
            )
        }

        connection = await getDatabaseConnection()

        // Check if voucher code already exists (globally unique)
        const existing = await connection.query(
            `SELECT id FROM affiliate_vouchers WHERE voucher_code = $1`,
            [sanitizedCode]
        )

        if (existing.rows.length > 0) {
            return NextResponse.json(
                { success: false, error: `Kode voucher "${sanitizedCode}" sudah digunakan. Pilih kode lain.` },
                { status: 400 }
            )
        }

        // Check if affiliate already has a voucher (limit 1 per affiliate for now)
        const affiliateVouchers = await connection.query(
            `SELECT id FROM affiliate_vouchers WHERE affiliate_id = $1`,
            [affiliate.affiliateId]
        )

        if (affiliateVouchers.rows.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Anda sudah memiliki voucher. Hapus voucher lama untuk membuat yang baru.' },
                { status: 400 }
            )
        }

        // Create voucher with fixed 50% discount
        const insertResult = await connection.query(
            `INSERT INTO affiliate_vouchers 
          (affiliate_id, voucher_code, discount_type, discount_value, is_active)
        VALUES ($1, $2, 'percentage', 50.00, true)
        RETURNING id, voucher_code, discount_type, discount_value, is_active, created_at`,
            [affiliate.affiliateId, sanitizedCode]
        )

        return NextResponse.json({
            success: true,
            message: 'Voucher berhasil dibuat!',
            data: insertResult.rows[0]
        })
    } catch (error: any) {
        console.error('Error creating affiliate voucher:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create voucher' },
            { status: 500 }
        )
    } finally {
        if (connection) connection.release()
    }
}

/**
 * DELETE - Delete affiliate's voucher
 */
export async function DELETE(request: NextRequest) {
    let connection = null;
    try {
        const affiliate = await getAuthenticatedAffiliate(request)
        if (!affiliate) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const voucherId = searchParams.get('id')

        if (!voucherId) {
            return NextResponse.json(
                { success: false, error: 'Voucher ID required' },
                { status: 400 }
            )
        }

        connection = await getDatabaseConnection()
        await connection.query(
            `DELETE FROM affiliate_vouchers 
        WHERE id = $1 AND affiliate_id = $2`,
            [voucherId, affiliate.affiliateId]
        )

        return NextResponse.json({
            success: true,
            message: 'Voucher berhasil dihapus'
        })
    } catch (error: any) {
        console.error('Error deleting affiliate voucher:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete voucher' },
            { status: 500 }
        )
    } finally {
        if (connection) connection.release()
    }
}
