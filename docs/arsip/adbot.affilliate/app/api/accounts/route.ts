import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getRoleBasedFilter, getRoleBasedFilterForOptions } from '@/lib/role-filter'

// Function to get account data from shopee_accounts table
async function getAccountDataFromDB(connection: PoolClient, username: string) {
  try {
    const result = await connection.query(
      'SELECT * FROM shopee_accounts WHERE username = $1',
      [username]
    )
    const rows = result.rows
    
    if (rows && rows.length > 0) {
      const data = rows[0]
      
      // Convert database data to performa_data format
      return {
        total_gmv: data.gmv || 0,
        total_komisi: data.komisi || 0,
        total_biaya_iklan: data.biaya_iklan || 0,
        nett_komisi: data.komisi_bersih || 0,
        rasio_iklan: data.rasio_iklan || (data.biaya_iklan > 0 ? (data.biaya_iklan / data.komisi) * 100 : 0),
        target_roas_low: data.normal_roas || 0,
        target_roas_high: data.target_roas || 0,
        roas: Math.round((data.roas || 0) * 10) / 10, // rounded to 1 decimal
        profitable: Math.round(data.profitable || 0), // percentage as integer
        total_sold: data.terjual || 0,
        total_clicks: data.klik || 0,
        total_orders: data.pesanan || 0,
        impression: data.impression || 0,
        view: data.view || 0,
        last_affiliate_sync: data.last_affiliate_sync, // Include last_affiliate_sync
        // New additional columns
        persentasi: data.persentasi || 0, // avg commission dalam persen
        avg_gmv: data.avg_gmv || 0, // AOV
        avg_komisi: data.avg_komisi || 0 // avg commission nominal
      }
    }
    
    return null
  } catch (error) {
    console.error(`Error getting account data for ${username}:`, error)
    return null
  }
}

