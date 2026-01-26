import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    let connection;

    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                { success: false, error: 'Token dan password baru wajib diisi' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password minimal 8 karakter' },
                { status: 400 }
            );
        }

        connection = await getDatabaseConnection();

        // 1. Find affiliate with valid token and not expired
        const result = await connection.query(
            `SELECT affiliate_id, name, email 
       FROM affiliates 
       WHERE reset_password_token = $1 
       AND reset_password_expires > NOW()`,
            [token]
        );

        const affiliate = result.rows[0];

        if (!affiliate) {
            return NextResponse.json(
                { success: false, error: 'Link reset password tidak valid atau sudah kadaluarsa.' },
                { status: 400 }
            );
        }

        // 2. Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Update password and clear token
        await connection.query(
            `UPDATE affiliates 
       SET password_hash = $1, 
           reset_password_token = NULL, 
           reset_password_expires = NULL,
           updated_at = NOW()
       WHERE affiliate_id = $2`,
            [passwordHash, affiliate.affiliate_id]
        );

        console.log(`[ResetPassword][Affiliate] Password reset successful for: ${affiliate.name}`);

        return NextResponse.json({
            success: true,
            message: 'Password berhasil diubah. Silakan login dengan password baru.'
        });

    } catch (error: any) {
        console.error('[ResetPassword][Affiliate] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan sistem' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}
