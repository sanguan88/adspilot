import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

/**
 * PUT - Update individual affiliate settings
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { affiliateId: string } }
) {
    try {
        const adminUser = await requirePermission(request, 'canManageAffiliates')
        const { affiliateId } = params
        const body = await request.json()
        const { commissionRate, status } = body

        const result = await withDatabaseConnection(async (connection) => {
            // Get old info for audit
            const checkResult = await connection.query(
                'SELECT name, email, commission_rate, status FROM affiliates WHERE affiliate_id = $1',
                [affiliateId]
            )

            if (checkResult.rows.length === 0) {
                return { error: 'Affiliate tidak ditemukan' }
            }

            const oldAff = checkResult.rows[0]

            // Update
            const updates: string[] = []
            const values: any[] = []
            let counter = 1

            if (commissionRate !== undefined) {
                updates.push(`commission_rate = $${counter++}`)
                values.push(commissionRate === null ? null : parseFloat(commissionRate))
            }

            if (status !== undefined) {
                updates.push(`status = $${counter++}`)
                values.push(status)
            }

            if (updates.length === 0) {
                return { error: 'Tidak ada data yang diupdate' }
            }

            updates.push(`updated_at = NOW()`)

            values.push(affiliateId)
            const query = `UPDATE affiliates SET ${updates.join(', ')} WHERE affiliate_id = $${counter} RETURNING *`

            const updateResult = await connection.query(query, values)
            const updatedAff = updateResult.rows[0]

            // Log Audit
            await logAudit({
                userId: adminUser.userId,
                userEmail: adminUser.email,
                userRole: adminUser.role,
                action: AuditActions.AFFILIATE_UPDATE,
                resourceType: ResourceTypes.AFFILIATE,
                resourceId: affiliateId,
                resourceName: updatedAff.email,
                description: `Updated affiliate commission/status for ${updatedAff.email}`,
                oldValues: { commissionRate: oldAff.commission_rate, status: oldAff.status },
                newValues: { commissionRate, status },
                ipAddress: getIpAddress(request),
                userAgent: getUserAgent(request),
            })

            return { success: true, data: updatedAff }
        })

        if (result.error) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Update affiliate error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan' },
            { status: 500 }
        )
    }
}
