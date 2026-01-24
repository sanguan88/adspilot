import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'
import { requirePermission } from '@/lib/auth-helper'

// GET - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    const result = await withDatabaseConnection(async (connection) => {
      const userResult = await connection.query(
        `SELECT 
          no, user_id, username, email, nama_lengkap, role, 
          status_user, photo_profile, created_at, update_at, last_login
        FROM data_user 
        WHERE user_id = $1`,
        [userId]
      )

      if (userResult.rows.length === 0) {
        return null
      }

      const user = userResult.rows[0]
      return {
        no: user.no,
        userId: user.user_id,
        username: user.username,
        email: user.email,
        namaLengkap: user.nama_lengkap,
        role: user.role,
        status: user.status_user,
        photoProfile: user.photo_profile,
        createdAt: user.created_at,
        updatedAt: user.update_at,
        lastLogin: user.last_login,
      }
    })

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data user' },
      { status: 500 }
    )
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require admin permission
    const adminUser = await requirePermission(request, 'canManageUsers')

    const { userId } = params
    const body = await request.json()
    const { username, email, password, namaLengkap, role, status } = body

    const result = await withDatabaseConnection(async (connection) => {
      // Check if user exists and get old values for audit
      const userCheck = await connection.query(
        'SELECT user_id, username, email, nama_lengkap, role, status_user FROM data_user WHERE user_id = $1',
        [userId]
      )

      if (userCheck.rows.length === 0) {
        return { error: 'User tidak ditemukan' }
      }

      const oldUser = userCheck.rows[0]

      // Build update query dynamically
      const updates: string[] = []
      const params: any[] = []
      let paramCount = 0

      if (username !== undefined) {
        // Check if username already exists (excluding current user)
        const usernameCheck = await connection.query(
          'SELECT user_id FROM data_user WHERE LOWER(username) = LOWER($1) AND user_id != $2',
          [username.trim(), userId]
        )

        if (usernameCheck.rows.length > 0) {
          return { error: 'Username sudah digunakan' }
        }

        paramCount++
        updates.push(`username = $${paramCount}`)
        params.push(username.trim().toLowerCase())
      }

      if (email !== undefined) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return { error: 'Format email tidak valid' }
        }

        // Check if email already exists (excluding current user)
        const emailCheck = await connection.query(
          'SELECT user_id FROM data_user WHERE LOWER(email) = LOWER($1) AND user_id != $2',
          [email.trim(), userId]
        )

        if (emailCheck.rows.length > 0) {
          return { error: 'Email sudah terdaftar' }
        }

        paramCount++
        updates.push(`email = $${paramCount}`)
        params.push(email.trim().toLowerCase())
      }

      if (password !== undefined && password !== '') {
        const hashedPassword = await bcrypt.hash(password, 10)
        paramCount++
        updates.push(`password = $${paramCount}`)
        params.push(hashedPassword)
      }

      if (namaLengkap !== undefined) {
        paramCount++
        updates.push(`nama_lengkap = $${paramCount}`)
        params.push(namaLengkap.trim())
      }

      if (role !== undefined) {
        const validRoles = ['superadmin', 'admin', 'manager', 'staff', 'user']
        if (!validRoles.includes(role)) {
          return { error: 'Role tidak valid' }
        }
        paramCount++
        updates.push(`role = $${paramCount}`)
        params.push(role)
      }

      if (status !== undefined) {
        const validStatuses = ['aktif', 'active', 'nonaktif', 'pending_payment']
        if (!validStatuses.includes(status)) {
          return { error: 'Status tidak valid' }
        }
        paramCount++
        updates.push(`status_user = $${paramCount}`)
        params.push(status)
      }

      if (updates.length === 0) {
        return { error: 'Tidak ada data yang diupdate' }
      }

      // Add update_at
      paramCount++
      updates.push(`update_at = $${paramCount}`)
      params.push(new Date())

      // Add user_id for WHERE clause
      paramCount++
      params.push(userId)

      const updateQuery = `
        UPDATE data_user 
        SET ${updates.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING no, user_id, username, email, nama_lengkap, role, status_user, update_at
      `

      const updateResult = await connection.query(updateQuery, params)
      const updatedUser = updateResult.rows[0]

      // Log audit with old and new values
      const oldValues: Record<string, any> = {}
      const newValues: Record<string, any> = {}

      if (username !== undefined && username !== oldUser.username) {
        oldValues.username = oldUser.username
        newValues.username = username
      }
      if (email !== undefined && email !== oldUser.email) {
        oldValues.email = oldUser.email
        newValues.email = email
      }
      if (namaLengkap !== undefined && namaLengkap !== oldUser.nama_lengkap) {
        oldValues.namaLengkap = oldUser.nama_lengkap
        newValues.namaLengkap = namaLengkap
      }
      if (role !== undefined && role !== oldUser.role) {
        oldValues.role = oldUser.role
        newValues.role = role
      }
      if (status !== undefined && status !== oldUser.status_user) {
        oldValues.status = oldUser.status_user
        newValues.status = status
      }
      if (password !== undefined && password !== '') {
        newValues.password = '***' // Don't log actual password
      }

      await logAudit({
        userId: adminUser.userId,
        userEmail: adminUser.email,
        userRole: adminUser.role,
        action: AuditActions.USER_UPDATE,
        resourceType: ResourceTypes.USER,
        resourceId: userId,
        resourceName: updatedUser.email,
        description: `Updated user: ${updatedUser.email}`,
        oldValues: Object.keys(oldValues).length > 0 ? oldValues : undefined,
        newValues: Object.keys(newValues).length > 0 ? newValues : undefined,
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      })

      return {
        user: {
          no: updatedUser.no,
          userId: updatedUser.user_id,
          username: updatedUser.username,
          email: updatedUser.email,
          namaLengkap: updatedUser.nama_lengkap,
          role: updatedUser.role,
          status: updatedUser.status_user,
          updatedAt: updatedUser.update_at,
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
      message: 'User berhasil diupdate',
      data: result.user,
    })
  } catch (error: any) {
    console.error('Update user error:', error)

    // If auth error, return 401/403
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message?.includes('Unauthorized') ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user (soft delete by setting status to nonaktif)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require admin permission
    const adminUser = await requirePermission(request, 'canManageUsers')

    const { userId } = params

    const result = await withDatabaseConnection(async (connection) => {
      // Check if user exists and get user info for audit
      const userCheck = await connection.query(
        'SELECT user_id, email, username, status_user FROM data_user WHERE user_id = $1',
        [userId]
      )

      if (userCheck.rows.length === 0) {
        return { error: 'User tidak ditemukan' }
      }

      const user = userCheck.rows[0]

      // Soft delete - set status to nonaktif
      await connection.query(
        'UPDATE data_user SET status_user = $1, update_at = NOW() WHERE user_id = $2',
        ['nonaktif', userId]
      )

      // Log audit
      await logAudit({
        userId: adminUser.userId,
        userEmail: adminUser.email,
        userRole: adminUser.role,
        action: AuditActions.USER_DELETE,
        resourceType: ResourceTypes.USER,
        resourceId: userId,
        resourceName: user.email,
        description: `Deleted (deactivated) user: ${user.email}`,
        oldValues: { status: user.status_user },
        newValues: { status: 'nonaktif' },
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      })

      return { success: true }
    })

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User berhasil dihapus (nonaktif)',
    })
  } catch (error: any) {
    console.error('Delete user error:', error)

    // If auth error, return 401/403
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message?.includes('Unauthorized') ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghapus user' },
      { status: 500 }
    )
  }
}