// Function to save/update account data to shopee_accounts table
async function saveAccountData(connection: PoolClient, account: any, performaData: any, cookieStatus: string) {
  try {
    const upsertSQL = `
      INSERT INTO shopee_accounts (
        user_id, username, email, shop_id, shop_name, 
        gmv, komisi, biaya_iklan, komisi_bersih, 
        normal_roas, target_roas, roas, profitable,
        klik, pesanan, terjual, gmv_raw, komisi_raw,
        persentasi, avg_gmv, avg_komisi,
        impression, view, rasio_iklan,
        last_affiliate_sync, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW())
      ON CONFLICT (username) 
      DO UPDATE SET
        email = EXCLUDED.email,
        shop_id = EXCLUDED.shop_id,
        shop_name = EXCLUDED.shop_name,
        gmv = EXCLUDED.gmv,
        komisi = EXCLUDED.komisi,
        biaya_iklan = EXCLUDED.biaya_iklan,
        komisi_bersih = EXCLUDED.komisi_bersih,
        normal_roas = EXCLUDED.normal_roas,
        target_roas = EXCLUDED.target_roas,
        roas = EXCLUDED.roas,
        profitable = EXCLUDED.profitable,
        klik = EXCLUDED.klik,
        pesanan = EXCLUDED.pesanan,
        terjual = EXCLUDED.terjual,
        gmv_raw = EXCLUDED.gmv_raw,
        komisi_raw = EXCLUDED.komisi_raw,
        persentasi = EXCLUDED.persentasi,
        avg_gmv = EXCLUDED.avg_gmv,
        avg_komisi = EXCLUDED.avg_komisi,
        impression = EXCLUDED.impression,
        view = EXCLUDED.view,
        rasio_iklan = EXCLUDED.rasio_iklan,
        last_affiliate_sync = EXCLUDED.last_affiliate_sync,
        updated_at = NOW()
    `
    
    // Calculate additional metrics
    const rasioKomisi = performaData.total_gmv > 0 ? (performaData.total_komisi / performaData.total_gmv) : 0
    const aov = performaData.total_orders > 0 ? (performaData.total_gmv / performaData.total_orders) : 0
    const avgCommission = rasioKomisi * aov
    const avgCommissionPercent = rasioKomisi * 100 // persentasi dalam persen
    
    const params = [
      account.id_affiliate, // user_id
      account.username,
      account.email,
      account.id_affiliate, // shop_id (using affiliate_id)
      account.username, // shop_name (using username)
      performaData.total_gmv, // gmv
      performaData.total_komisi, // komisi
      performaData.total_biaya_iklan, // biaya_iklan
      performaData.nett_komisi, // komisi_bersih
      performaData.target_roas_low, // normal_roas
      performaData.target_roas_high, // target_roas
      Math.round(performaData.roas * 10) / 10, // roas (rounded to 1 decimal)
      Math.round(performaData.profitable), // profitable (percentage as integer)
      performaData.total_clicks, // klik
      performaData.total_orders, // pesanan
      performaData.total_sold, // terjual
      performaData.total_gmv, // gmv_raw
      performaData.total_komisi, // komisi_raw
      avgCommissionPercent, // persentasi (avg commission dalam persen)
      aov, // avg_gmv (AOV)
      avgCommission, // avg_komisi (avg commission nominal)
      performaData.impression, // impression
      performaData.view, // view
      performaData.rasio_iklan // rasio_iklan
    ]
    
    await connection.query(upsertSQL, params)
    console.log(`[Database] ✓ Saved data for ${account.username} - GMV: ${performaData.total_gmv.toFixed(2)}, Komisi: ${performaData.total_komisi.toFixed(2)}`)
    
  } catch (error) {
    console.error(`[Database] ✗ Failed to save data for ${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    // Don't throw error to prevent breaking the main flow
  }
}

// Fungsi untuk mengecek status cookies - langsung ke API Shopee seperti Python
async function checkCookieStatus(cookies: string, username?: string): Promise<string> {
  if (!cookies || cookies.trim() === '') {
    if (username) {
      console.log(`[Cookie Status] ${username} - No cookies provided`)
    }
    return 'no_cookies'
  }
  
  // Clean cookies
  const cleanCookies = cookies.trim().replace(/\s+/g, ' ').replace(/[\r\n\t]/g, '')
  
  try {
    if (username) {
      console.log(`[Cookie Status] ${username} - Checking cookie status...`)
    }
    
    // Request langsung ke API Shopee seperti Python
    const apiUrl = 'https://affiliate.shopee.co.id/api/v3/user/profile'
    const headers = {
      'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
      'Cookie': cleanCookies
    }
    
    console.log(`[Cookie Status] Direct call to Shopee API: ${apiUrl}`)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Cek response format seperti Python
      if (data && data.code === 0 && data.data) {
        // Jika berhasil mendapatkan data profile, berarti connected
        if (username) {
          console.log(`[Cookie Status] ${username} - ✓ Connected`)
        }
        return 'connected'
      } else {
        if (username) {
          console.log(`[Cookie Status] ${username} - ✗ Disconnected (API returned code: ${data?.code || 'unknown'})`)
        }
      }
    } else {
      if (username) {
        console.log(`[Cookie Status] ${username} - ✗ Disconnected (HTTP ${response.status})`)
      }
    }
    
    return 'disconnected'
  } catch (error) {
    if (username) {
      console.log(`[Cookie Status] ${username} - ✗ Disconnected (Exception: ${error instanceof Error ? error.message : 'Unknown error'})`)
    }
    return 'disconnected'
  }
}

// Fungsi untuk mengambil data dari API performa affiliate dan timegraph
async function getPerformaData(cookies: string, startTime?: string, endTime?: string): Promise<any> {
  if (!cookies || cookies.trim() === '') {
    return {
      total_gmv: 0,
      total_komisi: 0,
      total_biaya_iklan: 0,
      nett_komisi: 0,
      rasio_iklan: 0,
      target_roas_low: 0,
      target_roas_high: 0,
      roas: 0,
      profitable: 0,
      total_sold: 0,
      total_clicks: 0,
      total_orders: 0,
      impression: 0,
      view: 0
    }
  }
  
  // Helper function untuk menghitung start_date dinamis
  const getDynamicStartDate = (): string => {
    const today = new Date()
    const todayDay = today.getDate()
    
    let startDate: Date
    
    if (todayDay === 1) {
      // Jika hari ini tanggal 1, maka start_date = tanggal 1 bulan kemarin
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      startDate = lastMonth
    } else {
      // Jika hari ini bukan tanggal 1, maka start_date = tanggal 1 bulan ini
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    }
    
    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const day = String(startDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function untuk menghitung end_date (kemarin)
  const getDynamicEndDate = (): string => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const year = yesterday.getFullYear()
    const month = String(yesterday.getMonth() + 1).padStart(2, '0')
    const day = String(yesterday.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function untuk validasi dan normalisasi tanggal
  const normalizeDates = (start: string, end: string): { start: string, end: string } => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    // Jika end_date kurang dari start_date, set keduanya ke tanggal yang sama (1 hari)
    if (endDate < startDate) {
      const singleDate = endDate
      const year = singleDate.getFullYear()
      const month = String(singleDate.getMonth() + 1).padStart(2, '0')
      const day = String(singleDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      return { start: dateStr, end: dateStr }
    }
    
    return { start, end }
  }
  
  // Gunakan tanggal yang dipilih user atau default
  const defaultStartDate = getDynamicStartDate()
  const defaultEndDate = getDynamicEndDate()
  let startDate = startTime || defaultStartDate
  let endDate = endTime || defaultEndDate
  
  // Normalisasi tanggal untuk memastikan end_date >= start_date
  const normalized = normalizeDates(startDate, endDate)
  startDate = normalized.start
  endDate = normalized.end
  
  // Clean cookies
  const cleanCookies = cookies.trim().replace(/\s+/g, ' ').replace(/[\r\n\t]/g, '')
  
  // Helper function untuk convert date string ke timestamp (seperti Python)
  const convertDateToTimestamp = (dateStr: string, isStart: boolean = true): number => {
    const date = new Date(dateStr)
    if (isStart) {
      date.setHours(0, 0, 0, 0)
    } else {
      date.setHours(23, 59, 59, 999)
    }
    return Math.floor(date.getTime() / 1000)
  }
  
  // Fungsi untuk mencoba API dengan tanggal tertentu - langsung ke API Shopee seperti Python
  const tryAPIWithDate = async (startDate: string, endDate: string, attemptLabel: string) => {
    // Convert date string ke timestamp seperti Python
    const startTimestamp = convertDateToTimestamp(startDate, true)
    const endTimestamp = convertDateToTimestamp(endDate, false)
    
    console.log(`[API Request] Attempting ${attemptLabel}: start_time=${startDate} (${startTimestamp}), end_time=${endDate} (${endTimestamp})`)
    
    try {
      // Request langsung ke API Shopee seperti Python (bukan melalui proxy)
      const apiUrl = `https://affiliate.shopee.co.id/api/v3/dashboard/detail?start_time=${startTimestamp}&end_time=${endTimestamp}`
      const headers = {
        'Cookie': cleanCookies,
        'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1'
      }
      
      console.log(`[API Request] Direct call to Shopee API: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Cek response format seperti Python
        if (data && data.code === 0 && data.data) {
          console.log(`[API Request] ✓ ${attemptLabel} - Data received (direct API)`)
          return data.data
        } else {
          console.log(`[API Request] ✗ ${attemptLabel} - API returned code: ${data?.code || 'unknown'}`)
          return null
        }
      } else {
        console.log(`[API Request] ✗ ${attemptLabel} - HTTP ${response.status}`)
        return null
      }
    } catch (error) {
      console.log(`[API Request] ✗ ${attemptLabel} - Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }
  
  let performaData: any = null
  
  try {
    // Coba dengan tanggal asli terlebih dahulu
    performaData = await tryAPIWithDate(startDate, endDate, 'First attempt (original dates)')
    
    // Jika API gagal, coba dengan 1 hari ke belakang
    if (!performaData) {
      console.log(`[API Retry] First attempt failed, calculating retry date...`)
      
      // Hitung tanggal 1 hari ke belakang dari endDate
      const originalEndDate = new Date(endDate)
      const oneDayBack = new Date(originalEndDate.getTime() - (1 * 24 * 60 * 60 * 1000))
      const oneDayBackStr = oneDayBack.toISOString().split('T')[0]
      
      // Pastikan end_time tidak kurang dari start_time
      let retryEndDate = oneDayBackStr
      if (new Date(oneDayBackStr) < new Date(startDate)) {
        // Jika retry end_date kurang dari start_date, set ke start_date (range 1 hari)
        console.log(`[API Retry] Retry end_date (${oneDayBackStr}) < start_date (${startDate}), setting to start_date`)
        retryEndDate = startDate
      }
      
      console.log(`[API Retry] Retrying with end_date - 1 day: start_time=${startDate}, end_time=${retryEndDate}`)
      performaData = await tryAPIWithDate(startDate, retryEndDate, 'Retry attempt (end_date - 1 day)')
      
      if (!performaData) {
        console.log(`[API Retry] ✗ Retry attempt also failed`)
      }
    }
    
    // Jika masih gagal setelah retry, coba ulangi max 3x dengan tanggal yang sama
    if (!performaData) {
      console.log(`[API Retry] Starting additional retry attempts (max 3x)...`)
      const maxRetries = 3
      
      for (let retryCount = 1; retryCount <= maxRetries; retryCount++) {
        console.log(`[API Retry] Additional retry attempt ${retryCount}/${maxRetries}...`)
        performaData = await tryAPIWithDate(startDate, endDate, `Additional retry ${retryCount}/${maxRetries} (original dates)`)
        
        if (performaData) {
          console.log(`[API Retry] ✓ Additional retry ${retryCount}/${maxRetries} succeeded`)
          break
        } else {
          console.log(`[API Retry] ✗ Additional retry ${retryCount}/${maxRetries} failed`)
          
          // Jika masih ada retry tersisa, tunggu sebentar sebelum retry berikutnya
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          }
        }
      }
      
      if (!performaData) {
        console.log(`[API Retry] ✗ All ${maxRetries} additional retry attempts failed`)
      }
    }
    
    if (performaData) {
      // Convert date string ke timestamp untuk showallcampaign
      const startTimestamp = convertDateToTimestamp(startDate, true)
      const endTimestamp = convertDateToTimestamp(endDate, false)
      
      console.log(`[API Request] Requesting campaign data: start_time=${startDate} (${startTimestamp}), end_time=${endDate} (${endTimestamp})`)
      
      // Request langsung ke API Shopee seperti Python (bukan melalui proxy)
      try {
        const campaignUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
        const campaignHeaders = {
          'Cookie': cleanCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Content-Type': 'application/json'
        }
        const campaignPayload = {
          start_time: startTimestamp,
          end_time: endTimestamp,
          filter_list: [{"campaign_type": "live_stream_homepage", "state": "all", "search_term": ""}],
          offset: 0,
          limit: 20
        }
        
        console.log(`[API Request] Direct call to Shopee API: ${campaignUrl}`)
        
        const campaignResponse = await fetch(campaignUrl, {
          method: 'POST',
          headers: campaignHeaders,
          body: JSON.stringify(campaignPayload)
        })
        
        let campaignData = null
        
        if (campaignResponse.ok) {
          const responseData = await campaignResponse.json()
          if (responseData && responseData.data) {
            campaignData = responseData.data
            console.log(`[API Request] ✓ Campaign data received (direct API)`)
          } else {
            console.log(`[API Request] ✗ Campaign data not received - no data in response`)
          }
        } else {
          console.log(`[API Request] ✗ Campaign data not received - HTTP ${campaignResponse.status}`)
        }
        
        if (!campaignData) {
          console.log(`[API Request] ✗ Campaign data not received (will use 0 for biaya_iklan)`)
        }
        
        // Hitung total GMV sesuai dashboard.php (dibagi 100000)
        const totalGmv = (
          parseInt(performaData.live_order_amount || '0') + 
          parseInt(performaData.social_media_order_amount || '0') + 
          parseInt(performaData.video_order_amount || '0')
        ) / 100000
        
        // Hitung total komisi sesuai dashboard.php (dibagi 100000)
        const totalKomisi = (
          parseInt(performaData.live_est_commission || '0') + 
          parseInt(performaData.social_media_est_commission || '0') + 
          parseInt(performaData.video_est_commission || '0')
        ) / 100000
        
        // Hitung total biaya iklan dari showallcampaign - jumlahkan semua cost dari semua campaign (dibagi 100000)
        let totalBiayaIklan = 0
        const entryListForCost = campaignData?.entry_list
        if (entryListForCost && Array.isArray(entryListForCost)) {
          const totalCost = entryListForCost.reduce((sum: number, campaign: any) => {
            if (campaign?.report?.cost) {
              return sum + parseInt(campaign.report.cost.toString())
            }
            return sum
          }, 0)
          totalBiayaIklan = totalCost / 100000
        }
        
        // Hitung nett komisi = total komisi - total biaya iklan
        const nettKomisi = totalKomisi - totalBiayaIklan
        
        // Hitung rasio iklan = total biaya iklan / total komisi * 100
        const rasioIklan = totalKomisi > 0 ? (totalBiayaIklan / totalKomisi) * 100 : 0
        
        // Hitung ROAS = total gmv / total biaya iklan
        const roas = totalBiayaIklan > 0 ? (totalGmv / totalBiayaIklan) : 0
        
        // Hitung profitable = nett komisi / total komisi * 100
        const profitable = totalKomisi > 0 ? (nettKomisi / totalKomisi) * 100 : 0
        
        // Data real dari API performaaffiliate sesuai dashboard.php
        const totalSold = parseInt(performaData.live_item_sold || '0') + 
                         parseInt(performaData.social_media_item_sold || '0') + 
                         parseInt(performaData.video_item_sold || '0')
        
        const totalClicks = parseInt(performaData.live_clicks || '0') + 
                           parseInt(performaData.social_media_clicks || '0') + 
                           parseInt(performaData.video_clicks || '0')
        
        // Total orders sesuai dashboard.php - cek di level utama dan channel_breakdown
        let liveOrder = parseInt(performaData.live_order || '0')
        let socialMediaOrder = parseInt(performaData.social_media_order || '0')
        let videoOrder = parseInt(performaData.video_order || '0')
        
        // Cek di channel_breakdown jika tidak ada di level utama
        if (performaData.channel_breakdown) {
          const channel = performaData.channel_breakdown
          if (channel.live_order) liveOrder = parseInt(channel.live_order)
          if (channel.social_media_order) socialMediaOrder = parseInt(channel.social_media_order)
          if (channel.video_order) videoOrder = parseInt(channel.video_order)
        }
        
        const totalOrders = liveOrder + socialMediaOrder + videoOrder
        
        // Data tambahan dari showallcampaign untuk detail - jumlahkan impression dan view dari semua campaign
        let impression = 0
        let view = 0
        const entryListForMetrics = campaignData?.entry_list
        if (entryListForMetrics && Array.isArray(entryListForMetrics)) {
          entryListForMetrics.forEach((campaign: any) => {
            if (campaign?.report?.impression) {
              impression += parseInt(campaign.report.impression.toString())
            }
            if (campaign?.report?.view) {
              view += parseInt(campaign.report.view.toString())
            }
          })
        }
        
        // Hitung Target ROAS berdasarkan formula yang benar
        const rasioKomisi = totalGmv > 0 ? (totalKomisi / totalGmv) : 0
        const aov = totalOrders > 0 ? (totalGmv / totalOrders) : 0
        const avgCommission = rasioKomisi * aov
        
        // Komisi bersih = AVG Komisi - (avg komisi * 30%)
        const komisiBersih = avgCommission - (avgCommission * 0.30)
        
        // Target minimal = AOV / komisi bersih
        const targetRoasLow = komisiBersih > 0 ? (aov / komisiBersih) : 0
        
        // Target KPI = target minimal * 1.7
        const targetRoasHigh = targetRoasLow * 1.7
        
        console.log(`[Data Processing] Calculated metrics - GMV: ${totalGmv.toFixed(2)}, Komisi: ${totalKomisi.toFixed(2)}, Biaya Iklan: ${totalBiayaIklan.toFixed(2)}, ROAS: ${roas.toFixed(2)}`)
        
        return {
          total_gmv: totalGmv,
          total_komisi: totalKomisi,
          total_biaya_iklan: totalBiayaIklan,
          nett_komisi: nettKomisi,
          rasio_iklan: rasioIklan,
          target_roas_low: targetRoasLow,
          target_roas_high: targetRoasHigh,
          roas: Math.round(roas * 10) / 10, // rounded to 1 decimal
          profitable: Math.round(profitable), // percentage as integer
          total_sold: totalSold,
          total_clicks: totalClicks,
          total_orders: totalOrders,
          impression: impression,
          view: view,
          // New additional columns
          persentasi: rasioKomisi * 100, // avg commission dalam persen
          avg_gmv: aov, // AOV
          avg_komisi: avgCommission // avg commission nominal
        }
      } catch (campaignError) {
        console.log(`[API Request] ✗ Error fetching campaign data: ${campaignError instanceof Error ? campaignError.message : 'Unknown error'}`)
        // Continue with campaignData = null, will use 0 for biaya_iklan
      }
    } else {
      console.log(`[Data Processing] ✗ No performa data available after all attempts`)
    }
  } catch (error) {
    console.error(`[Data Processing] ✗ Exception in getPerformaData: ${error instanceof Error ? error.message : 'Unknown error'}`)
    performaData = null // Set to null on exception
  }
  
  // Jika gagal setelah semua percobaan, return null (bukan default data)
  if (!performaData) {
    console.log(`[Data Processing] ✗ All attempts failed, returning null (no data)`)
    return null
  }
  
  // Jika sampai di sini, performaData ada dan valid, sudah di-return di atas
  // Kode ini tidak akan tercapai, tapi tetap ada untuk safety
  return null
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = requireAuth(request);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filterTim = searchParams.get('filter_tim') || 'all'
    const filterPic = searchParams.get('filter_pic') || 'all'
    // Default filter cookies menjadi 'connected' untuk loading lebih cepat
    const filterCookies = searchParams.get('filter_cookies') || 'connected'
    
    // Get role-based filter
    const roleFilter = getRoleBasedFilter(user);
    const roleFilterOptions = getRoleBasedFilterForOptions(user);
    
    // Helper function untuk menghitung start_date dinamis
    const getDynamicStartDate = (): string => {
      const today = new Date()
      const todayDay = today.getDate()
      
      let startDate: Date
      
      if (todayDay === 1) {
        // Jika hari ini tanggal 1, maka start_date = tanggal 1 bulan kemarin
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        startDate = lastMonth
      } else {
        // Jika hari ini bukan tanggal 1, maka start_date = tanggal 1 bulan ini
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      }
      
      const year = startDate.getFullYear()
      const month = String(startDate.getMonth() + 1).padStart(2, '0')
      const day = String(startDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Helper function untuk menghitung end_date (kemarin)
    const getDynamicEndDate = (): string => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const year = yesterday.getFullYear()
      const month = String(yesterday.getMonth() + 1).padStart(2, '0')
      const day = String(yesterday.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Helper function untuk validasi dan normalisasi tanggal
    const normalizeDates = (start: string, end: string): { start: string, end: string } => {
      const startDate = new Date(start)
      const endDate = new Date(end)
      
      // Jika end_date kurang dari start_date, set keduanya ke tanggal yang sama (1 hari)
      if (endDate < startDate) {
        const singleDate = endDate
        const year = singleDate.getFullYear()
        const month = String(singleDate.getMonth() + 1).padStart(2, '0')
        const day = String(singleDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        return { start: dateStr, end: dateStr }
      }
      
      return { start, end }
    }
    
    let startDate = searchParams.get('start_date') || getDynamicStartDate()
    let endDate = searchParams.get('end_date') || getDynamicEndDate()
    
    // Normalisasi tanggal untuk memastikan end_date >= start_date
    const normalized = normalizeDates(startDate, endDate)
    startDate = normalized.start
    endDate = normalized.end
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const connection = await getDatabaseConnection()
    
    // Build WHERE conditions
    const whereConditions = []
    const params = []
    
    // Apply role-based filter first
    let paramIndex = 1
    if (roleFilter.whereClause) {
      // Remove 'AND' prefix if exists and add to whereConditions
      let roleFilterClause = roleFilter.whereClause.startsWith('AND ') 
        ? roleFilter.whereClause.substring(4) 
        : roleFilter.whereClause;
      
      // Replace ? with $1, $2, etc. for PostgreSQL
      const roleParams = roleFilter.params
      roleParams.forEach((_, index) => {
        roleFilterClause = roleFilterClause.replace('?', `$${paramIndex++}`)
      })
      
      whereConditions.push(roleFilterClause);
      params.push(...roleParams);
    }
    
    if (search) {
      whereConditions.push(`(da.username LIKE $${paramIndex} OR da.email LIKE $${paramIndex + 1})`)
      params.push(`%${search}%`, `%${search}%`)
      paramIndex += 2
    }
    
    if (filterTim && filterTim !== 'all') {
      whereConditions.push(`dt.nama_tim LIKE $${paramIndex}`)
      params.push(`%${filterTim}%`)
      paramIndex++
    }
    
    if (filterPic && filterPic !== 'all') {
      whereConditions.push(`da.pic_akun LIKE $${paramIndex}`)
      params.push(`%${filterPic}%`)
      paramIndex++
    }
    
    if (filterCookies && filterCookies !== 'all') {
      if (filterCookies === 'connected') {
        // Filter berdasarkan status_cookies = 'aktif'
        whereConditions.push("da.status_cookies = 'aktif'")
      } else if (filterCookies === 'disconnected') {
        // Filter berdasarkan status_cookies = 'expire'
        whereConditions.push("da.status_cookies = 'expire'")
      } else if (filterCookies === 'no_cookies') {
        whereConditions.push("(da.cookies IS NULL OR da.cookies = '' OR da.status_cookies IS NULL)")
      }
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''
    
    // Query untuk mengambil data akun dengan pagination
    const offset = (page - 1) * limit
    const query = `SELECT da.username, da.email, da.cookies, da.status_cookies, dt.nama_tim, ds.nama_site, da.pic_akun, da.id_affiliate
                  FROM data_akun da 
                  LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
                  LEFT JOIN data_site ds ON da.kode_site = ds.kode_site 
                  ${whereClause} 
                  ORDER BY da.created_at DESC
                  LIMIT ${limit} OFFSET ${offset}`
    
    // Query untuk menghitung total records
    const countQuery = `SELECT COUNT(*) as total
                       FROM data_akun da 
                       LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
                       LEFT JOIN data_site ds ON da.kode_site = ds.kode_site 
                       ${whereClause}`
    
    const rowsResult = await connection.query(query, params)
    const countResult = await connection.query(countQuery, params)
    const dataAkun = rowsResult.rows
    const totalRecords = countResult.rows[0].total
    const totalPages = Math.ceil(totalRecords / limit)
    
    // Ambil data untuk dropdown filter dengan role-based filter
    let timQuery = `
      SELECT DISTINCT dt.nama_tim 
      FROM data_tim dt 
      INNER JOIN data_akun da ON dt.kode_tim = da.kode_tim 
      WHERE dt.nama_tim IS NOT NULL
    `
    let timParams: any[] = []
    
    // Apply role-based filter untuk tim options
    let timParamIndex = 1
    if (roleFilterOptions.whereClause) {
      const roleClause = roleFilterOptions.whereClause.startsWith('AND ') 
        ? roleFilterOptions.whereClause.substring(4) 
        : roleFilterOptions.whereClause;
      // Replace ? with $1, $2, etc.
      const roleParams = roleFilterOptions.params
      let modifiedClause = roleClause
      roleParams.forEach((_, index) => {
        modifiedClause = modifiedClause.replace('?', `$${timParamIndex++}`)
      })
      timQuery += ` AND ${modifiedClause}`;
      timParams.push(...roleParams);
    }
    
    timQuery += ` ORDER BY dt.nama_tim`
    
    const timResult = await connection.query(timQuery, timParams)
    const timRows = timResult.rows
    
    // Ambil PIC options - filter berdasarkan team yang dipilih dan role
    let picQuery = `
      SELECT DISTINCT da.pic_akun 
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.pic_akun IS NOT NULL
    `
    let picParams: any[] = []
    let picParamIndex = 1
    
    // Apply role-based filter untuk PIC options
    if (roleFilterOptions.whereClause) {
      const roleClause = roleFilterOptions.whereClause.startsWith('AND ') 
        ? roleFilterOptions.whereClause.substring(4) 
        : roleFilterOptions.whereClause;
      // Replace ? with $1, $2, etc.
      const roleParams = roleFilterOptions.params
      let modifiedClause = roleClause
      roleParams.forEach((_, index) => {
        modifiedClause = modifiedClause.replace('?', `$${picParamIndex++}`)
      })
      picQuery += ` AND ${modifiedClause}`;
      picParams.push(...roleParams);
    }
    
    // Jika team dipilih, filter PIC berdasarkan team tersebut
    if (filterTim && filterTim !== 'all') {
      picQuery += ` AND dt.nama_tim = $${picParamIndex++}`
      picParams.push(filterTim)
    }
    
    picQuery += ` ORDER BY da.pic_akun`
    
    const picResult = await connection.query(picQuery, picParams)
    const picRows = picResult.rows
    
    connection.release()
    
    const timData = timRows
    const picData = picRows
    
    // PHASE 1: INSTANT response - ambil SEMUA data dari database dalam 1 query
    const quickConnection = await getDatabaseConnection()
    
    // Ambil data dari shopee_accounts dengan filter dan pagination yang sama
    // Gunakan LEFT JOIN untuk memastikan semua data_akun yang difilter muncul
    const shopeeOffset = (page - 1) * limit
    
    // Convert whereClause placeholders from ? to $1, $2, etc.
    let shopeeQuery = `
      SELECT 
        sa.*,
        da.username as da_username,
        da.email,
        da.cookies,
        da.status_cookies,
        da.kode_tim,
        da.kode_site,
        da.pic_akun,
        da.id_affiliate,
        dt.nama_tim,
        ds.nama_site
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      LEFT JOIN data_site ds ON da.kode_site = ds.kode_site
      LEFT JOIN shopee_accounts sa ON da.username = sa.username
      ${whereClause}
      ORDER BY da.created_at DESC
      LIMIT ${limit} OFFSET ${shopeeOffset}
    `
    
    // Replace ? with $1, $2, etc. in whereClause
    let shopeeParamIndex = 1
    shopeeQuery = shopeeQuery.replace(/\?/g, () => `$${shopeeParamIndex++}`)
    
    const shopeeResult = await quickConnection.query(shopeeQuery, params)
    const shopeeData = shopeeResult.rows
    
    // Proses data langsung dari hasil query yang sudah difilter
    // Tidak perlu loop terpisah karena data sudah sesuai dengan filter
    const accountsWithPerforma: any[] = []
    
    for (const row of shopeeData) {
      // Pastikan row memiliki data_akun (da_username)
      if (!row.da_username) continue
      
      if (row.gmv !== null) {
        // Data ada di shopee_accounts, gunakan data tersebut
        const performaData = {
          total_gmv: row.gmv || 0,
          total_komisi: row.komisi || 0,
          total_biaya_iklan: row.biaya_iklan || 0,
          nett_komisi: row.komisi_bersih || 0,
          rasio_iklan: row.rasio_iklan || 0,
          target_roas_low: row.normal_roas || 0,
          target_roas_high: row.target_roas || 0,
          roas: row.roas || 0,
          profitable: row.profitable || 0,
          total_sold: row.terjual || 0,
          total_clicks: row.klik || 0,
          total_orders: row.pesanan || 0,
          impression: row.impression || 0,
          view: row.view || 0,
          persentasi: row.persentasi || 0,
          avg_gmv: row.avg_gmv || 0,
          avg_komisi: row.avg_komisi || 0
        }
        
        // Map status_cookies dari database ke cookie_status
        // aktif -> connected, expire -> disconnected
        let cookieStatus = 'no_cookies'
        if (row.status_cookies) {
          if (row.status_cookies.toLowerCase() === 'aktif') {
            cookieStatus = 'connected'
          } else if (row.status_cookies.toLowerCase() === 'expire') {
            cookieStatus = 'disconnected'
          }
        } else if (row.cookies) {
          // Fallback: jika status_cookies null tapi ada cookies, anggap connected
          cookieStatus = 'connected'
        }
        
        accountsWithPerforma.push({
          username: row.da_username,
          email: row.email,
          // cookies: row.cookies, // ❌ TIDAK DIKIRIM - data sensitif
          id_affiliate: row.id_affiliate,
          kode_tim: row.kode_tim,
          kode_site: row.kode_site,
          pic_akun: row.pic_akun,
          nama_tim: row.nama_tim,
          nama_site: row.nama_site,
          performa_data: performaData,
          cookie_status: cookieStatus,
          data_source: 'database',
          last_affiliate_sync: row.last_affiliate_sync
        })
      } else {
        // Data belum ada, berikan default data sementara
        const defaultPerformaData = {
          total_gmv: 0,
          total_komisi: 0,
          total_biaya_iklan: 0,
          nett_komisi: 0,
          rasio_iklan: 0,
          target_roas_low: 0,
          target_roas_high: 0,
          roas: 0,
          profitable: 0,
          total_sold: 0,
          total_clicks: 0,
          total_orders: 0,
          impression: 0,
          view: 0,
          persentasi: 0,
          avg_gmv: 0,
          avg_komisi: 0
        }
        
        // Map status_cookies dari database ke cookie_status
        // aktif -> connected, expire -> disconnected
        let cookieStatus = 'no_cookies'
        if (row.status_cookies) {
          if (row.status_cookies.toLowerCase() === 'aktif') {
            cookieStatus = 'connected'
          } else if (row.status_cookies.toLowerCase() === 'expire') {
            cookieStatus = 'disconnected'
          }
        } else if (row.cookies) {
          // Fallback: jika status_cookies null tapi ada cookies, anggap checking
          cookieStatus = 'checking'
        }
        
        accountsWithPerforma.push({
          username: row.da_username,
          email: row.email,
          // cookies: row.cookies, // ❌ TIDAK DIKIRIM - data sensitif
          id_affiliate: row.id_affiliate,
          kode_tim: row.kode_tim,
          kode_site: row.kode_site,
          pic_akun: row.pic_akun,
          nama_tim: row.nama_tim,
          nama_site: row.nama_site,
          performa_data: defaultPerformaData,
          cookie_status: cookieStatus,
          data_source: 'pending',
          last_affiliate_sync: null
        })
      }
    }
    
    quickConnection.release()
    
    // PHASE 2: Background processing - update data yang belum ada
    // Jalankan background processing tanpa menunggu
    setImmediate(async () => {
      try {
        const backgroundConnection = await getDatabaseConnection()
        
        // Proses akun yang belum ada datanya
        const pendingAccounts = dataAkun.filter(akun => 
          !accountsWithPerforma.find(acc => 
            acc.username === akun.username && acc.data_source === 'database'
          )
        )
        
        if (pendingAccounts.length > 0) {
          console.log(`[Background] Processing ${pendingAccounts.length} pending account(s)...`)
          
          for (let i = 0; i < pendingAccounts.length; i++) {
            const akun = pendingAccounts[i]
            
            try {
              if (!akun.cookies || akun.cookies.trim() === '') {
                continue
              }
              
              // Call API untuk mendapatkan data
              const performaData = await getPerformaData(akun.cookies, startDate, endDate)
              const cookieStatus = await checkCookieStatus(akun.cookies, akun.username)
              
              // Cek apakah API berhasil mendapatkan data
              if (performaData && (performaData.total_gmv > 0 || performaData.total_komisi > 0)) {
                // Simpan data ke database
                await saveAccountData(backgroundConnection, akun, performaData, cookieStatus)
                console.log(`[Background] ✓ Updated data for ${akun.username}`)
              }
              
              // Add delay between requests
              if (i < pendingAccounts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
              
            } catch (error) {
              // Silent error in background processing
            }
          }
          
          console.log(`[Background] Completed processing ${pendingAccounts.length} account(s)`)
        }
        
        backgroundConnection.release()
        
      } catch (error) {
        // Silent error in background processing
      }
    })
    
    // Hitung summary dari data real dengan validasi numerik
    let totalGmv = 0
    let totalKomisi = 0
    let totalBiayaIklan = 0
    let totalNettKomisi = 0
    let totalSold = 0
    let totalClicks = 0
    let totalOrders = 0
    let totalRoas = 0
    let totalPersentasi = 0
    let profitableCount = 0
    let connectedCount = 0
    let disconnectedCount = 0
    
    accountsWithPerforma.forEach(account => {
      const perf = account.performa_data
      
      // Pastikan semua nilai adalah number yang valid
      const gmv = Number(perf.total_gmv) || 0
      const komisi = Number(perf.total_komisi) || 0
      const biayaIklan = Number(perf.total_biaya_iklan) || 0
      const nettKomisi = Number(perf.nett_komisi) || 0
      const sold = Number(perf.total_sold) || 0
      const clicks = Number(perf.total_clicks) || 0
      const orders = Number(perf.total_orders) || 0
      const roas = Number(perf.roas) || 0
      const profitable = Number(perf.profitable) || 0
      const persentasi = Number(perf.persentasi) || 0
      
      totalGmv += gmv
      totalKomisi += komisi
      totalBiayaIklan += biayaIklan
      totalNettKomisi += nettKomisi
      totalSold += sold
      totalClicks += clicks
      totalOrders += orders
      totalRoas += roas
      totalPersentasi += persentasi
      
      if (profitable > 0) profitableCount++
      
      // Count cookie status
      if (account.cookie_status === 'connected') {
        connectedCount++
      } else if (account.cookie_status === 'disconnected' || account.cookie_status === 'no_cookies' || account.cookie_status === 'checking') {
        disconnectedCount++
      }
    })
    
    // Pastikan perhitungan summary adalah number yang valid
    const avgRoas = accountsWithPerforma.length > 0 ? Number((totalRoas / accountsWithPerforma.length).toFixed(1)) : 0
    const avgKomisiPercent = accountsWithPerforma.length > 0 ? Number((totalPersentasi / accountsWithPerforma.length).toFixed(2)) : 0
    const profitablePercentage = accountsWithPerforma.length > 0 ? Number(((profitableCount / accountsWithPerforma.length) * 100).toFixed(0)) : 0
    const rasioIklanAvg = totalGmv > 0 ? Number(((totalBiayaIklan / totalGmv) * 100).toFixed(1)) : 0
    
    const summary = {
      total_gmv: totalGmv,
      total_komisi: totalKomisi,
      total_biaya_iklan: totalBiayaIklan,
      nett_komisi: totalNettKomisi,
      total_sold: totalSold,
      total_clicks: totalClicks,
      total_orders: totalOrders,
      total_accounts: accountsWithPerforma.length,
      avg_roas: avgRoas,
      avg_komisi_percent: avgKomisiPercent,
      profitable_percentage: profitablePercentage,
      rasio_iklan_avg: rasioIklanAvg,
      connected_count: connectedCount,
      disconnected_count: disconnectedCount
    }
    
    const filterOptions = {
      tim_options: timData.map(row => row.nama_tim).filter(tim => tim && tim.trim() !== ''),
      pic_options: picData.map(row => row.pic_akun).filter(pic => pic && pic.trim() !== '')
    }
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: accountsWithPerforma,
        summary: summary,
        filter_options: filterOptions,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords,
          records_per_page: limit,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Error in accounts endpoint:', error)
    
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }
    
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

// POST handler untuk update cookies dan refresh individual account
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = requireAuth(request);
    
    const body = await request.json()
    const { affiliate_id, cookies, action, start_date, end_date } = body
    
    if (action === 'refresh_account') {
      // Handle refresh individual account
      if (!affiliate_id) {
        return NextResponse.json(
          { success: false, error: 'affiliate_id is required for refresh' },
          { status: 400 }
        )
      }
      
      const connection = await getDatabaseConnection()
      
      try {
        // Get account data from data_akun
        const accountResult = await connection.query(
          'SELECT da.username, da.email, da.cookies, da.status_cookies, dt.nama_tim, ds.nama_site, da.pic_akun, da.id_affiliate FROM data_akun da LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim LEFT JOIN data_site ds ON da.kode_site = ds.kode_site WHERE da.id_affiliate = $1',
          [affiliate_id]
        )
        const accountRows = accountResult.rows
        
        if (!accountRows || accountRows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Account not found' },
            { status: 404 }
          )
        }
        
        const account = accountRows[0]
        
        // Force refresh from API (ignore existing data in shopee_accounts)
        console.log(`[Refresh Account] Refreshing ${account.username}...`)
        console.log(`[Refresh Account] Date range: ${start_date || 'default'} to ${end_date || 'default'}`)
        
        if (!account.cookies || account.cookies.trim() === '') {
          console.log(`[Refresh Account] ✗ ${account.username} - No cookies available`)
        } else {
          console.log(`[Refresh Account] ${account.username} - Cookies available, fetching data...`)
        }
        
        const performaData = await getPerformaData(account.cookies, start_date, end_date)
        const cookieStatus = await checkCookieStatus(account.cookies, account.username)
        
        // HANYA update database jika API berhasil dan ada data
        if (performaData && (performaData.total_gmv > 0 || performaData.total_komisi > 0)) {
          console.log(`[Refresh Account] ${account.username} - Data validation: GMV=${performaData.total_gmv}, Komisi=${performaData.total_komisi} - Valid, saving to database...`)
          await saveAccountData(connection, account, performaData, cookieStatus)
          console.log(`[Refresh Account] ✓ ${account.username} - Data refreshed successfully`)
          
          connection.release()
          
          // Map status_cookies dari database ke cookie_status untuk response
          // aktif -> connected, expire -> disconnected
          let mappedCookieStatus = cookieStatus
          if (account.status_cookies) {
            if (account.status_cookies.toLowerCase() === 'aktif') {
              mappedCookieStatus = 'connected'
            } else if (account.status_cookies.toLowerCase() === 'expire') {
              mappedCookieStatus = 'disconnected'
            }
          }
          
          // Hapus cookies dari response untuk keamanan
          const { cookies, ...accountWithoutCookies } = account
          
          return NextResponse.json({
            success: true,
            data: {
              ...accountWithoutCookies,
              performa_data: performaData,
              cookie_status: mappedCookieStatus,
              data_source: 'api_refresh',
              last_affiliate_sync: new Date().toISOString()
            }
          })
        } else {
          // Jika gagal, jangan update database dan return error
          const gmv = performaData?.total_gmv || 0
          const komisi = performaData?.total_komisi || 0
          console.log(`[Refresh Account] ✗ ${account.username} - Failed to get data from API (GMV: ${gmv}, Komisi: ${komisi})`)
          console.log(`[Refresh Account] ${account.username} - Cookie status: ${cookieStatus}`)
          console.log(`[Refresh Account] ${account.username} - No database update performed (data unchanged)`)
          
          connection.release()
          
          // Return error response
          return NextResponse.json({
            success: false,
            error: 'Failed to get data from API after all retry attempts',
            message: `Gagal memperbarui data untuk akun ${account.username}. Semua percobaan request ke API gagal.`,
            cookie_status: cookieStatus
          }, { status: 400 })
        }
        
      } catch (error) {
        connection.release()
        throw error
      }
      
    } else {
      // Handle update cookies (existing functionality)
      if (!affiliate_id || !cookies) {
        return NextResponse.json(
          { success: false, error: 'affiliate_id and cookies are required' },
          { status: 400 }
        )
      }
      
      const connection = await getDatabaseConnection()
      
      try {
        // Update cookies di database
        await connection.query(
          'UPDATE data_akun SET cookies = $1, updated_at = NOW() WHERE id_affiliate = $2',
          [cookies, affiliate_id]
        )
        
        // Get account data untuk refresh data dari API
        const accountResult = await connection.query(
          'SELECT da.username, da.email, da.cookies, da.status_cookies, dt.nama_tim, ds.nama_site, da.pic_akun, da.id_affiliate FROM data_akun da LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim LEFT JOIN data_site ds ON da.kode_site = ds.kode_site WHERE da.id_affiliate = $1',
          [affiliate_id]
        )
        const accountRows = accountResult.rows
        
        if (!accountRows || accountRows.length === 0) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Account not found' },
            { status: 404 }
          )
        }
        
        const account = accountRows[0]
        // Update cookies di account object dengan cookies baru
        account.cookies = cookies
        
        // Helper function untuk menghitung start_date dinamis
        const getDynamicStartDate = (): string => {
          const today = new Date()
          const todayDay = today.getDate()
          
          let startDate: Date
          
          if (todayDay === 1) {
            // Jika hari ini tanggal 1, maka start_date = tanggal 1 bulan kemarin
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            startDate = lastMonth
          } else {
            // Jika hari ini bukan tanggal 1, maka start_date = tanggal 1 bulan ini
            startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          }
          
          const year = startDate.getFullYear()
          const month = String(startDate.getMonth() + 1).padStart(2, '0')
          const day = String(startDate.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        
        // Helper function untuk menghitung end_date (kemarin)
        const getDynamicEndDate = (): string => {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
          const year = yesterday.getFullYear()
          const month = String(yesterday.getMonth() + 1).padStart(2, '0')
          const day = String(yesterday.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        
        // Helper function untuk validasi dan normalisasi tanggal
        const normalizeDates = (start: string, end: string): { start: string, end: string } => {
          const startDate = new Date(start)
          const endDate = new Date(end)
          
          // Jika end_date kurang dari start_date, set keduanya ke tanggal yang sama (1 hari)
          if (endDate < startDate) {
            const singleDate = endDate
            const year = singleDate.getFullYear()
            const month = String(singleDate.getMonth() + 1).padStart(2, '0')
            const day = String(singleDate.getDate()).padStart(2, '0')
            const dateStr = `${year}-${month}-${day}`
            return { start: dateStr, end: dateStr }
          }
          
          return { start, end }
        }
        
        // Gunakan tanggal default atau dari query params
        let startDate = start_date || getDynamicStartDate()
        let endDate = end_date || getDynamicEndDate()
        
        // Normalisasi tanggal untuk memastikan end_date >= start_date
        const normalized = normalizeDates(startDate, endDate)
        startDate = normalized.start
        endDate = normalized.end
        
        // Refresh data dari API dengan cookies baru
        const performaData = await getPerformaData(account.cookies, startDate, endDate)
        
        // Cek apakah API berhasil mendapatkan data performa
        // Jika data berhasil diperbarui dari API (ada GMV atau komisi) → status = 'aktif'
        // Jika data tidak berhasil diperbarui dari API → status = 'expire'
        const isDataSuccess = performaData && (performaData.total_gmv > 0 || performaData.total_komisi > 0)
        
        let statusCookies = null
        let cookieStatus = 'no_cookies'
        
        if (isDataSuccess) {
          // Data berhasil diperbarui dari API → status_cookies = 'aktif'
          statusCookies = 'aktif'
          cookieStatus = 'connected'
          console.log(`[Update Cookies] ✓ ${account.username} - Data updated successfully`)
        } else {
          // Data tidak berhasil diperbarui dari API → status_cookies = 'expire'
          statusCookies = 'expire'
          cookieStatus = 'disconnected'
          console.log(`[Update Cookies] ✗ ${account.username} - Failed to update data`)
        }
        
        // Update status_cookies di database
        await connection.query(
          'UPDATE data_akun SET status_cookies = $1 WHERE id_affiliate = $2',
          [statusCookies, affiliate_id]
        )
        
        // Simpan data performa ke shopee_accounts jika API berhasil
        if (isDataSuccess) {
          await saveAccountData(connection, account, performaData, cookieStatus)
        }
        
        connection.release()
        
        // Map status_cookies untuk response (sudah di-set di atas berdasarkan hasil API)
        const mappedCookieStatus = cookieStatus
        
        return NextResponse.json({ 
          success: true,
          message: isDataSuccess 
            ? 'Cookies updated and data refreshed successfully from API' 
            : 'Cookies updated but failed to get data from API',
          data_refreshed: isDataSuccess,
          status_cookies: statusCookies
        })
        
      } catch (error) {
        connection.release()
        throw error
      }
    }
    
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT handler untuk refresh all data (setelah background processing)
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = requireAuth(request);
    
    const body = await request.json()
    const { start_date, end_date } = body
    
    const connection = await getDatabaseConnection()
    
    // Get all accounts from data_akun
    const rowsResult = await connection.query(`
      SELECT da.*, dt.nama_tim 
      FROM data_akun da 
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
      ORDER BY da.username
    `)
    
    const dataAkun = rowsResult.rows
    const accountsWithPerforma: any[] = []
    
    // Get all data from shopee_accounts
    for (const akun of dataAkun) {
      try {
        const existingData = await getAccountDataFromDB(connection, akun.username)
        
        if (existingData) {
          const cookieStatus = await checkCookieStatus(akun.cookies)
          
          // Hapus cookies dari response untuk keamanan
          const { cookies: _, ...akunWithoutCookies } = akun
          
          accountsWithPerforma.push({
            ...akunWithoutCookies,
            performa_data: existingData,
            cookie_status: cookieStatus,
            data_source: 'database',
            last_affiliate_sync: existingData.last_affiliate_sync
          })
        } else {
          // Return default data for accounts without data
          const defaultPerformaData = {
            total_gmv: 0,
            total_komisi: 0,
            total_biaya_iklan: 0,
            nett_komisi: 0,
            rasio_iklan: 0,
            target_roas_low: 0,
            target_roas_high: 0,
            roas: 0,
            profitable: 0,
            total_sold: 0,
            total_clicks: 0,
            total_orders: 0,
            impression: 0,
            view: 0,
            persentasi: 0,
            avg_gmv: 0,
            avg_komisi: 0
          }
          
          // Hapus cookies dari response untuk keamanan
          const { cookies: _, ...akunWithoutCookies } = akun
          
          accountsWithPerforma.push({
            ...akunWithoutCookies,
            performa_data: defaultPerformaData,
            cookie_status: akun.cookies ? 'checking' : 'no_cookies',
            data_source: 'pending',
            last_affiliate_sync: null
          })
        }
      } catch (error) {
        console.error(`Error processing account ${akun.username}:`, error)
      }
    }
    
    connection.release()
    
    // Calculate summary
    let totalGmv = 0
    let totalKomisi = 0
    let totalBiayaIklan = 0
    let totalNettKomisi = 0
    let totalKlik = 0
    let totalPesanan = 0
    let totalTerjual = 0
    
    accountsWithPerforma.forEach(account => {
      totalGmv += account.performa_data.total_gmv || 0
      totalKomisi += account.performa_data.total_komisi || 0
      totalBiayaIklan += account.performa_data.total_biaya_iklan || 0
      totalNettKomisi += account.performa_data.nett_komisi || 0
      totalKlik += account.performa_data.total_clicks || 0
      totalPesanan += account.performa_data.total_orders || 0
      totalTerjual += account.performa_data.total_sold || 0
    })
    
    const summary = {
      total_gmv: totalGmv,
      total_komisi: totalKomisi,
      total_biaya_iklan: totalBiayaIklan,
      nett_komisi: totalNettKomisi,
      total_klik: totalKlik,
      total_pesanan: totalPesanan,
      total_terjual: totalTerjual
    }
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: accountsWithPerforma,
        summary: summary,
        filter_options: {
          tim_options: [],
          pic_options: []
        }
      }
    })
    
  } catch (error) {
    console.error('Error in PUT handler:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}