import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/accounts/active - Get all active accounts with valid cookies from database
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
          error: authError.message || 'Unauthorized',
          accounts: [],
          count: 0
        },
        { status: 401 }
      )
    }

    const teamFilter = request.nextUrl.searchParams.get('team') || 'all'
    
    // Check if user is admin or superadmin - if so, skip site filter
    const isAdmin = isAdminOrSuperAdmin(user)
    
    // Query untuk mengambil semua akun aktif dengan cookies valid - filter by site only if not admin/superadmin
    let accountsQuery = `
      SELECT DISTINCT ON (da.username)
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
        da.cookies,
        da.status_akun,
        da.last_sync,
        dt.nama_tim as team_name
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.cookies IS NOT NULL 
        AND da.cookies != ''
        AND da.cookies LIKE '%SPC_F%'
        AND da.cookies LIKE '%SPC_T%'
        AND da.status_akun = 'aktif'
    `
    
    const queryParams: any[] = []
    let paramIndex = 1
    
    // Filter by site only if not admin/superadmin
    if (!isAdmin && user.kode_site) {
      accountsQuery += ' AND dt.kode_site = $' + paramIndex
      queryParams.push(user.kode_site)
      paramIndex++
    } else if (!isAdmin && !user.kode_site) {
      // Non-admin without kode_site - return empty
      return NextResponse.json({
        success: true,
        accounts: [],
        count: 0
      })
    }
    
    // Filter by team name if specified
    if (teamFilter && teamFilter !== 'all') {
      accountsQuery += ' AND dt.nama_tim = $' + paramIndex
      queryParams.push(teamFilter)
      paramIndex++
    }
    
    // Order by username and no DESC untuk DISTINCT ON (ambil yang terbaru)
    accountsQuery += ' ORDER BY da.username, da.no DESC'
    
    console.log('🔍 /api/accounts/active: Executing query with params:', queryParams)
    console.log('🔍 /api/accounts/active: Query:', accountsQuery)
    
    const accounts = await db.query(accountsQuery, queryParams) as any[]
    
    console.log('✅ /api/accounts/active: Found', accounts.length, 'accounts from database')
    
    // Transform data untuk konsistensi dengan format yang diharapkan
    const transformedAccounts = accounts.map((acc: any) => ({
      no: acc.no,
      id_affiliate: acc.id_affiliate,
      nama_akun: acc.nama_akun,
      username: acc.username,
      email: acc.email,
      nama_toko_affiliate: acc.nama_toko_affiliate,
      kode_tim: acc.kode_tim,
      nama_tim: acc.nama_tim || acc.team_name || 'N/A',
      team: acc.nama_tim || acc.team_name || 'N/A',
      kode_site: acc.kode_site,
      nama_site: acc.nama_site,
      pic_akun: acc.pic_akun,
      cookies: acc.cookies,
      status_akun: acc.status_akun,
      last_sync: acc.last_sync
    }))
    
    return NextResponse.json({
      success: true,
      accounts: transformedAccounts,
      count: transformedAccounts.length
    })
    
  } catch (error: any) {
    console.error('Error fetching active accounts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        accounts: [],
        count: 0
      },
      { status: 500 }
    )
  }
}

