import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

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

    // 1. Find user with valid token and not expired
    const result = await connection.query(
      `SELECT user_id, username, email 
       FROM data_user 
       WHERE reset_password_token = $1 
       AND reset_password_expires > (NOW() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC'`,
      [token]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Link reset password tidak valid atau sudah kadaluarsa.' },
        { status: 400 }
      );
    }

    // 2. Hash new password
    const hashedPassword = await hashPassword(password);

    // 3. Update password and clear token
    await connection.query(
      `UPDATE data_user 
       SET password = $1, 
           reset_password_token = NULL, 
           reset_password_expires = NULL,
           update_at = NOW()
       WHERE user_id = $2`,
      [hashedPassword, user.user_id]
    );

    console.log(`[ResetPassword] Password reset successful for user: ${user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah. Silakan login dengan password baru.'
    });

  } catch (error: any) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
