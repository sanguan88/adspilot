import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'
import { requirePermission } from '@/lib/auth-helper'

/**
 * POST - Manually assign a user to an affiliate and optionally create retroactive commissions
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        // 1. Require admin/superadmin permission
        const adminUser = await requirePermission(request, 'canManageUsers')

        const { userId } = params
        const body = await request.json()
        const { affiliateId, commissions } = body
        // commissions: Array<{ transactionId: string, amount: number, type: 'first_payment' | 'recurring' }>

        if (!affiliateId) {
            return NextResponse.json(
                { success: false, error: 'Affiliate ID harus diisi' },
                { status: 400 }
            )
        }

        const result = await withDatabaseConnection(async (connection) => {
            // 2. Fetch affiliate details
            const affiliateResult = await connection.query(
                'SELECT affiliate_id, affiliate_code, commission_rate FROM affiliates WHERE affiliate_id = $1',
                [affiliateId]
            )

            if (affiliateResult.rows.length === 0) {
                return { error: 'Affiliate tidak ditemukan' }
            }

            const affiliate = affiliateResult.rows[0]

            // 3. Fetch user details
            const userResult = await connection.query(
                'SELECT user_id, email, username, referred_by_affiliate FROM data_user WHERE user_id = $1',
                [userId]
            )

            if (userResult.rows.length === 0) {
                return { error: 'User tidak ditemukan' }
            }

            const user = userResult.rows[0]

            // Start DB transaction
            await connection.query('BEGIN')

            try {
                // 4. Update data_user
                await connection.query(
                    `UPDATE data_user 
           SET referred_by_affiliate = $1, 
               referral_date = COALESCE(referral_date, NOW()),
               update_at = NOW()
           WHERE user_id = $2`,
                    [affiliate.affiliate_code, userId]
                )

                // 5. Upsert affiliate_referrals
                const existingReferral = await connection.query(
                    'SELECT referral_id FROM affiliate_referrals WHERE user_id = $1',
                    [userId]
                )

                let referralId;
                if (existingReferral.rows.length > 0) {
                    referralId = existingReferral.rows[0].referral_id
                    await connection.query(
                        'UPDATE affiliate_referrals SET affiliate_id = $1, status = $2, updated_at = NOW() WHERE referral_id = $3',
                        [affiliateId, 'converted', referralId]
                    )
                } else {
                    const insertReferral = await connection.query(
                        `INSERT INTO affiliate_referrals (
              affiliate_id, user_id, referral_code, status, created_at, signup_date
            ) VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING referral_id`,
                        [affiliateId, userId, affiliate.affiliate_code, 'converted']
                    )
                    referralId = insertReferral.rows[0].referral_id
                }

                // 6. Process Commissions
                if (commissions && Array.isArray(commissions)) {
                    for (const comm of commissions) {
                        // Check if transaction exists and belongs to user
                        const trxCheck = await connection.query(
                            'SELECT transaction_id FROM transactions WHERE transaction_id = $1 AND user_id = $2',
                            [comm.transactionId, userId]
                        )

                        if (trxCheck.rows.length === 0) continue;

                        // Update transaction to link to affiliate
                        await connection.query(
                            'UPDATE transactions SET voucher_affiliate_id = $1 WHERE transaction_id = $2',
                            [affiliateId, comm.transactionId]
                        )

                        // Check if commission already exists for this transaction
                        const commCheck = await connection.query(
                            'SELECT commission_id FROM affiliate_commissions WHERE transaction_id = $1 OR order_id = $1',
                            [comm.transactionId]
                        )

                        if (commCheck.rows.length > 0) {
                            // Update existing commission
                            await connection.query(
                                `UPDATE affiliate_commissions 
                 SET affiliate_id = $1, 
                     referral_id = $2, 
                     amount = $3, 
                     type = $4,
                     notes = $5
                 WHERE commission_id = $6`,
                                [affiliateId, referralId, comm.amount, comm.type || 'recurring', 'Manual assignment by admin', commCheck.rows[0].commission_id]
                            )
                        } else {
                            // Create new commission
                            await connection.query(
                                `INSERT INTO affiliate_commissions (
                  affiliate_id, referral_id, user_id, transaction_id, order_id, 
                  type, amount, commission_rate, status, created_at, notes
                ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, 'pending', NOW(), $8)`,
                                [
                                    affiliateId,
                                    referralId,
                                    userId,
                                    comm.transactionId,
                                    comm.type || 'recurring',
                                    comm.amount,
                                    affiliate.commission_rate,
                                    'Manual assignment by admin'
                                ]
                            )
                        }
                    }
                }

                // Log audit
                await logAudit({
                    userId: adminUser.userId,
                    userEmail: adminUser.email,
                    userRole: adminUser.role,
                    action: AuditActions.USER_UPDATE,
                    resourceType: ResourceTypes.USER,
                    resourceId: userId,
                    resourceName: user.email,
                    description: `Manually assigned user to affiliate: ${affiliate.affiliate_code}`,
                    oldValues: { referral: user.referred_by_affiliate },
                    newValues: { referral: affiliate.affiliate_code, commissions_processed: commissions?.length || 0 },
                    ipAddress: getIpAddress(request),
                    userAgent: getUserAgent(request),
                })

                await connection.query('COMMIT')
                return { success: true }
            } catch (err) {
                await connection.query('ROLLBACK')
                throw err
            }
        })

        if (result.error) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'User berhasil dikaitkan ke affiliate'
        })

    } catch (error: any) {
        console.error('Manual affiliate assignment error:', error)

        // Auth error handling
        if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: error.message?.includes('Unauthorized') ? 401 : 403 }
            )
        }

        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengaitkan affiliate' },
            { status: 500 }
        )
    }
}
