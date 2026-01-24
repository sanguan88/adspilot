import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { getDatabaseConnection } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null;
  
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validasi input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    connection = await getDatabaseConnection();

    try {
      // Cari user berdasarkan username
      const result = await connection.query(
        `SELECT 
          no, username, password, email, nama_lengkap, 
          role, kode_site, nama_site, kode_tim, status_user
        FROM data_user 
        WHERE username = $1 AND status_user = 'aktif'`,
        [username]
      );

      const users = result.rows;

      if (users.length === 0) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Username atau password salah' },
          { status: 401 }
        );
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Username atau password salah' },
          { status: 401 }
        );
      }

      // Update last_login
      await connection.query(
        'UPDATE data_user SET last_login = NOW() WHERE no = $1',
        [user.no]
      );

      connection.release();

      // Generate token
      const token = generateToken({
        userId: user.no,
        username: user.username,
        email: user.email,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        kode_site: user.kode_site || undefined,
        nama_site: user.nama_site || undefined,
        kode_tim: user.kode_tim || undefined,
      });

      // Return response dengan token
      const response = NextResponse.json({
        success: true,
        data: {
          token,
          user: {
            userId: user.no,
            username: user.username,
            email: user.email,
            nama_lengkap: user.nama_lengkap,
            role: user.role,
            kode_site: user.kode_site,
            nama_site: user.nama_site,
            kode_tim: user.kode_tim,
          },
        },
      });

      // Set cookie untuk token (opsional, untuk web)
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 hari
        path: '/',
      });

      return response;
    } catch (error) {
      if (connection) {
        connection.release();
      }
      throw error;
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Terjadi kesalahan saat login',
      },
      { status: 500 }
    );
  }
}
