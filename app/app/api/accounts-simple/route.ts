import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth, requireActiveStatus } from '@/lib/auth'
import { getRoleBasedFilter, getRoleBasedFilterForOptions } from '@/lib/role-filter'

// Force dynamic rendering karena menggunakan request.headers
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireActiveStatus(request);
    const roleFilter = getRoleBasedFilter(user);
    console.log('Connecting to database for accounts...')

    const connection = await getDatabaseConnection()
    console.log('Database connected successfully')

    // Build WHERE clause with role filter
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (roleFilter.whereClause) {
      const roleFilterClause = roleFilter.whereClause.startsWith('AND ')
        ? roleFilter.whereClause.substring(4)
        : roleFilter.whereClause;
      whereConditions.push(roleFilterClause);
      params.push(...roleFilter.params);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Query untuk mengambil data akun dengan performa dari shopee_accounts
    const limit = 100
    let paramIndex = params.length + 1

    const rowsResult = await connection.query(`
      SELECT 
        da.*,
        dt.nama_tim,
        ds.nama_site,
        sa.gmv as total_gmv,
        sa.komisi as total_komisi,
        sa.biaya_iklan as total_biaya_iklan,
        sa.komisi_bersih as nett_komisi,
        sa.rasio_iklan,
        sa.normal_roas as target_roas_low,
        sa.target_roas as target_roas_high,
        sa.roas,
        sa.profitable,
        sa.terjual as total_sold,
        sa.klik as total_clicks,
        sa.pesanan as total_orders,
        sa.impression,
        sa.view,
        sa.persentasi,
        sa.avg_gmv,
        sa.avg_komisi,
        da.status_cookies
      FROM data_akun da 
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
      LEFT JOIN data_site ds ON da.kode_site = ds.kode_site
      LEFT JOIN shopee_accounts sa ON da.username = sa.username
      ${whereClause}
      ORDER BY da.created_at DESC 
      LIMIT $${paramIndex}
    `, [...params, limit])

    // Ambil data untuk dropdown filter dengan role filter
    const roleFilterOptions = getRoleBasedFilterForOptions(user);
    let timWhereClause = '';
    let timParams: any[] = [];
    let timParamIndex = 1;

    if (roleFilterOptions.whereClause) {
      const roleClause = roleFilterOptions.whereClause.startsWith('AND ')
        ? roleFilterOptions.whereClause.substring(4)
        : roleFilterOptions.whereClause;
      timWhereClause = `AND ${roleClause}`;
      timParams.push(...roleFilterOptions.params);
      timParamIndex = timParams.length + 1;
    }

    const timRowsResult = await connection.query(`
      SELECT DISTINCT dt.nama_tim 
      FROM data_tim dt 
      INNER JOIN data_akun da ON dt.kode_tim = da.kode_tim 
      WHERE dt.nama_tim IS NOT NULL ${timWhereClause}
      ORDER BY dt.nama_tim
    `, timParams)

    let picWhereClause = '';
    let picParams: any[] = [];
    let picParamIndex = 1;

    if (roleFilterOptions.whereClause) {
      const roleClause = roleFilterOptions.whereClause.startsWith('AND ')
        ? roleFilterOptions.whereClause.substring(4)
        : roleFilterOptions.whereClause;
      picWhereClause = `AND ${roleClause}`;
      picParams.push(...roleFilterOptions.params);
      picParamIndex = picParams.length + 1;
    }

    const picRowsResult = await connection.query(`
      SELECT DISTINCT da.pic_akun 
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.pic_akun IS NOT NULL ${picWhereClause}
      ORDER BY da.pic_akun
    `, picParams)

    connection.release()

    const dataAkun = rowsResult.rows as any[]
    const timData = timRowsResult.rows as any[]
    const picData = picRowsResult.rows as any[]

    // Hitung summary sederhana
    const totalAccounts = dataAkun.length

    return NextResponse.json({
      success: true,
      data: {
        accounts: dataAkun.map(akun => {
          // Hapus cookies dari response untuk keamanan
          const { cookies, ...akunWithoutCookies } = akun

          // Map status_cookies dari database ke cookie_status
          let cookieStatus = 'no_cookies'
          if (akun.status_cookies) {
            if (akun.status_cookies.toLowerCase() === 'aktif') {
              cookieStatus = 'connected'
            } else if (akun.status_cookies.toLowerCase() === 'expire') {
              cookieStatus = 'disconnected'
            }
          } else if (akun.cookies) {
            cookieStatus = 'checking'
          }

          return {
            ...akunWithoutCookies,
            performa_data: {
              // Use real data from shopee_accounts if available, otherwise 0
              total_gmv: Number(akun.total_gmv) || 0,
              total_komisi: Number(akun.total_komisi) || 0,
              total_biaya_iklan: Number(akun.total_biaya_iklan) || 0,
              nett_komisi: Number(akun.nett_komisi) || 0,
              rasio_iklan: Number(akun.rasio_iklan) || 0,
              target_roas_low: Number(akun.target_roas_low) || 0,
              target_roas_high: Number(akun.target_roas_high) || 0,
              roas: Number(akun.roas) || 0,
              profitable: Number(akun.profitable) || 0,
              total_sold: Number(akun.total_sold) || 0,
              total_clicks: Number(akun.total_clicks) || 0,
              total_orders: Number(akun.total_orders) || 0,
              impression: Number(akun.impression) || 0,
              view: Number(akun.view) || 0,
              persentasi: Number(akun.persentasi) || 0,
              avg_gmv: Number(akun.avg_gmv) || 0,
              avg_komisi: Number(akun.avg_komisi) || 0
            },
            cookie_status: cookieStatus
          }
        }),
        summary: (() => {
          // Calculate real summary from accounts data
          const accounts = dataAkun.map(akun => ({
            total_gmv: Number(akun.total_gmv) || 0,
            total_komisi: Number(akun.total_komisi) || 0,
            total_biaya_iklan: Number(akun.total_biaya_iklan) || 0,
            nett_komisi: Number(akun.nett_komisi) || 0,
            total_sold: Number(akun.total_sold) || 0,
            total_clicks: Number(akun.total_clicks) || 0,
            total_orders: Number(akun.total_orders) || 0,
            roas: Number(akun.roas) || 0,
            profitable: Number(akun.profitable) || 0,
            rasio_iklan: Number(akun.rasio_iklan) || 0
          }))

          const totalGmv = accounts.reduce((sum, acc) => sum + acc.total_gmv, 0)
          const totalKomisi = accounts.reduce((sum, acc) => sum + acc.total_komisi, 0)
          const totalBiayaIklan = accounts.reduce((sum, acc) => sum + acc.total_biaya_iklan, 0)
          const totalNettKomisi = accounts.reduce((sum, acc) => sum + acc.nett_komisi, 0)
          const totalSold = accounts.reduce((sum, acc) => sum + acc.total_sold, 0)
          const totalClicks = accounts.reduce((sum, acc) => sum + acc.total_clicks, 0)
          const totalOrders = accounts.reduce((sum, acc) => sum + acc.total_orders, 0)
          const totalRoas = accounts.reduce((sum, acc) => sum + acc.roas, 0)
          const profitableCount = accounts.filter(acc => acc.profitable > 0).length
          const totalRasioIklan = accounts.reduce((sum, acc) => sum + acc.rasio_iklan, 0)

          return {
            total_gmv: totalGmv,
            total_komisi: totalKomisi,
            total_biaya_iklan: totalBiayaIklan,
            nett_komisi: totalNettKomisi,
            total_sold: totalSold,
            total_clicks: totalClicks,
            total_orders: totalOrders,
            total_accounts: totalAccounts,
            avg_roas: accounts.length > 0 ? totalRoas / accounts.length : 0,
            profitable_percentage: accounts.length > 0 ? (profitableCount / accounts.length) * 100 : 0,
            rasio_iklan_avg: accounts.length > 0 ? totalRasioIklan / accounts.length : 0
          }
        })(),
        filter_options: {
          tim_options: timData.map(row => row.nama_tim),
          pic_options: picData.map(row => row.pic_akun)
        }
      }
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}
