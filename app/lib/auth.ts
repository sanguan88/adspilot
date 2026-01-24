import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// JWT Secret - HARUS diset di environment variable untuk production
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is required. Please set it in your .env.local or .env file.\n' +
    'Example: JWT_SECRET=your_strong_secret_here_minimum_32_characters'
  );
}

// Assert that JWT_SECRET is defined after the check above
const SECRET_KEY: string = JWT_SECRET;

export interface UserPayload {
  userId: string; // Changed from number to string (VARCHAR user_id)
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'manager' | 'staff' | 'user';
  nama_lengkap: string;
}

/**
 * Generate JWT token untuk user
 */
export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, SECRET_KEY, {
    expiresIn: '7d', // Token berlaku 7 hari
  });
}

/**
 * Verify dan decode JWT token
 */
export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as UserPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Hash password menggunakan bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password dengan hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Extract token dari request header
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback: cek dari cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authenticate request dan return user payload
 */
export function authenticate(request: NextRequest): UserPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

/**
 * Middleware untuk require authentication
 */
export function requireAuth(request: NextRequest): UserPayload {
  const user = authenticate(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Middleware untuk require role tertentu
 */
export function requireRole(request: NextRequest, allowedRoles: string[]): UserPayload {
  const user = requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
  return user;
}

/**
 * Middleware untuk require active status (status_user = 'active')
 * Memeriksa status_user dari database secara real-time
 * Hanya user dengan status 'active' yang boleh akses fitur utama aplikasi
 * 
 * IMPORTANT: Gunakan ini untuk semua API endpoints yang mengakses fitur utama aplikasi
 * Jangan gunakan untuk:
 * - Auth endpoints (/api/auth/*)
 * - Payment status endpoints (/api/transactions/*)
 * - Public endpoints (/api/payment-settings/public)
 */
export async function requireActiveStatus(request: NextRequest): Promise<UserPayload> {
  const user = requireAuth(request);

  // Dynamic import untuk avoid circular dependency
  const { getDatabaseConnection } = await import('@/lib/db');
  const { isDatabaseConnectionError } = await import('@/lib/db-errors');
  let connection = null;

  try {
    // Get connection with retry mechanism
    connection = await getDatabaseConnection(3);

    // Query status_user dari database (real-time check, tidak dari JWT)
    const result = await connection.query(
      `SELECT status_user FROM data_user WHERE user_id = $1`,
      [user.userId]
    );

    // Release connection immediately after query (don't wait for return)
    connection.release();
    connection = null;

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const statusUser = result.rows[0].status_user;

    // Logging status untuk debugging
    if (process.env.NODE_ENV === 'production' && (!statusUser || statusUser.trim().toLowerCase() !== 'active')) {
      console.error(`[Auth] Access denied - User: ${user.username} (${user.userId}), Status in DB: '${statusUser}'`);
    }

    // Hanya user dengan status 'active' atau 'aktif' yang boleh akses (case insensitive & trimmed)
    const normalizedStatus = statusUser?.toString().trim().toLowerCase();
    if (!statusUser || (normalizedStatus !== 'active' && normalizedStatus !== 'aktif')) {
      throw new Error('Access denied. Payment required. Please complete your payment to access this feature.');
    }

    return user;
  } catch (error: any) {
    // Release connection if still exists
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        // Ignore release errors
      }
    }

    // Check if it's a database connection error
    const isConnectionError = isDatabaseConnectionError(error) ||
      error?.message?.includes('Connection terminated') ||
      error?.message?.includes('connection') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.isDatabaseError;

    if (isConnectionError) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[requireActiveStatus] DB Connection Error: ${error.message}`);
      }
      // Wrap connection error with more context
      const dbError = new Error(`Database connection error: ${error.message}`);
      (dbError as any).isDatabaseError = true;
      (dbError as any).originalError = error;
      throw dbError;
    }

    throw error;
  }
}

