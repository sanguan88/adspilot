import { NextResponse, NextRequest } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getRoleBasedFilter } from '@/lib/role-filter'

export const dynamic = 'force-dynamic'

/**
 * API untuk mengecek health status cookies semua toko
 * Dengan mencoba call API Shopee dan detect error 403
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveStatus(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await getDatabaseConnection()

    try {
      // Get role-based filter
      const roleFilter = getRoleBasedFilter(user)

      // Query untuk mendapatkan semua toko dengan cookies (termasuk yang inactive/expired)
      const query = `
        SELECT 
          dt.id_toko,
          dt.nama_toko,
          dt.cookies,
          dt.status_cookies,
          dt.status_toko,
          dt.update_at as last_cookies_update,
          dt.user_id,
          -- Get last successful API call from report_aggregate
          (
            SELECT MAX(created_at) 
            FROM report_aggregate ra 
            WHERE ra.id_toko = dt.id_toko 
              AND ra.user_id = dt.user_id
          ) as last_successful_sync
        FROM data_toko dt
        WHERE dt.status_toko != 'deleted'
          ${roleFilter.whereClause}
        ORDER BY dt.nama_toko ASC
      `

      const params = roleFilter.params
      const result = await connection.query(query, params)

      const tokos = result.rows

      // Analyze cookies health
      const now = new Date()
      const healthStatus = tokos.map((toko: any) => {
        const hasCookies = toko.cookies && toko.cookies.trim().length > 0
        const lastSync = toko.last_successful_sync ? new Date(toko.last_successful_sync) : null

        let health = 'unknown'
        let needsUpdate = false
        let lastCheckHours = null

        // Check status_cookies first - if 'expire', then cookies are expired (login=false detected)
        if (toko.status_cookies && toko.status_cookies.toLowerCase() === 'expire') {
          health = 'expired'
          needsUpdate = true
        } else if (!hasCookies) {
          health = 'no_cookies'
          needsUpdate = true
        } else if (!lastSync) {
          // Punya cookies tapi belum pernah sync = perlu dicoba
          health = 'never_tested'
          needsUpdate = true
        } else {
          // Hitung berapa lama sejak last successful sync
          const diffMs = now.getTime() - lastSync.getTime()
          const diffHours = diffMs / (1000 * 60 * 60)
          lastCheckHours = Math.floor(diffHours)

          if (diffHours < 24) {
            health = 'healthy' // Sync dalam 24 jam terakhir = sehat
          } else if (diffHours < 72) {
            health = 'warning' // 1-3 hari = perlu perhatian
            needsUpdate = false // Belum urgent
          } else {
            health = 'sync' // > 3 hari = perlu sync (bukan expired)
            needsUpdate = true
          }
        }

        return {
          id_toko: toko.id_toko,
          nama_toko: toko.nama_toko,
          health,
          needs_update: needsUpdate,
          last_sync: lastSync ? lastSync.toISOString() : null,
          last_check_hours: lastCheckHours,
          has_cookies: hasCookies
        }
      })

      // Calculate summary
      const summary = {
        total: healthStatus.length,
        healthy: healthStatus.filter((t: any) => t.health === 'healthy').length,
        warning: healthStatus.filter((t: any) => t.health === 'warning').length,
        sync: healthStatus.filter((t: any) => t.health === 'sync').length,
        expired: healthStatus.filter((t: any) => t.health === 'expired').length,
        no_cookies: healthStatus.filter((t: any) => t.health === 'no_cookies').length,
        never_tested: healthStatus.filter((t: any) => t.health === 'never_tested').length,
        needs_update: healthStatus.filter((t: any) => t.needs_update).length,
      }

      return NextResponse.json({
        success: true,
        data: {
          summary,
          tokos: healthStatus
        }
      })

    } finally {
      connection.release()
    }

  } catch (error: any) {
    // Handle specific auth/payment errors without 500 log noise
    if (error.message && (error.message.includes('Access denied') || error.message.includes('Payment required'))) {
      return NextResponse.json({ success: false, error: error.message }, { status: 402 })
    }

    console.error('[Check Cookies Health] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check cookies health',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

