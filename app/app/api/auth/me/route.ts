import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDatabaseConnection } from '@/lib/db';
import { isDatabaseConnectionError, sanitizeErrorForLogging, getGenericDatabaseErrorMessage } from '@/lib/db-errors';

// Helper function untuk extract filename dari path photo_profile
function extractPhotoFilename(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null;
  // Extract hanya nama file dari path seperti "uploads/xxx.jpg" -> "xxx.jpg"
  const parts = photoPath.split('/');
  return parts[parts.length - 1] || null;
}

export async function GET(request: NextRequest) {
  let connection = null;
  try {
    const user = requireAuth(request);
    
    // Ambil photo_profile dari database dengan error handling
    try {
    connection = await getDatabaseConnection();
    } catch (dbError) {
      // Jika error koneksi database, return error yang tepat
      if (isDatabaseConnectionError(dbError)) {
        const sanitized = sanitizeErrorForLogging(dbError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [Auth Me] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
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
    
    // Handle both old token format (number/no) and new format (string/user_id)
    let result;
    if (typeof user.userId === 'string') {
      // New format: user_id (VARCHAR) as string
      result = await connection.query(
        'SELECT photo_profile, status_user FROM data_user WHERE user_id = $1',
        [user.userId]
      );
    } else if (typeof user.userId === 'number') {
      // Old format: no (INTEGER) - need to query by no
      result = await connection.query(
        'SELECT photo_profile, status_user FROM data_user WHERE no = $1',
        [user.userId]
      );
    } else {
      throw new Error('Invalid user ID format');
    }
    
    if (!result.rows || result.rows.length === 0) {
      connection.release();
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }
    
    const photoProfile = result.rows[0]?.photo_profile || null;
    const statusUser = result.rows[0]?.status_user || null;
    
    // Return full path, not just filename
    // If path starts with "uploads/", it's a local file
    // Otherwise, it's from external API (legacy format)
    
    // Get actual user_id if we used no
    let actualUserId = user.userId;
    if (typeof user.userId === 'number') {
      // Query user_id from database
      const userResult = await connection.query(
        'SELECT user_id FROM data_user WHERE no = $1',
        [user.userId]
      );
      if (userResult.rows && userResult.rows.length > 0) {
        actualUserId = userResult.rows[0].user_id;
      }
    }
    
    if (connection) {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: actualUserId,
        username: user.username,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
        photo_profile: photoProfile, // Return full path from database
        status_user: statusUser, // Include status_user for payment check
      },
    });
  } catch (error: any) {
    // Release connection jika ada
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        // Ignore release error - connection mungkin sudah terputus
        console.error('[Auth Me] Error releasing connection:', releaseError);
      }
    }
    
    // Handle database connection errors
    if (isDatabaseConnectionError(error) || 
        error?.message?.includes('Connection terminated') ||
        (error?.code === 'UNKNOWN' && error?.message?.includes('Connection'))) {
      const sanitized = sanitizeErrorForLogging(error);
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [Auth Me] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Database tidak dapat diakses saat ini. Silakan coba lagi dalam beberapa saat.',
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    // Untuk error lainnya (termasuk auth errors), return 401
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unauthorized',
      },
      { status: 401 }
    );
  }
}

