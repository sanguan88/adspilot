import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

/**
 * GET - Get all bank accounts
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin permission
    await requirePermission(request, 'canManageSettings')

    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `SELECT id, bank_name, account_number, account_name, is_active, display_order, created_at, updated_at
         FROM bank_accounts
         ORDER BY display_order ASC, id ASC`
      )

      connection.release()

      return NextResponse.json({
        success: true,
        data: result.rows,
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Get bank accounts error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil bank accounts' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create new bank account
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin permission
    const adminUser = await requirePermission(request, 'canManageSettings')

    const body = await request.json()
    const { bankName, accountNumber, accountName, isActive = true, displayOrder = 0 } = body

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, error: 'Bank name, account number, dan account name harus diisi' },
        { status: 400 }
      )
    }

    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active, display_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, bank_name, account_number, account_name, is_active, display_order`,
        [bankName, accountNumber, accountName, isActive, displayOrder]
      )

      const bankAccount = result.rows[0]

      // Log audit
      await logAudit({
        userId: adminUser.userId,
        userEmail: adminUser.email,
        userRole: adminUser.role,
        action: AuditActions.SETTINGS_UPDATE,
        resourceType: ResourceTypes.SETTINGS,
        resourceId: `bank_account_${bankAccount.id}`,
        description: `Created bank account ${bankName} - ${accountNumber}`,
        newValues: { bankName, accountNumber, accountName, isActive, displayOrder },
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      })

      connection.release()

      return NextResponse.json({
        success: true,
        message: 'Bank account berhasil ditambahkan',
        data: bankAccount,
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Create bank account error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menambahkan bank account' },
      { status: 500 }
    )
  }
}

