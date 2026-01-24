import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { requirePermission } from '@/lib/auth-helper'
import { logUserAction, AuditActions, getIpAddress, getUserAgent } from '@/lib/audit-logger'

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    // Check permission
    await requirePermission(request, 'canManageUsers')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    const offset = (page - 1) * limit

    const result = await withDatabaseConnection(async (connection) => {
      // Build query dengan filters
      let query = `
        SELECT 
          no, user_id, username, email, nama_lengkap, role, 
          status_user, photo_profile, created_at, update_at, last_login
        FROM data_user
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      if (search) {
        paramCount++
        query += ` AND (LOWER(username) LIKE LOWER($${paramCount}) OR LOWER(email) LIKE LOWER($${paramCount}) OR LOWER(nama_lengkap) LIKE LOWER($${paramCount}))`
        params.push(`%${search}%`)
      }

      if (role) {
        paramCount++
        query += ` AND role = $${paramCount}`
        params.push(role)
      }

      if (status) {
        paramCount++
        query += ` AND status_user = $${paramCount}`
        params.push(status)
      }

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM')
      const countResult = await connection.query(countQuery, params)
      const total = parseInt(countResult.rows[0]?.total || '0')

      // Get paginated results
      paramCount++
      query += ` ORDER BY created_at DESC LIMIT $${paramCount}`
      params.push(limit)

      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(offset)

      const usersResult = await connection.query(query, params)

      return {
        users: usersResult.rows.map((row: any) => ({
          no: row.no,
          userId: row.user_id,
          username: row.username,
          email: row.email,
          namaLengkap: row.nama_lengkap,
          role: row.role,
          status: row.status_user,
          photoProfile: row.photo_profile,
          createdAt: row.created_at,
          updatedAt: row.update_at,
          lastLogin: row.last_login,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error('Get users error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data users' },
      { status: 500 }
    )
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    // Check permission
    const adminUser = await requirePermission(request, 'canManageUsers')

    const body = await request.json()
    const { username, email, password, namaLengkap, role, status } = body

    // Validation
    if (!username || !email || !password || !namaLengkap) {
      return NextResponse.json(
        { success: false, error: 'Username, email, password, dan nama lengkap harus diisi' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['superadmin', 'admin', 'manager', 'staff', 'user']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role tidak valid' },
        { status: 400 }
      )
    }

    const result = await withDatabaseConnection(async (connection) => {
      // Check if username already exists
      const usernameCheck = await connection.query(
        'SELECT username FROM data_user WHERE LOWER(username) = LOWER($1)',
        [username.trim()]
      )

      if (usernameCheck.rows.length > 0) {
        return { error: 'Username sudah digunakan' }
      }

      // Check if email already exists
      const emailCheck = await connection.query(
        'SELECT email FROM data_user WHERE LOWER(email) = LOWER($1)',
        [email.trim()]
      )

      if (emailCheck.rows.length > 0) {
        return { error: 'Email sudah terdaftar' }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Generate user_id
      const userId = randomUUID()

      // Insert new user
      const insertResult = await connection.query(
        `INSERT INTO data_user (
          user_id, username, email, password, nama_lengkap, 
          role, status_user, created_at, update_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING no, user_id, username, email, nama_lengkap, role, status_user, created_at`,
        [
          userId,
          username.trim().toLowerCase(),
          email.trim().toLowerCase(),
          hashedPassword,
          namaLengkap.trim(),
          role || 'user',
          status || 'aktif',
        ]
      )

      const newUser = insertResult.rows[0]

      // Log audit
      await logUserAction(
        adminUser.userId,
        AuditActions.USER_CREATE,
        userId,
        newUser.email,
        `Created new user: ${newUser.username}`,
        undefined,
        {
          userId,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status_user,
        }
      )

      return {
        user: {
          no: newUser.no,
          userId: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          namaLengkap: newUser.nama_lengkap,
          role: newUser.role,
          status: newUser.status_user,
          createdAt: newUser.created_at,
        },
      }
    })

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User berhasil dibuat',
      data: result.user,
    })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat membuat user' },
      { status: 500 }
    )
  }
}
