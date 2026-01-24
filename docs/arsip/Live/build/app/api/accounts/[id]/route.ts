import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/accounts/[id] - Get specific account
export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params

    const account = await db.getOne(`
      SELECT 
        da.no,
        da.id_affiliate,
        da.nama_akun,
        da.username,
        da.email,
        da.nama_toko_affiliate,
        da.kode_tim,
        da.nama_tim,
        da.kode_site,
        da.nama_site,
        da.pic_akun,
        da.no_whatsapp,
        da.photo_profil,
        da.keterangan,
        da.cookies,
        da.status_akun,
        da.last_sync,
        da.last_api_sync,
        da.api_sync_status,
        da.api_response_data,
        da.api_error_message,
        da.created_at,
        da.updated_at,
        dt.nama_tim as team_name,
        ds.nama_site as site_name
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
      LEFT JOIN data_site ds ON da.kode_site = ds.kode_site 
      WHERE da.no = ?
    `, [id])

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: account
    })

  } catch (error: any) {
    console.error('Error fetching account:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// PUT /api/accounts/[id] - Update account
export const PUT = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      nama_akun,
      username,
      email,
      nama_toko_affiliate,
      kode_tim,
      nama_tim,
      kode_site,
      nama_site,
      pic_akun,
      no_whatsapp,
      photo_profil,
      cookies,
      status_akun,
      last_sync,
      last_api_sync,
      api_sync_status,
      api_response_data,
      api_error_message
    } = body

    const updateQuery = `
      UPDATE data_akun SET
        nama_akun = COALESCE(?, nama_akun),
        username = COALESCE(?, username),
        email = COALESCE(?, email),
        nama_toko_affiliate = COALESCE(?, nama_toko_affiliate),
        kode_tim = COALESCE(?, kode_tim),
        nama_tim = COALESCE(?, nama_tim),
        kode_site = COALESCE(?, kode_site),
        nama_site = COALESCE(?, nama_site),
        pic_akun = COALESCE(?, pic_akun),
        no_whatsapp = COALESCE(?, no_whatsapp),
        photo_profil = COALESCE(?, photo_profil),
        cookies = COALESCE(?, cookies),
        status_akun = COALESCE(?, status_akun),
        last_sync = COALESCE(?, last_sync),
        last_api_sync = COALESCE(?, last_api_sync),
        api_sync_status = COALESCE(?, api_sync_status),
        api_response_data = COALESCE(?, api_response_data),
        api_error_message = COALESCE(?, api_error_message),
        updated_at = NOW()
      WHERE no = ?
    `

    const affectedRows = await db.update(updateQuery, [
      nama_akun, username, email, nama_toko_affiliate, kode_tim, nama_tim,
      kode_site, nama_site, pic_akun, no_whatsapp, photo_profil, cookies,
      status_akun, last_sync, last_api_sync, api_sync_status, api_response_data,
      api_error_message, id
    ])

    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts/[id] - Delete account (only superadmin)
export const DELETE = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    // Check authentication and authorization
    let user
    try {
      user = getUserFromToken(request)
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please login first.' },
        { status: 401 }
      )
    }

    // Check if user is superadmin
    const userRole = user.role?.toLowerCase() || ''
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'super_admin'
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only superadmin can delete accounts.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const affectedRows = await db.delete('DELETE FROM data_akun WHERE no = ?', [id])

    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

