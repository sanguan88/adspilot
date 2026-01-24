import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST /api/accounts/performance-from-db - Get account performance data from responsedata table
// Menerima array usernames dari localStorage
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { usernames, teamFilter } = body

    // Validate input
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({
        success: true,
        accounts: [],
        total_komisi: 0
      })
    }

    // Build query to get performaaffiliate data from responsedata table
    // Also join with data_akun and data_tim to get team information
    // Use parameterized query with IN clause
    // db.query will convert ? placeholders to PostgreSQL $1, $2, etc.
    const placeholders = usernames.map(() => '?').join(', ')
    
    const query = `
      SELECT 
        rd.username,
        rd.performaaffiliate,
        da.kode_tim,
        da.nama_tim,
        da.cookies,
        dt.nama_tim as team_name,
        dt.logo_tim
      FROM responsedata rd
      LEFT JOIN data_akun da ON rd.username = da.username
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE rd.username IN (${placeholders})
    `

    console.log(`[performance-from-db] Querying responsedata for usernames:`, usernames.slice(0, 5), usernames.length > 5 ? `... (${usernames.length} total)` : '')

    // db.query will automatically convert ? to PostgreSQL placeholders
    const results = await db.query(query, usernames)
    
    console.log(`[performance-from-db] Query returned ${results?.length || 0} results`)

    if (!results || results.length === 0) {
      return NextResponse.json({
        success: true,
        accounts: [],
        total_komisi: 0
      })
    }

    // Parse performaaffiliate data and transform to match performance API format
    const dashboardData: any[] = []
    let totalKomisi = 0

    console.log(`[performance-from-db] Found ${results.length} records in responsedata table`)

    for (const row of results) {
      try {
        const performaData = typeof row.performaaffiliate === 'string' 
          ? JSON.parse(row.performaaffiliate) 
          : row.performaaffiliate

        if (!performaData || !performaData.success) {
          console.warn(`[${row.username}] performaaffiliate data missing success flag or invalid structure`)
          continue
        }
        
        if (!performaData.data) {
          console.warn(`[${row.username}] performaaffiliate data.data is missing`)
          continue
        }

        const data = performaData.data
        const username = row.username

        // Extract data from performaaffiliate response
        // Structure: { success: true, message: "...", data: { list: [{ ymd: "...", clicks: ..., cv_by_order: ..., est_commission: ..., item_sold: ..., order_amount: ... }] } }
        const list = data.list || []
        
        // Calculate totals from the list
        // Note: Field names in list items might be different from API response
        // Try both variations: clicks_sum/clicks, cv_by_order_sum/cv_by_order, etc.
        let totalKlik = 0
        let totalPesanan = 0
        let totalKomisiRaw = 0
        let totalTerjual = 0
        let totalGmvRaw = 0

        for (const item of list) {
          // Try both field name variations
          totalKlik += parseInt(item.clicks_sum || item.clicks || 0) || 0
          totalPesanan += parseInt(item.cv_by_order_sum || item.cv_by_order || 0) || 0
          totalKomisiRaw += parseInt(item.est_commission_sum || item.est_commission || 0) || 0
          totalTerjual += parseInt(item.item_sold_sum || item.item_sold || 0) || 0
          totalGmvRaw += parseInt(item.order_amount_sum || item.order_amount || 0) || 0
        }
        
        console.log(`[${username}] Parsed from responsedata: klik=${totalKlik}, pesanan=${totalPesanan}, komisi=${totalKomisiRaw}, terjual=${totalTerjual}, gmv=${totalGmvRaw}, list_items=${list.length}`)

        // Convert to same format as performance API
        const komisi = totalKomisiRaw / 100000
        const gmv = totalGmvRaw / 100000
        const persentasi = gmv > 0 ? (komisi / gmv * 100) : 0

        // Get team from database (from JOIN with data_akun and data_tim)
        const team = row.team_name || row.nama_tim || 'N/A'
        
        // Convert bytea logo_tim to base64 if exists
        let logoBase64 = null
        if (row.logo_tim) {
          try {
            if (Buffer.isBuffer(row.logo_tim)) {
              logoBase64 = `data:image/png;base64,${row.logo_tim.toString('base64')}`
            } else if (typeof row.logo_tim === 'string') {
              if (row.logo_tim.startsWith('\\x')) {
                const hexString = row.logo_tim.substring(2)
                const buffer = Buffer.from(hexString, 'hex')
                logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`
              } else {
                logoBase64 = row.logo_tim
              }
            }
          } catch (error) {
            console.error(`Error converting logo_tim for ${username}:`, error)
            logoBase64 = null
          }
        }

        // Calculate ROAS
        const avgGmv = totalPesanan > 0 ? gmv / totalPesanan : 0
        const avgKomisi = (persentasi / 100) * avgGmv
        const komisiBersihSim = avgKomisi - (avgKomisi * 0.30)
        const normalRoas = komisiBersihSim > 0 ? avgGmv / komisiBersihSim : 0
        const targetRoas = komisiBersihSim > 0 ? (avgGmv / komisiBersihSim) * 1.7 : 0

        // Get account quality (need hariIni for calculation)
        const now = new Date()
        const wibOffset = 7 * 60 * 60 * 1000
        const nowWIB = new Date(now.getTime() + wibOffset)
        const hariIni = nowWIB.getDate()

        const getKualitas = (komisi: number, hariIni: number): string => {
          const tier: { [key: string]: number } = {
            "Warrior": 25000 * hariIni,
            "Elite": 50000 * hariIni,
            "Master": 100000 * hariIni,
            "Grand Master": 150000 * hariIni,
            "Epic": 200000 * hariIni,
            "Legend": 250000 * hariIni,
            "Mythic": 300000 * hariIni,
          }
          
          if (komisi < tier["Warrior"]) return "Stadium Akut"
          if (komisi < tier["Elite"]) return "Patah Hati"
          if (komisi < tier["Master"]) return "Butuh Kasih Sayang"
          if (komisi < tier["Grand Master"]) return "Bucin"
          if (komisi < tier["Epic"]) return "Sehati"
          if (komisi < tier["Legend"]) return "Fall In Love"
          if (komisi < tier["Mythic"]) return "Sakinah"
          return "Sakinah Mawahdah Warohmah"
        }

        const kualitas = getKualitas(komisi, hariIni)

        dashboardData.push({
          team: team,
          username: username,
          kualitas: kualitas,
          klik: totalKlik,
          pesanan: totalPesanan,
          komisi: `Rp.${Math.round(komisi).toLocaleString('id-ID')}`,
          komisi_raw: komisi,
          terjual: totalTerjual,
          gmv: `Rp.${Math.round(gmv).toLocaleString('id-ID')}`,
          gmv_raw: gmv,
          persen: `${persentasi.toFixed(2)}%`,
          normal_roas: Math.round(normalRoas * 100) / 100,
          target_roas: Math.round(targetRoas * 100) / 100,
          team_logo: logoBase64,
          nama_tim: team
        })

        totalKomisi += komisi

      } catch (parseError: any) {
        console.error(`Error parsing performaaffiliate for ${row.username}:`, parseError.message)
        continue
      }
    }

    // Sort by komisi_raw descending
    dashboardData.sort((a, b) => (b.komisi_raw || 0) - (a.komisi_raw || 0))

    console.log(`[performance-from-db] Returning ${dashboardData.length} accounts, total_komisi=${totalKomisi}`)

    return NextResponse.json({
      success: true,
      accounts: dashboardData,
      total_komisi: totalKomisi,
      source: 'responsedata'
    })

  } catch (error: any) {
    console.error('Error in /api/accounts/performance-from-db:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        accounts: [],
        total_komisi: 0
      },
      { status: 500 }
    )
  }
}

