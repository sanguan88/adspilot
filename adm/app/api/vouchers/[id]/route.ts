import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

/**
 * GET /api/vouchers/[id]
 * Get voucher details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const voucherId = parseInt(id)

    if (isNaN(voucherId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid voucher ID' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Get voucher with usage stats
    const result = await connection.query(
      `SELECT 
        v.*,
        COUNT(DISTINCT vu.id) as usage_count,
        COUNT(DISTINCT vu.user_id) as unique_users_count
      FROM vouchers v
      LEFT JOIN voucher_usage vu ON v.id = vu.voucher_id
      WHERE v.id = $1
      GROUP BY v.id`,
      [voucherId]
    )

    if (result.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher tidak ditemukan' },
        { status: 404 }
      )
    }

    const voucher = result.rows[0]

    connection.release()
    return NextResponse.json({
      success: true,
      data: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        description: voucher.description,
        discountType: voucher.discount_type,
        discountValue: parseFloat(voucher.discount_value),
        startDate: voucher.start_date,
        expiryDate: voucher.expiry_date,
        isActive: voucher.is_active,
        maxUsagePerUser: voucher.max_usage_per_user,
        maxTotalUsage: voucher.max_total_usage,
        applicablePlans: voucher.applicable_plans || [],
        minimumPurchase: voucher.minimum_purchase ? parseFloat(voucher.minimum_purchase) : null,
        maximumDiscount: voucher.maximum_discount ? parseFloat(voucher.maximum_discount) : null,
        usageCount: parseInt(voucher.usage_count) || 0,
        uniqueUsersCount: parseInt(voucher.unique_users_count) || 0,
        createdAt: voucher.created_at,
        updatedAt: voucher.updated_at,
        createdBy: voucher.created_by,
        updatedBy: voucher.updated_by,
        notes: voucher.notes,
        applicableType: voucher.applicable_type || 'all',
      },
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Error fetching voucher:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil data voucher',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/vouchers/[id]
 * Update voucher
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const voucherId = parseInt(id)

    if (isNaN(voucherId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid voucher ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      startDate,
      expiryDate,
      isActive,
      maxUsagePerUser,
      maxTotalUsage,
      applicablePlans,
      minimumPurchase,
      maximumDiscount,
      notes,
      applicableType,
    } = body

    connection = await getDatabaseConnection()

    // Check if voucher exists
    const existingVoucher = await connection.query(
      'SELECT id, code, name, is_active, discount_value, applicable_type FROM vouchers WHERE id = $1',
      [voucherId]
    )

    if (existingVoucher.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validate discount value if provided
    if (discountValue !== undefined) {
      const discountValueNum = parseFloat(discountValue.toString())
      if (isNaN(discountValueNum) || discountValueNum <= 0) {
        connection.release()
        return NextResponse.json(
          { success: false, error: 'Discount value harus lebih dari 0' },
          { status: 400 }
        )
      }

      if (discountType === 'percentage' && discountValueNum > 100) {
        connection.release()
        return NextResponse.json(
          { success: false, error: 'Percentage discount tidak boleh lebih dari 100%' },
          { status: 400 }
        )
      }
    }

    // Validate applicableType if provided
    if (applicableType !== undefined && !['all', 'subscription', 'addon'].includes(applicableType)) {
      connection.release()
      return NextResponse.json({ success: false, error: 'Invalid applicable type' }, { status: 400 });
    }

    // Check code uniqueness if code is being updated
    if (code) {
      const codeCheck = await connection.query(
        'SELECT id FROM vouchers WHERE UPPER(code) = UPPER($1) AND id != $2',
        [code.trim().toUpperCase(), voucherId]
      )

      if (codeCheck.rows.length > 0) {
        connection.release()
        return NextResponse.json(
          { success: false, error: 'Voucher code sudah digunakan' },
          { status: 400 }
        )
      }
    }

    // Build update query dynamically
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramIndex = 1

    if (code !== undefined) {
      updateFields.push(`code = $${paramIndex++}`)
      updateValues.push(code.trim().toUpperCase())
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      updateValues.push(name.trim())
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateValues.push(description?.trim() || null)
    }
    if (discountType !== undefined) {
      updateFields.push(`discount_type = $${paramIndex++}`)
      updateValues.push(discountType)
    }
    if (discountValue !== undefined) {
      updateFields.push(`discount_value = $${paramIndex++}`)
      updateValues.push(parseFloat(discountValue.toString()))
    }
    if (startDate !== undefined) {
      updateFields.push(`start_date = $${paramIndex++}`)
      updateValues.push(startDate ? new Date(startDate) : null)
    }
    if (expiryDate !== undefined) {
      updateFields.push(`expiry_date = $${paramIndex++}`)
      updateValues.push(new Date(expiryDate))
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`)
      updateValues.push(isActive)
    }
    if (maxUsagePerUser !== undefined) {
      updateFields.push(`max_usage_per_user = $${paramIndex++}`)
      updateValues.push(maxUsagePerUser || null)
    }
    if (maxTotalUsage !== undefined) {
      updateFields.push(`max_total_usage = $${paramIndex++}`)
      updateValues.push(maxTotalUsage || null)
    }
    if (applicablePlans !== undefined) {
      updateFields.push(`applicable_plans = $${paramIndex++}`)
      updateValues.push(applicablePlans && Array.isArray(applicablePlans) && applicablePlans.length > 0 ? applicablePlans : null)
    }
    if (minimumPurchase !== undefined) {
      updateFields.push(`minimum_purchase = $${paramIndex++}`)
      updateValues.push(minimumPurchase ? parseFloat(minimumPurchase) : null)
    }
    if (maximumDiscount !== undefined) {
      updateFields.push(`maximum_discount = $${paramIndex++}`)
      updateValues.push(maximumDiscount ? parseFloat(maximumDiscount) : null)
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`)
      updateValues.push(notes?.trim() || null)
    }
    if (applicableType !== undefined) {
      updateFields.push(`applicable_type = $${paramIndex++}`)
      updateValues.push(applicableType)
    }

    if (updateFields.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Tidak ada field yang diupdate' },
        { status: 400 }
      )
    }

    // Always update updated_by and updated_at
    updateFields.push(`updated_by = $${paramIndex++}`)
    updateValues.push(adminUser.userId)
    updateFields.push(`updated_at = NOW()`)

    updateValues.push(voucherId)

    const updateQuery = `
      UPDATE vouchers
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    // Get current voucher for audit
    // (Already fetched above but need fields for accurate log)
    const currentVoucher = existingVoucher.rows[0]

    const result = await connection.query(updateQuery, updateValues)

    const voucher = result.rows[0]

    // Log audit
    const oldValues: Record<string, any> = {}
    const newValues: Record<string, any> = {}

    // Helper to add changed values
    if (code !== undefined && code !== currentVoucher.code) { oldValues.code = currentVoucher.code; newValues.code = voucher.code }
    if (name !== undefined && name !== currentVoucher.name) { oldValues.name = currentVoucher.name; newValues.name = voucher.name }
    if (isActive !== undefined && isActive !== currentVoucher.is_active) { oldValues.isActive = currentVoucher.is_active; newValues.isActive = voucher.is_active }
    if (discountValue !== undefined && discountValue !== parseFloat(currentVoucher.discount_value)) {
      oldValues.discountValue = parseFloat(currentVoucher.discount_value);
      newValues.discountValue = parseFloat(voucher.discount_value)
    }
    if (applicableType !== undefined && applicableType !== currentVoucher.applicable_type) {
      oldValues.applicableType = currentVoucher.applicable_type;
      newValues.applicableType = voucher.applicable_type;
    }

    await logAudit({
      userId: adminUser.userId,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: AuditActions.VOUCHER_UPDATE,
      resourceType: ResourceTypes.VOUCHER,
      resourceId: voucher.id,
      resourceName: voucher.name,
      description: `Updated voucher ${voucher.code}`,
      oldValues: Object.keys(oldValues).length > 0 ? oldValues : undefined,
      newValues: Object.keys(newValues).length > 0 ? newValues : undefined,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    })

    connection.release()
    return NextResponse.json({
      success: true,
      message: 'Voucher berhasil diupdate',
      data: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        description: voucher.description,
        discountType: voucher.discount_type,
        discountValue: parseFloat(voucher.discount_value),
        startDate: voucher.start_date,
        expiryDate: voucher.expiry_date,
        isActive: voucher.is_active,
        maxUsagePerUser: voucher.max_usage_per_user,
        maxTotalUsage: voucher.max_total_usage,
        applicablePlans: voucher.applicable_plans || [],
        minimumPurchase: voucher.minimum_purchase ? parseFloat(voucher.minimum_purchase) : null,
        maximumDiscount: voucher.maximum_discount ? parseFloat(voucher.maximum_discount) : null,
        createdAt: voucher.created_at,
        updatedAt: voucher.updated_at,
        createdBy: voucher.created_by,
        updatedBy: voucher.updated_by,
        notes: voucher.notes,
        applicableType: voucher.applicable_type
      },
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Error updating voucher:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengupdate voucher',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vouchers/[id]
 * Delete voucher
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const voucherId = parseInt(id)

    if (isNaN(voucherId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid voucher ID' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Check if voucher exists
    const existingVoucher = await connection.query(
      'SELECT id, code FROM vouchers WHERE id = $1',
      [voucherId]
    )

    if (existingVoucher.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if voucher has usage (optional: warn but still allow delete)
    const usageCheck = await connection.query(
      'SELECT COUNT(*) as count FROM voucher_usage WHERE voucher_id = $1',
      [voucherId]
    )

    const usageCount = parseInt(usageCheck.rows[0].count)
    const voucherCode = existingVoucher.rows[0].code // Grab code from previous check

    // Delete voucher (cascade will handle voucher_usage if foreign key is set)
    // If no cascade, delete usage records first
    await connection.query('DELETE FROM voucher_usage WHERE voucher_id = $1', [voucherId])
    await connection.query('DELETE FROM vouchers WHERE id = $1', [voucherId])

    // Log Audit
    await logAudit({
      userId: adminUser.userId,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: AuditActions.VOUCHER_DELETE,
      resourceType: ResourceTypes.VOUCHER,
      resourceId: voucherId,
      resourceName: voucherCode,
      description: `Deleted voucher ${voucherCode}`,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    })

    connection.release()
    return NextResponse.json({
      success: true,
      message: `Voucher berhasil dihapus${usageCount > 0 ? ` (${usageCount} penggunaan juga dihapus)` : ''}`,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Error deleting voucher:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal menghapus voucher',
      },
      { status: 500 }
    )
  }
}

