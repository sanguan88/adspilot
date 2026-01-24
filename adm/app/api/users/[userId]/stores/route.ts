import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

/**
 * GET /api/users/[userId]/stores
 * Get list of stores assigned to a user
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    let connection: PoolClient | null = null

    try {
        try {
            // Check permission
            await requirePermission(request, 'canManageUsers')

            const { userId } = await params
            connection = await getDatabaseConnection()

            // Get all stores owned by this user
            const storesResult = await connection.query(
                `SELECT 
        id_toko,
        nama_toko,
        status_toko,
        created_at,
        update_at
       FROM data_toko 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
                [userId]
            )

            const stores = storesResult.rows.map((row: any) => ({
                idToko: row.id_toko,
                namaToko: row.nama_toko,
                status: row.status_toko,
                createdAt: row.created_at,
                updatedAt: row.update_at,
            }))

            return NextResponse.json({
                success: true,
                data: {
                    userId,
                    stores,
                    total: stores.length,
                },
            })
        } catch (error: any) {
            if (error.message === 'Authentication required') {
                return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
            }
            if (error.message.startsWith('Permission denied')) {
                return NextResponse.json({ success: false, error: error.message }, { status: 403 })
            }

            console.error('Error fetching user stores:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: error.message || 'Gagal mengambil data stores',
                },
                { status: 500 }
            )
        }
    } catch (error: any) {
        console.error('Outer error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

/**
 * POST /api/users/[userId]/stores
 * Assign a store to a user (transfer ownership)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    let connection: PoolClient | null = null

    try {
        try {
            // Check permission
            const adminUser = await requirePermission(request, 'canManageUsers')

            const { userId } = await params
            const body = await request.json()
            const { idToko } = body

            if (!idToko) {
                return NextResponse.json(
                    { success: false, error: 'idToko harus diisi' },
                    { status: 400 }
                )
            }

            connection = await getDatabaseConnection()

            // Check if store exists
            const storeCheck = await connection.query(
                'SELECT id_toko, nama_toko, user_id FROM data_toko WHERE id_toko = $1',
                [idToko]
            )

            if (storeCheck.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Toko tidak ditemukan' },
                    { status: 404 }
                )
            }

            const store = storeCheck.rows[0]
            const previousOwnerId = store.user_id

            // Check if already owned by this user
            if (previousOwnerId === userId) {
                return NextResponse.json(
                    { success: false, error: 'Toko sudah dimiliki oleh user ini' },
                    { status: 400 }
                )
            }

            // Transfer ownership
            await connection.query(
                `UPDATE data_toko 
       SET user_id = $1, update_at = NOW()
       WHERE id_toko = $2`,
                [userId, idToko]
            )

            // Log audit
            await logAudit({
                userId: adminUser.userId,
                userEmail: adminUser.email,
                userRole: adminUser.role,
                action: AuditActions.STORE_ASSIGN,
                resourceType: ResourceTypes.STORE,
                resourceId: idToko,
                resourceName: store.nama_toko,
                description: `Assigned store "${store.nama_toko}" to user ${userId}`,
                oldValues: { ownerId: previousOwnerId },
                newValues: { ownerId: userId },
                ipAddress: getIpAddress(request),
                userAgent: getUserAgent(request),
            })

            return NextResponse.json({
                success: true,
                message: `Toko "${store.nama_toko}" berhasil di-assign ke user`,
                data: {
                    idToko,
                    namaToko: store.nama_toko,
                    previousOwnerId,
                    newOwnerId: userId,
                },
            })
        } catch (error: any) {
            if (error.message === 'Authentication required') {
                return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
            }
            if (error.message.startsWith('Permission denied')) {
                return NextResponse.json({ success: false, error: error.message }, { status: 403 })
            }

            console.error('Error assigning store to user:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: error.message || 'Gagal assign store',
                },
                { status: 500 }
            )
        }
    } catch (error: any) {
        console.error('Outer error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

/**
 * DELETE /api/users/[userId]/stores/[idToko]
 * Unassign a store from a user (set user_id to NULL or transfer to another user)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    let connection: PoolClient | null = null

    try {
        try {
            // Check permission
            const adminUser = await requirePermission(request, 'canManageUsers')

            const { userId } = await params
            const { searchParams } = new URL(request.url)
            const idToko = searchParams.get('idToko')

            if (!idToko) {
                return NextResponse.json(
                    { success: false, error: 'idToko harus diisi' },
                    { status: 400 }
                )
            }

            connection = await getDatabaseConnection()

            // Check if store exists and belongs to this user
            const storeCheck = await connection.query(
                'SELECT id_toko, nama_toko, user_id FROM data_toko WHERE id_toko = $1 AND user_id = $2',
                [idToko, userId]
            )

            if (storeCheck.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Toko tidak ditemukan atau bukan milik user ini' },
                    { status: 404 }
                )
            }

            const store = storeCheck.rows[0]

            // Delete the store record (since user_id cannot be NULL)
            // Alternative: You could assign to a default "unassigned" user instead
            await connection.query(
                `DELETE FROM data_toko WHERE id_toko = $1`,
                [idToko]
            )

            // Log audit
            await logAudit({
                userId: adminUser.userId,
                userEmail: adminUser.email,
                userRole: adminUser.role,
                action: AuditActions.STORE_UNASSIGN,
                resourceType: ResourceTypes.STORE,
                resourceId: idToko,
                resourceName: store.nama_toko,
                description: `Unassigned (deleted) store "${store.nama_toko}" from user ${userId}`,
                oldValues: { ownerId: userId, storeName: store.nama_toko },
                newValues: { deleted: true },
                ipAddress: getIpAddress(request),
                userAgent: getUserAgent(request),
            })

            return NextResponse.json({
                success: true,
                message: `Toko "${store.nama_toko}" berhasil di-unassign dari user`,
                data: {
                    idToko,
                    namaToko: store.nama_toko,
                    previousOwnerId: userId,
                },
            })
        } catch (error: any) {
            if (error.message === 'Authentication required') {
                return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
            }
            if (error.message.startsWith('Permission denied')) {
                return NextResponse.json({ success: false, error: error.message }, { status: 403 })
            }

            console.error('Error unassigning store from user:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: error.message || 'Gagal unassign store',
                },
                { status: 500 }
            )
        }
    } catch (error: any) {
        console.error('Outer error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
