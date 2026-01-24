import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { getDatabaseConnection } from '@/lib/db';
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors';

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token tidak ditemukan' },
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
        console.error(`[${timestamp}] [Validate Reset Token] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
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
      // Cek apakah kolom password_reset_token ada
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

      connection.release();

      return NextResponse.json({
        success: true,
        message: 'Token valid',
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
      console.error(`[${timestamp}] [Validate Reset Token] Error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Terjadi kesalahan saat memvalidasi token',
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
        error: 'Terjadi kesalahan saat memvalidasi token',
      },
      { status: 500 }
    );
  }
}

