import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

/**
 * GET /api/vouchers
 * Get list of vouchers with optional filters
 */
export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    // Check permission
    await requirePermission(request, 'canManageSubscriptions')

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive') // 'true', 'false', or null (all)
    const search = searchParams.get('search') // Search by code or name

    connection = await getDatabaseConnection()

    let whereConditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    // Filter by active status
    if (isActive === 'true' || isActive === 'false') {
      whereConditions.push(`is_active = $${paramIndex++}`)
      params.push(isActive === 'true')
    }

    // Search by code or name
    if (search) {
      whereConditions.push(`(UPPER(code) LIKE UPPER($${paramIndex++}) OR UPPER(name) LIKE UPPER($${paramIndex}))`)
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Get vouchers with usage count
    const query = `
      SELECT 
        v.*,
        COUNT(DISTINCT vu.id) as usage_count,
        COUNT(DISTINCT vu.user_id) as unique_users_count
      FROM vouchers v
      LEFT JOIN voucher_usage vu ON v.id = vu.voucher_id
      ${whereClause}
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `

    const result = await connection.query(query, params)

    // Format response
    const vouchers = result.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      discountType: row.discount_type,
      discountValue: parseFloat(row.discount_value),
      startDate: row.start_date,
      expiryDate: row.expiry_date,
      isActive: row.is_active,
      maxUsagePerUser: row.max_usage_per_user,
      maxTotalUsage: row.max_total_usage,
      applicablePlans: row.applicable_plans || [],
      minimumPurchase: row.minimum_purchase ? parseFloat(row.minimum_purchase) : null,
      maximumDiscount: row.maximum_discount ? parseFloat(row.maximum_discount) : null,
      usageCount: parseInt(row.usage_count) || 0,
      uniqueUsersCount: parseInt(row.unique_users_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      notes: row.notes,
      applicableType: row.applicable_type || 'all',
    }))

    return NextResponse.json({
      success: true,
      data: vouchers,
    })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error('Error fetching vouchers:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil data voucher',
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

/**
 * POST /api/vouchers
 * Create new voucher
 */
export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    // Check permission - get user object correctly
    const adminUser = await requirePermission(request, 'canManageSubscriptions')

    const body = await request.json()
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      startDate,
      expiryDate,
      isActive = true,
      maxUsagePerUser,
      maxTotalUsage,
      applicablePlans,
      minimumPurchase,
      maximumDiscount,
      notes,
      applicableType = 'all',
    } = body

    // Validate required fields
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Voucher code diperlukan' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nama voucher diperlukan' },
        { status: 400 }
      )
    }

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json(
        { success: false, error: 'Discount type harus percentage atau fixed' },
        { status: 400 }
      )
    }

    if (!discountValue || (typeof discountValue !== 'number' && typeof discountValue !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'Discount value diperlukan' },
        { status: 400 }
      )
    }

    const discountValueNum = parseFloat(discountValue.toString())
    if (isNaN(discountValueNum) || discountValueNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Discount value harus lebih dari 0' },
        { status: 400 }
      )
    }

    if (discountType === 'percentage' && discountValueNum > 100) {
      return NextResponse.json(
        { success: false, error: 'Percentage discount tidak boleh lebih dari 100%' },
        { status: 400 }
      )
    }

    if (!expiryDate) {
      return NextResponse.json(
        { success: false, error: 'Expiry date diperlukan' },
        { status: 400 }
      )
    }

    // Check applicableType validity
    if (!['all', 'subscription', 'addon'].includes(applicableType)) {
      return NextResponse.json({ success: false, error: 'Invalid applicable type' }, { status: 400 });
    }

    connection = await getDatabaseConnection()

    // Check if code already exists (case-insensitive)
    const existingVoucher = await connection.query(
      'SELECT id FROM vouchers WHERE UPPER(code) = UPPER($1)',
      [code.trim().toUpperCase()]
    )

    if (existingVoucher.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Voucher code sudah digunakan' },
        { status: 400 }
      )
    }

    // Insert voucher
    const insertQuery = `
      INSERT INTO vouchers (
        code, name, description,
        discount_type, discount_value,
        start_date, expiry_date,
        is_active,
        max_usage_per_user, max_total_usage,
        applicable_plans, minimum_purchase, maximum_discount,
        created_by, updated_by, notes, applicable_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, $15, $16)
      RETURNING *
    `

    const result = await connection.query(insertQuery, [
      code.trim().toUpperCase(), // Store as uppercase
      name.trim(),
      description?.trim() || null,
      discountType,
      discountValueNum,
      startDate ? new Date(startDate) : null,
      new Date(expiryDate),
      isActive,
      maxUsagePerUser || null,
      maxTotalUsage || null,
      applicablePlans && Array.isArray(applicablePlans) && applicablePlans.length > 0 ? applicablePlans : null,
      minimumPurchase ? parseFloat(minimumPurchase) : null,
      maximumDiscount ? parseFloat(maximumDiscount) : null,
      adminUser.userId,
      notes?.trim() || null,
      applicableType
    ])

    const voucher = result.rows[0]

    // Log audit
    await logAudit({
      userId: adminUser.userId,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: AuditActions.VOUCHER_CREATE,
      resourceType: ResourceTypes.VOUCHER,
      resourceId: voucher.id,
      resourceName: voucher.name,
      description: `Created voucher ${voucher.code}`,
      newValues: {
        code: voucher.code,
        name: voucher.name,
        discountType: voucher.discount_type,
        discountValue: parseFloat(voucher.discount_value),
        expiryDate: voucher.expiry_date,
        isActive: voucher.is_active,
        applicableType: voucher.applicable_type
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({
      success: true,
      message: 'Voucher berhasil dibuat',
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
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error('Error creating voucher:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal membuat voucher',
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

