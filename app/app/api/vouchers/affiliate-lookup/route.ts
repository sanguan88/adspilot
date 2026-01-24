import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

/**
 * GET - Lookup affiliate voucher by referral code
 * This is used when user clicks a referral link with ?ref= parameter
 */
export async function GET(request: NextRequest) {
    let connection = null
    try {
        const { searchParams } = new URL(request.url)
        const refCode = searchParams.get('ref')

        if (!refCode) {
            return NextResponse.json({
                success: false,
                error: 'Referral code required'
            }, { status: 400 })
        }

        // Extract base affiliate code (handle custom suffixes like CODE_IG, CODE_TIKTOK)
        const baseCode = refCode.split('_')[0]

        connection = await getDatabaseConnection()

        // Find affiliate by code (partial match for custom refs)
        const affiliateResult = await connection.query(
            `SELECT affiliate_id, affiliate_code FROM affiliates 
             WHERE affiliate_code = $1 OR affiliate_code LIKE $2
             LIMIT 1`,
            [refCode, `${baseCode}%`]
        )

        if (affiliateResult.rows.length === 0) {
            console.log('[Voucher Lookup] No affiliate found for ref:', refCode)
            return NextResponse.json({
                success: false,
                error: 'Affiliate not found'
            }, { status: 404 })
        }

        const affiliate = affiliateResult.rows[0]

        // Find active voucher for this affiliate
        const voucherResult = await connection.query(
            `SELECT voucher_code, discount_type, discount_value 
             FROM affiliate_vouchers 
             WHERE affiliate_id = $1 AND is_active = true
             LIMIT 1`,
            [affiliate.affiliate_id]
        )

        if (voucherResult.rows.length === 0) {
            console.log('[Voucher Lookup] No active voucher for affiliate:', affiliate.affiliate_code)
            return NextResponse.json({
                success: false,
                error: 'No active voucher for this affiliate'
            }, { status: 404 })
        }

        const voucher = voucherResult.rows[0]
        console.log('[Voucher Lookup] Found voucher:', voucher.voucher_code, 'for ref:', refCode)

        return NextResponse.json({
            success: true,
            data: {
                voucherCode: voucher.voucher_code,
                discountType: voucher.discount_type,
                discountValue: voucher.discount_value,
                affiliateCode: affiliate.affiliate_code
            }
        })
    } catch (error: any) {
        console.error('Error looking up affiliate voucher:', error)
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    } finally {
        if (connection) connection.release()
    }
}
