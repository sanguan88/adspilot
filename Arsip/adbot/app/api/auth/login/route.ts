import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { getDatabaseConnection } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { checkRateLimit, getClientIP, resetRateLimit } from '@/lib/rate-limit';
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors';

// Helper function untuk extract filename dari path photo_profile
function extractPhotoFilename(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null;
  // Extract hanya nama file dari path seperti "uploads/xxx.jpg" -> "xxx.jpg"
  const parts = photoPath.split('/');
  return parts[parts.length - 1] || null;
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null;
  
  try {
    const body = await request.json();
    const { 
      username, 
      password
    } = body;

    // Validasi input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username/Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Rate limiting - check berdasarkan IP dan username
    const clientIP = getClientIP(request);
    const ipRateLimit = checkRateLimit(`ip:${clientIP}`);
    const usernameRateLimit = checkRateLimit(`user:${username.toLowerCase().trim()}`);

    // Block jika salah satu identifier di-block
    if (!ipRateLimit.allowed || !usernameRateLimit.allowed) {
      const resetTime = Math.max(ipRateLimit.resetTime, usernameRateLimit.resetTime);
      const minutesRemaining = Math.ceil((resetTime - Date.now()) / (60 * 1000));
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${minutesRemaining} menit.` 
        },
        { status: 429 }
      );
    }

    // Get database connection dengan error handling khusus
    try {
      connection = await getDatabaseConnection();
    } catch (dbError) {
      // Jika error koneksi database, return pesan generik
      if (isDatabaseConnectionError(dbError)) {
        const sanitized = sanitizeErrorForLogging(dbError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [Login] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
        // Log detail error di development untuk debugging
        if (process.env.NODE_ENV === 'development') {
          console.error(`[${timestamp}] [Login] Error details:`, {
            code: (dbError as any)?.code,
            message: (dbError as any)?.message,
            name: (dbError as any)?.name,
          });
        }
        
        return NextResponse.json(
          {
            success: false,
            error: getGenericDatabaseErrorMessage(),
          },
          { status: 503 } // Service Unavailable
        );
      }
      // Jika bukan database error, throw untuk ditangani di catch block utama
      throw dbError;
    }

    try {
      // Cari user berdasarkan username atau email (case-insensitive)
      // Allow login for both 'aktif' and 'pending_payment' status
      const result = await connection.query(
        `SELECT 
          no, user_id, username, password, email, nama_lengkap, 
          role, status_user, photo_profile
        FROM data_user 
        WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)) 
        AND status_user IN ('aktif', 'pending_payment')`,
        [username.trim()]
      );

      const users = result.rows;

      // Bedakan antara user tidak ditemukan vs password salah
      if (users.length === 0) {
        connection.release();
        // Increment rate limit untuk failed attempt
        checkRateLimit(`ip:${clientIP}`);
        checkRateLimit(`user:${username.toLowerCase().trim()}`);
        
        return NextResponse.json(
          { success: false, error: 'Username/Email atau password salah' },
          { status: 401 }
        );
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        connection.release();
        // Increment rate limit untuk failed attempt
        checkRateLimit(`ip:${clientIP}`);
        checkRateLimit(`user:${username.toLowerCase().trim()}`);
        
        return NextResponse.json(
          { success: false, error: 'Username/Email atau password salah' },
          { status: 401 }
        );
      }

      // Reset rate limit pada successful login
      resetRateLimit(`ip:${clientIP}`);
      resetRateLimit(`user:${username.toLowerCase().trim()}`);

      // Update last_login dengan error handling
      try {
      await connection.query(
        'UPDATE data_user SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
      );
      } catch (updateError: any) {
        // Log error tapi jangan block login process
        console.error('[Login] Error updating last_login:', updateError?.message || 'Unknown error');
        // Release connection dan continue
        if (connection) {
          try {
            connection.release();
          } catch (releaseError) {
            // Ignore release error
          }
        }
      }

      // Release connection setelah semua operasi selesai
      if (connection) {
        try {
      connection.release();
        } catch (releaseError) {
          console.error('[Login] Error releasing connection:', releaseError);
        }
      }

      // Generate token - use user_id (VARCHAR) instead of no (INTEGER)
      const token = generateToken({
        userId: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
      });

      // Extract photo filename dari path
      // Return full path from database, not just filename
      // Helper function will handle the URL generation in frontend

      // Return response dengan token
      const response = NextResponse.json({
        success: true,
        data: {
          token,
          user: {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            nama_lengkap: user.nama_lengkap,
            role: user.role,
            status_user: user.status_user, // Include status for frontend redirect logic
            photo_profile: user.photo_profile, // Return full path from database
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
        try {
        connection.release();
        } catch (releaseError) {
          // Ignore release error
        }
      }
      
      // Log error untuk debugging
      const errorMessage = (error as any)?.message || 'Unknown error';
      const errorCode = (error as any)?.code || 'UNKNOWN';
      console.error('[Login] Error in try block:', {
        message: errorMessage,
        code: errorCode,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      });
      
      // Check jika error adalah database connection error (bukan query error)
      // Query error biasanya memiliki code seperti '42P01' (table does not exist), '42703' (column does not exist), dll
      const isQueryError = errorCode && (
        errorCode.startsWith('42') || // PostgreSQL syntax/query errors
        errorCode.startsWith('427') || // PostgreSQL column/table errors
        errorMessage.toLowerCase().includes('relation') ||
        errorMessage.toLowerCase().includes('column') ||
        errorMessage.toLowerCase().includes('syntax')
      );
      
      // Check untuk "Connection terminated unexpectedly" error
      const isConnectionTerminated = errorCode === 'UNKNOWN' && 
        (errorMessage.includes('Connection terminated') || 
         errorMessage.includes('connection terminated'));
      
      // Hanya anggap sebagai connection error jika bukan query error
      if (!isQueryError && (isDatabaseConnectionError(error) || isConnectionTerminated)) {
        const sanitized = sanitizeErrorForLogging(error);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        console.error(`[${timestamp}] Error details:`, {
          code: errorCode,
          message: errorMessage,
          isConnectionTerminated
        });
        
        return NextResponse.json(
          {
            success: false,
            error: process.env.NODE_ENV === 'development' 
              ? `Database connection error: ${errorMessage}. Silakan pastikan database server berjalan.`
              : 'Database tidak dapat diakses saat ini. Silakan coba lagi dalam beberapa saat.',
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      // Jika query error, return error yang lebih spesifik
      if (isQueryError) {
        return NextResponse.json(
          {
            success: false,
            error: process.env.NODE_ENV === 'development' 
              ? `Query error: ${errorMessage}`
              : 'Terjadi kesalahan saat memproses data. Silakan coba lagi.',
            error_code: 'QUERY_ERROR'
          },
          { status: 500 }
        );
      }
      
      // Jika bukan database error, throw untuk ditangani di catch block utama
      throw error;
    }
  } catch (error) {
    // Release connection jika masih ada
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        // Ignore release error
      }
    }

    // Check jika error adalah database connection error
    if (isDatabaseConnectionError(error)) {
      const sanitized = sanitizeErrorForLogging(error);
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      // Log detail error di development
      if (process.env.NODE_ENV === 'development') {
        console.error(`[${timestamp}] Database connection error details:`, {
          message: (error as any)?.message,
          code: (error as any)?.code,
          name: (error as any)?.name,
          stack: (error as any)?.stack
        });
      }
      
      return NextResponse.json(
        {
          success: false,
          error: process.env.NODE_ENV === 'development' 
            ? `Database error: ${(error as any)?.message || getGenericDatabaseErrorMessage()}`
            : getGenericDatabaseErrorMessage(),
        },
        { status: 503 } // Service Unavailable
      );
    }

    // Untuk error lainnya, log minimal info tanpa data sensitif
    const sanitized = sanitizeErrorForLogging(error);
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Login error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
    
    // Log detail error di development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${timestamp}] Login error details:`, {
        message: (error as any)?.message,
        code: (error as any)?.code,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      });
    }
    
    // Jangan expose error message yang mungkin mengandung info sensitif
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? `Error: ${(error as any)?.message || 'Terjadi kesalahan saat login. Silakan coba lagi.'}`
          : 'Terjadi kesalahan saat login. Silakan coba lagi.',
      },
      { status: 500 }
    );
  }
}
