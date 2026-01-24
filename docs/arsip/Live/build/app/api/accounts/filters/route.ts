import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/accounts/filters - Get filter options for accounts
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

    // Check if user is admin or superadmin - if so, show all teams/sites/PICs
    const isAdmin = isAdminOrSuperAdmin(user)

    let teams: any[] = []
    let sites: any[] = []
    let pics: any[] = []

    // Get teams - all teams if admin/superadmin, otherwise filter by user's site
    try {
      if (isAdmin) {
        // Admin/superadmin: get all teams
        const teamsQuery = `
          SELECT DISTINCT kode_tim, nama_tim 
          FROM data_tim 
          WHERE nama_tim IS NOT NULL 
          ORDER BY nama_tim
        `
        teams = await db.query(teamsQuery, []) as any[]
      } else if (user.kode_site) {
        // Regular user: filter by user's site
        const teamsQuery = `
          SELECT DISTINCT kode_tim, nama_tim 
          FROM data_tim 
          WHERE kode_site = $1
            AND nama_tim IS NOT NULL 
          ORDER BY nama_tim
        `
        teams = await db.query(teamsQuery, [user.kode_site]) as any[]
      }
    } catch (teamsError: any) {
      console.error('Error fetching teams:', teamsError.message || teamsError)
      // Continue with empty teams array
    }

    // Get sites - all sites if admin/superadmin, otherwise only user's site
    try {
      if (isAdmin) {
        // Admin/superadmin: get all sites
        const sitesQuery = `
          SELECT kode_site, nama_site 
          FROM data_site 
          WHERE nama_site IS NOT NULL 
          ORDER BY nama_site
        `
        sites = await db.query(sitesQuery, []) as any[]
      } else if (user.kode_site) {
        // Regular user: only show user's site
        const sitesQuery = `
          SELECT kode_site, nama_site 
          FROM data_site 
          WHERE kode_site = $1
            AND nama_site IS NOT NULL 
        `
        const siteResult = await db.query(sitesQuery, [user.kode_site]) as any[]
        sites = siteResult || []
      }
    } catch (sitesError: any) {
      console.error('Error fetching sites:', sitesError.message || sitesError)
      // Continue with empty sites array
    }

    // Get PIC options - all active users if admin/superadmin, otherwise filter by user's site
    try {
      if (isAdmin) {
        // Admin/superadmin: get all active users
        const picQuery = `
          SELECT DISTINCT du.no, du.nama_lengkap, du.username 
          FROM data_user du
          WHERE du.nama_lengkap IS NOT NULL 
            AND du.nama_lengkap != '' 
            AND du.status_user = 'aktif'
          ORDER BY du.nama_lengkap
        `
        pics = await db.query(picQuery, []) as any[]
      } else if (user.kode_site) {
        // Regular user: filter by users from same site
        const picQuery = `
          SELECT DISTINCT du.no, du.nama_lengkap, du.username 
          FROM data_user du
          WHERE du.kode_site = $1
            AND du.nama_lengkap IS NOT NULL 
            AND du.nama_lengkap != '' 
            AND du.status_user = 'aktif'
          ORDER BY du.nama_lengkap
        `
        pics = await db.query(picQuery, [user.kode_site]) as any[]
      }
    } catch (picsError: any) {
      console.error('Error fetching pics:', picsError.message || picsError)
      // Continue with empty pics array
    }

    return NextResponse.json({
      success: true,
      data: {
        teams: teams || [],
        sites: sites || [],
        pics: pics || []
      }
    })

  } catch (error: any) {
    console.error('Error fetching filter options:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

