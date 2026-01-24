// Fetcher untuk API routes Next.js
export const fetcher = async (url: string) => {
  // Jika URL adalah Next.js API route (dimulai dengan /api), lakukan fetch
  if (url.startsWith('/api/')) {
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      // Prepare headers with Authorization if token exists
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(url, {
        headers
      })
      
      if (!response.ok) {
        // If 401, token might be expired - log for debugging
        if (response.status === 401) {
          console.warn('API request unauthorized - token may be expired:', url)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching from API:', url, error)
      // Return error format yang konsisten
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      }
    }
  }
  
  // Untuk URL external atau mock data (fallback)
  // Catatan: URL yang dimulai dengan /api/ sudah ditangani di atas
  if (url.includes('/api/live_data') && !url.startsWith('/api/')) {
    return {
      changed: false,
      rows: [],
      total_gmv: 0,
      formatted_gmv: 'Rp.0'
    }
  }
  
  if (url.includes('/api/teams') && !url.startsWith('/api/')) {
    return {
      teams: []
    }
  }
  
  if (url.includes('/api/live_hourly_chart') && !url.startsWith('/api/')) {
    const now = new Date()
    const realtime = []
    
    for (let i = 0; i < 60; i++) {
      const timestamp = Math.floor(now.getTime() / 1000) - (60 - i) * 60
      const date = new Date(timestamp * 1000)
      const hour = date.getHours()
      const minute = date.getMinutes()
      
      realtime.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        timestamp,
        engagedCcu: Math.floor(Math.random() * 100) + 50,
        addToCart: Math.floor(Math.random() * 20) + 5,
        confirmedOrder: Math.floor(Math.random() * 10) + 1
      })
    }

    return {
      sessionId: '12345',
      startTime: Math.floor(now.getTime() / 1000) - 3600,
      endTime: Math.floor(now.getTime() / 1000),
      realtime
    }
  }
  
  if (url.includes('/api/detail/')) {
    const match = url.match(/\/api\/detail\/([^\/]+)/)
    const username = match ? match[1] : ''
    return {
      team: 'N/A',
      username,
      klik: 0,
      pesanan: 0,
      komisi: 0,
      terjual: 0,
      gmv: 0,
      persentasi: 0,
      avg_gmv: 0,
      avg_komisi: 0,
      kualitas: 'ERROR',
      roas_data: [],
      produk_terlaris: []
    }
  }
  
  if (url.includes('/csv_list/')) {
    return {
      files: [
        `kemarin_${Date.now()}.csv`,
        `7_${Date.now()}.csv`,
        `15_${Date.now()}.csv`,
        `30_${Date.now()}.csv`,
      ]
    }
  }
  
  if (url.includes('/csv_load/')) {
    return `rank,product_name,product_id,shop_id,link,views,clicks,orders,sales,commissions
1,Produk A,123456,789,https://shopee.co.id/product/789/123456,1000,500,50,5000000,500000
2,Produk B,123457,789,https://shopee.co.id/product/789/123457,800,400,40,4000000,400000
3,Produk C,123458,789,https://shopee.co.id/product/789/123458,600,300,30,3000000,300000`
  }
  
  return { error: 'Not implemented' }
}

export const fetchShopeeAdCost = async (payload: any) => {
  return 0;
}; 