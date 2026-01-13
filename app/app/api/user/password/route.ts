import { NextRequest, NextResponse } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'
import { comparePassword, hashPassword } from '@/lib/auth'

export async function PUT(request: NextRequest) {
    let connection = null
    try {
        const user = await requireActiveStatus(request)
        const body = await request.json()

        const { currentPassword, newPassword, confirmPassword } = body

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Semua field harus diisi',
                },
                { status: 400 }
            )
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Password baru dan konfirmasi password tidak cocok',
                },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Password baru minimal 6 karakter',
                },
                { status: 400 }
            )
        }

        connection = await getDatabaseConnection()

        // Get current password from database
        const userResult = await connection.query(
            'SELECT password FROM data_user WHERE user_id = $1',
            [user.userId]
        )

        if (!userResult.rows || userResult.rows.length === 0) {
            connection.release()
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            )
        }

        const currentHashedPassword = userResult.rows[0].password

        // Verify current password
        const isPasswordValid = await comparePassword(currentPassword, currentHashedPassword)

        if (!isPasswordValid) {
            connection.release()
            return NextResponse.json(
                {
                    success: false,
                    error: 'Password lama tidak sesuai',
                },
                { status: 401 }
            )
        }

        // Hash new password
        const newHashedPassword = await hashPassword(newPassword)

        // Update password
        await connection.query(
            'UPDATE data_user SET password = $1, update_at = NOW() WHERE user_id = $2',
            [newHashedPassword, user.userId]
        )

        connection.release()

        return NextResponse.json({
            success: true,
            message: 'Password berhasil diubah'
        })
    } catch (error: any) {
        if (connection) {
            try {
                connection.release()
            } catch (releaseError) {
                // Ignore release error
            }
        }

        console.error('Change password error:', error)

        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Gagal mengubah password',
            },
            { status: 500 }
        )
    }
}
