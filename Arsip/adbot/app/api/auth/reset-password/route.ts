import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { getDatabaseConnection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors';

// Validasi password
function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password minimal 8 karakter' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: 'Password harus mengandung huruf kecil' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: 'Password harus mengandung huruf besar' };
  }
  if (!/(?=.*[0-9])/.test(password)) {
    return { isValid: false, error: 'Password harus mengandung angka' };
  }
  return { isValid: true };
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null;
  
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validasi input
    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token dan password harus diisi' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error || 'Password tidak valid' },
        { status: 400 }
      );
    }

    // Get database connection
    try {
      connection = await getDatabaseConnection();
    } catch (dbError) {
      if (isDatabaseConnectionError(dbError)) {
        const sanitized = sanitizeErrorForLogging(dbError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [Reset Password] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
        return NextResponse.json(
          {
            success: false,
            error: getGenericDatabaseErrorMessage(),
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    try {
      // Cek apakah token valid dan belum kadaluarsa
      let result;
      try {
        result = await connection.query(
          `SELECT no, email, password_reset_expires 
           FROM data_user 
           WHERE password_reset_token = $1 
           AND password_reset_expires > NOW() 
           AND status_user = $2`,
          [token, 'aktif']
        );
      } catch (queryError: any) {
        // Jika kolom tidak ada, return error
        if (queryError.code === '42703') { // column does not exist
          connection.release();
          return NextResponse.json(
            { success: false, error: 'Fitur reset password belum dikonfigurasi dengan benar' },
            { status: 500 }
          );
        }
        throw queryError;
      }

      if (result.rows.length === 0) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Token tidak valid atau sudah kadaluarsa' },
          { status: 400 }
        );
      }

      const user = result.rows[0];

      // Hash password baru
      const hashedPassword = await hashPassword(password);

      // Update password dan hapus reset token
      try {
        await connection.query(
          `UPDATE data_user 
           SET password = $1, 
               password_reset_token = NULL, 
               password_reset_expires = NULL,
               update_at = NOW()
           WHERE no = $2`,
          [hashedPassword, user.no]
        );
      } catch (updateError: any) {
        if (updateError.code === '42703') { // column does not exist
          connection.release();
          return NextResponse.json(
            { success: false, error: 'Fitur reset password belum dikonfigurasi dengan benar' },
            { status: 500 }
          );
        }
        throw updateError;
      }

      connection.release();

      return NextResponse.json({
        success: true,
        message: 'Password berhasil direset',
      });
    } catch (error: any) {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          // Ignore release error
        }
      }

      const sanitized = sanitizeErrorForLogging(error);
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [Reset Password] Error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      return NextResponse.json(
        {
          success: false,
          error: process.env.NODE_ENV === 'development' 
            ? `Error: ${error.message || 'Terjadi kesalahan saat reset password'}`
            : 'Terjadi kesalahan saat reset password. Silakan coba lagi.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        // Ignore release error
      }
    }

    if (isDatabaseConnectionError(error)) {
      const sanitized = sanitizeErrorForLogging(error);
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      return NextResponse.json(
        {
          success: false,
          error: getGenericDatabaseErrorMessage(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat reset password. Silakan coba lagi.',
      },
      { status: 500 }
    );
  }
}

