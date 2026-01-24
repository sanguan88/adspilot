import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/accounts - Get all accounts with pagination and filters
export const GET = async (request: NextRequest) => {
  try {
    // Get user from JWT token (for kode_site filtering)
    let user
    try {
      user = getUserFromToken(request)
    } catch (authError: any) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized'
        },
        { status: 401 }
      )
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10')
    const search = request.nextUrl.searchParams.get('search') || ''
    const status = request.nextUrl.searchParams.get('status') || 'all'
    const team = request.nextUrl.searchParams.get('team') || 'all'
    const site = request.nextUrl.searchParams.get('site') || 'all'
    const cookie = request.nextUrl.searchParams.get('cookie') || 'all'

    // Check if user is admin or superadmin - if so, skip site filter (unless site filter is specified)
    const isAdmin = isAdminOrSuperAdmin(user)

    const offset = (page - 1) * limit
    
    // WHERE clause - filter by site
    let whereClause = 'WHERE 1=1'
    let queryParams: any[] = []
    let paramIndex = 1
    
    // Filter by site:
    // - If admin/superadmin and site filter is specified, use that
    // - If admin/superadmin and no site filter, show all (no filter)
    // - If regular user, always filter by their kode_site
    if (isAdmin && site !== 'all') {
      // Admin/superadmin with site filter specified
      whereClause += ' AND dt.kode_site = $' + paramIndex
      queryParams.push(site)
      paramIndex++
    } else if (!isAdmin) {
      // Regular user - always filter by their kode_site
      if (user.kode_site) {
        whereClause += ' AND dt.kode_site = $' + paramIndex
        queryParams.push(user.kode_site)
        paramIndex++
      } else {
        // Non-admin without kode_site - return empty
        return NextResponse.json({
          success: true,
          data: {
            accounts: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0
            }
          }
        })
      }
    }
    // If admin/superadmin and site === 'all', no site filter is applied (show all)
    
    // Search filter
    if (search) {
      whereClause += ' AND (da.nama_akun LIKE $' + paramIndex + ' OR da.username LIKE $' + (paramIndex + 1) + ' OR da.nama_toko_affiliate LIKE $' + (paramIndex + 2) + ')'
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern, searchPattern)
      paramIndex += 3
    }
    
    // Team filter - use kode_tim
    if (team !== 'all') {
      whereClause += ' AND dt.kode_tim = $' + paramIndex
      queryParams.push(team)
      paramIndex++
    }
    
    // Status filter
    if (status !== 'all') {
      whereClause += ' AND da.status_akun = $' + paramIndex
      queryParams.push(status === 'active' ? 'aktif' : 'nonaktif')
      paramIndex++
    }
    
    // Cookie filter
    if (cookie !== 'all') {
      if (cookie === 'connected') {
        whereClause += " AND da.cookies IS NOT NULL AND da.cookies != ''"
      } else if (cookie === 'expired') {
        whereClause += " AND (da.cookies IS NULL OR da.cookies = '' OR da.cookies NOT LIKE '%SPC_F%' OR da.cookies NOT LIKE '%SPC_T%')"
      } else if (cookie === 'no_cookies') {
        whereClause += " AND (da.cookies IS NULL OR da.cookies = '')"
      }
    }

    // Count total records - join with data_tim to filter by kode_site
    const countQuery = `
      SELECT COUNT(*) as total
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
      LEFT JOIN data_site ds ON dt.kode_site = ds.kode_site 
      ${whereClause}
    `
    
    const countResult = await db.query(countQuery, queryParams)
    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult as any)[0].total : 0

    // Get accounts with pagination - join with data_tim to filter by kode_site
    const accountsQuery = `
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
        dt.logo_tim,
        ds.nama_site as site_name
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
      LEFT JOIN data_site ds ON dt.kode_site = ds.kode_site 
      ${whereClause}
      ORDER BY da.no DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    // Execute accounts query
    const finalParams = [...queryParams, limit, offset]
    const accounts = await db.query(accountsQuery, finalParams)

    // Transform accounts to include logo_tim as base64
    const transformedAccounts = (accounts as any[]).map((acc: any) => {
      // Convert bytea logo_tim to base64 if exists
      let logoBase64 = null
      if (acc.logo_tim) {
        try {
          // PostgreSQL bytea is already a Buffer in Node.js
          if (Buffer.isBuffer(acc.logo_tim)) {
            logoBase64 = `data:image/png;base64,${acc.logo_tim.toString('base64')}`
          } else if (typeof acc.logo_tim === 'string') {
            // If it's already a string, check if it's base64 or hex
            if (acc.logo_tim.startsWith('\\x')) {
              // PostgreSQL hex format
              const hexString = acc.logo_tim.substring(2)
              const buffer = Buffer.from(hexString, 'hex')
              logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`
            } else {
              logoBase64 = acc.logo_tim
            }
          }
        } catch (error) {
          console.error('Error converting logo_tim:', error)
          logoBase64 = null
        }
      }
      
      return {
        ...acc,
        team_logo: logoBase64
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: transformedAccounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error: any) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create new account
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const {
      nama_akun,
      username,
      nama_toko_affiliate,
      id_affiliate,
      email,
      kode_tim,
      nama_tim,
      kode_site,
      nama_site,
      pic_akun,
      no_whatsapp,
      photo_profil,
      cookies,
      status_akun = 'aktif'
    } = body

    // Validate required fields
    if (!nama_akun || !username || !kode_tim || !kode_site) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if account with same username already exists
    const existingAccount = await db.getOne(
      'SELECT no FROM data_akun WHERE username = ? LIMIT 1',
      [username]
    )

    // Ensure no_whatsapp has a value (use empty string if not provided)
    const whatsappNumber = no_whatsapp || ''

    let accountId: number | null = null

    if (existingAccount) {
      // Account already exists - UPDATE instead of INSERT
      const updateQuery = `
        UPDATE data_akun SET
          nama_akun = ?,
          nama_toko_affiliate = ?,
          id_affiliate = ?,
          email = ?,
          kode_tim = ?,
          nama_tim = ?,
          kode_site = ?,
          nama_site = ?,
          pic_akun = ?,
          no_whatsapp = ?,
          photo_profil = ?,
          cookies = ?,
          status_akun = ?,
          updated_at = NOW()
        WHERE username = ?
      `

      await db.update(updateQuery, [
        nama_akun,
        nama_toko_affiliate || '',
        id_affiliate || null,
        email || null,
        kode_tim,
        nama_tim || '',
        kode_site,
        nama_site || '',
        pic_akun || '',
        whatsappNumber,
        photo_profil || '',
        cookies || '',
        status_akun,
        username
      ])

      accountId = existingAccount.no

      return NextResponse.json({
        success: true,
        data: { id: accountId },
        message: 'Account updated successfully (username already exists)',
        updated: true
      })
    } else {
      // New account - INSERT
      const insertQuery = `
        INSERT INTO data_akun (
          nama_akun, username, nama_toko_affiliate, id_affiliate, email, kode_tim, nama_tim,
          kode_site, nama_site, pic_akun, no_whatsapp, photo_profil,
          cookies, status_akun, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `

      accountId = await db.insert(insertQuery, [
        nama_akun, username, nama_toko_affiliate || '', id_affiliate || null, email || null, 
        kode_tim, nama_tim || '', kode_site, nama_site || '', pic_akun || '', 
        whatsappNumber, photo_profil || '', cookies || '', status_akun
      ])

      return NextResponse.json({
        success: true,
        data: { id: accountId },
        message: 'Account created successfully',
        updated: false
      })
    }

  } catch (error: any) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

