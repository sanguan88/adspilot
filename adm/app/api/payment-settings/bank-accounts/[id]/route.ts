import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

/**
 * PUT - Update bank account
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    const { bankName, accountNumber, accountName, isActive, displayOrder } = body

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, error: 'Bank name, account number, dan account name harus diisi' },
        { status: 400 }
      )
    }

    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `UPDATE bank_accounts 
         SET bank_name = $1, account_number = $2, account_name = $3, 
             is_active = $4, display_order = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING id, bank_name, account_number, account_name, is_active, display_order`,
        [bankName, accountNumber, accountName, isActive, displayOrder, id]
      )

      if (result.rows.length === 0) {
        connection.release()
        return NextResponse.json(
          { success: false, error: 'Bank account tidak ditemukan' },
          { status: 404 }
        )
      }

      connection.release()

      return NextResponse.json({
        success: true,
        message: 'Bank account berhasil diupdate',
        data: result.rows[0],
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Update bank account error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate bank account' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete bank account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        'DELETE FROM bank_accounts WHERE id = $1 RETURNING id',
        [id]
      )

      if (result.rows.length === 0) {
        connection.release()
        return NextResponse.json(
          { success: false, error: 'Bank account tidak ditemukan' },
          { status: 404 }
        )
      }

      connection.release()

      return NextResponse.json({
        success: true,
        message: 'Bank account berhasil dihapus',
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Delete bank account error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghapus bank account' },
      { status: 500 }
    )
  }
}

