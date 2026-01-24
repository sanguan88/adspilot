import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// JWT Secret - sebaiknya disimpan di environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'sorobot-2026';

export interface UserPayload {
  userId: number;
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'manager' | 'staff';
  nama_lengkap: string;
  kode_site?: string;
  nama_site?: string;
  kode_tim?: string;
}

/**
 * Generate JWT token untuk user
 */
export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token berlaku 7 hari
  });
}

/**
 * Verify dan decode JWT token
 */
export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
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

