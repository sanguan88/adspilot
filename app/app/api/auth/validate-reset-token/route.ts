import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let connection;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token tidak ditemukan' },
        { status: 400 }
      );
    }

    connection = await getDatabaseConnection();

    // Check if token exists and is not expired
    const result = await connection.query(
      `SELECT user_id 
       FROM data_user 
       WHERE reset_password_token = $1 
       AND reset_password_expires > NOW() AT TIME ZONE 'UTC'`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Token tidak valid atau sudah kadaluarsa' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token valid'
    });

  } catch (error: any) {
    console.error('[ValidateToken] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
