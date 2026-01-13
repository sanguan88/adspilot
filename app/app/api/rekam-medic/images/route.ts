import { NextResponse, NextRequest } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'
import { getRoleBasedFilter } from '@/lib/role-filter'

function convertDateToTimestamp(dateStr: string, isStart: boolean = true): number {
  const date = new Date(dateStr)
  if (isStart) {
    date.setHours(0, 0, 0, 0)
  } else {
    date.setHours(23, 59, 59, 999)
  }
  return Math.floor(date.getTime() / 1000)
}

function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  return cookies.split(';').map(c => c.trim()).filter(Boolean).join('; ')
}

export async function POST(request: NextRequest) {
  const user = await requireActiveStatus(request)
  let connection = null

  try {
    const body = await request.json()
    const { campaign_ids, toko_ids, start_time, end_time } = body

    if (!campaign_ids || !Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'campaign_ids is required and must be an array' },
        { status: 400 }
      )
    }

    if (!toko_ids || !Array.isArray(toko_ids) || toko_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'toko_ids is required and must be an array' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Get role-based filter
    const roleFilter = getRoleBasedFilter(user)

    // Get toko IDs that user can access
    let tokoQuery = `SELECT DISTINCT dt.id_toko, dt.nama_toko, dt.cookies
       FROM data_toko dt
       WHERE dt.id_toko IS NOT NULL AND dt.id_toko != '' 
       AND dt.status_toko = 'active'
       AND dt.cookies IS NOT NULL AND dt.cookies != ''`

    let usernameParams: any[] = []
    let paramIndex = 1

    // Apply role-based filter (same approach as rekam-medic/route.ts)
    if (roleFilter.whereClause) {
      let roleFilterClause = roleFilter.whereClause.startsWith('AND ')
        ? roleFilter.whereClause.substring(4)
        : roleFilter.whereClause;

      // Count existing $N placeholders BEFORE replacing ? (like $1)
      const originalPlaceholders = (roleFilterClause.match(/\$\d+/g) || []).length

      // Replace ? with $N placeholders (if any)
      roleFilter.params.forEach((param) => {
        roleFilterClause = roleFilterClause.replace('?', `$${paramIndex++}`)
      })

      // If there were original placeholders (like $1), they're already correct
      // We just need to continue paramIndex from where they left off
      if (originalPlaceholders > 0) {
        // Original placeholders use $1, $2, etc., so next paramIndex should be originalPlaceholders + 1
        paramIndex = originalPlaceholders + 1
      }

      tokoQuery += ` AND ${roleFilterClause}`
      usernameParams.push(...roleFilter.params)
    }

    // Filter by provided toko IDs
    if (toko_ids.length > 0) {
      const placeholders = toko_ids.map(() => `$${paramIndex++}`).join(',')
      tokoQuery += ` AND dt.id_toko IN (${placeholders})`
      usernameParams.push(...toko_ids)
    }

    console.log('[Rekam Medic Images] Query:', tokoQuery)
    console.log('[Rekam Medic Images] Params:', usernameParams)
    console.log('[Rekam Medic Images] Param count:', usernameParams.length, 'Placeholders in query:', (tokoQuery.match(/\$\d+/g) || []).length)

    const tokoResult = await connection.query(tokoQuery, usernameParams)
    const allowedTokos = tokoResult.rows

    if (allowedTokos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {}
      })
    }

    // Group campaigns by toko_id
    const tokoCampaignMap = new Map<string, string[]>()
    for (const toko of allowedTokos) {
      tokoCampaignMap.set(toko.id_toko, [])
    }

    // Fetch images from Shopee API for each toko
    const imageMap = new Map<string, string>()

    for (const toko of allowedTokos) {
      if (!toko.cookies) {
        console.log(`[Rekam Medic Images] No cookies for toko ${toko.id_toko}`)
        continue
      }

      try {
        const cleanedCookies = cleanCookies(toko.cookies)

        // Use provided date range or default to today
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)

        const startTimestamp = start_time
          ? convertDateToTimestamp(start_time, true)
          : Math.floor(startOfDay.getTime() / 1000)
        const endTimestamp = end_time
          ? convertDateToTimestamp(end_time, false)
          : Math.floor(endOfDay.getTime() / 1000)

        const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
        const headers = {
          'Cookie': cleanedCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
          'Referer': 'https://seller.shopee.co.id/portal/marketing/pas/homepage',
          'X-Shopee-Language': 'id',
          'Accept': 'application/json, text/plain, */*'
        }

        const payload = {
          start_time: startTimestamp,
          end_time: endTimestamp,
          filter_list: [{
            "campaign_type": "product_homepage",
            "state": "all",
            "search_term": "",
            "product_placement_list": ["all", "search_product", "targeting"],
            "npa_filter": "exclude_npa",
            "is_valid_rebate_only": false
          }],
          offset: 0,
          limit: 1000
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          console.error(`[Rekam Medic Images] API error for toko ${toko.id_toko}: ${response.status}`)
          continue
        }

        const data = await response.json()
        const campaigns = data?.data?.entry_list || data?.entry_list || []

        // Extract images for matching campaign_ids
        for (const campaign of campaigns) {
          const campaignId = campaign.campaign?.campaign_id || campaign.campaign_id
          if (campaignId && campaign_ids.includes(campaignId.toString())) {
            const image = campaign.image
            if (image) {
              // Format image URL
              const imageUrl = image.startsWith('http')
                ? image
                : `https://down-id.img.susercontent.com/${image}`
              imageMap.set(campaignId.toString(), imageUrl)
            }
          }
        }
      } catch (error) {
        console.error(`[Rekam Medic Images] Error fetching images for toko ${toko.id_toko}:`, error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      data: Object.fromEntries(imageMap)
    })

  } catch (error) {
    console.error('Error fetching campaign images:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

