import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/accounts/stats - Get account statistics
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

    // Check if user is admin or superadmin - if so, skip site filter
    const isAdmin = isAdminOrSuperAdmin(user)

    // Get total accounts - all if admin/superadmin, otherwise filter by user's site
    let totalQuery = `
      SELECT COUNT(*) as total 
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE 1=1
    `
    let activeQuery = `
      SELECT COUNT(*) as total 
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.status_akun = 'aktif'
    `
    let inactiveQuery = `
      SELECT COUNT(*) as total 
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.status_akun = 'nonaktif'
    `
    let connectedQuery = `
      SELECT COUNT(*) as total 
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.cookies IS NOT NULL 
        AND da.cookies != '' 
        AND da.cookies LIKE '%SPC_F%' 
        AND da.cookies LIKE '%SPC_T%'
    `
    
    let queryParams: any[] = []
    
    // Filter by site only if not admin/superadmin
    if (!isAdmin && user.kode_site) {
      const siteFilter = ' AND dt.kode_site = $1'
      totalQuery += siteFilter
      activeQuery += siteFilter
      inactiveQuery += siteFilter
      connectedQuery += siteFilter
      queryParams = [user.kode_site]
    } else if (!isAdmin && !user.kode_site) {
      // Non-admin without kode_site - return empty
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          active: 0,
          inactive: 0,
          connected: 0
        }
      })
    }

    const totalResult = await db.getOne(totalQuery, queryParams)
    const total = totalResult?.total || 0

    const activeResult = await db.getOne(activeQuery, queryParams)
    const active = activeResult?.total || 0

    const inactiveResult = await db.getOne(inactiveQuery, queryParams)
    const inactive = inactiveResult?.total || 0

    const connectedResult = await db.getOne(connectedQuery, queryParams)
    const connected = connectedResult?.total || 0

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        connected
      }
    })

  } catch (error: any) {
    console.error('Error fetching account stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

