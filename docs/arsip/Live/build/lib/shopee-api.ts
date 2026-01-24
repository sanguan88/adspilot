// =====================================================
// SHOPEE API INTEGRATION SERVICE
// =====================================================
// Service for integrating with Shopee API using cookies
// Handles API calls, response parsing, and error handling
// =====================================================

export interface ShopeeApiResponse {
  success: boolean
  data?: {
    userid?: number
    username?: string
    email?: string
    phone?: string
    nickname?: string
    shopid?: number
    is_seller?: boolean
    email_verified?: boolean
    phone_verified?: boolean
    affiliate_id?: string
    account_type?: number
    reg_time?: string
    region?: string
    social_media_info?: Array<{
      platform_type: number
      url: string
      user_name: string
      link_status: number
    }>
  }
  error?: string
  code?: string
  details?: any
  timestamp?: string
  source?: string
}

export interface ShopeeApiError {
  success: false
  error: string
  code?: string
  details?: any
}

export class ShopeeApiService {
  private baseUrl: string
  private proxyUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = 'https://adm.sorobot.id/conn/shopee.php'
    this.proxyUrl = '/api/proxy/shopee' // Use internal proxy to avoid CORS
    this.timeout = 10000 // 10 seconds
  }

  /**
   * Validate cookie format before making API call
   */
  validateCookie(cookie: string): { valid: boolean; error?: string } {
    if (!cookie || cookie.trim().length === 0) {
      return { valid: false, error: 'Cookie tidak boleh kosong' }
    }

    // Check for basic cookie format (contains key=value pairs)
    const cookiePairs = cookie.split(';').filter(pair => pair.trim().length > 0)
    if (cookiePairs.length < 3) {
      return { valid: false, error: 'Format cookie tidak valid. Pastikan cookie lengkap dari Shopee.' }
    }

    // Check for essential Shopee cookies
    const essentialCookies = ['_gcl_au', 'SPC_F', 'SPC_T', 'SPC_T_ID']
    const hasEssentialCookies = essentialCookies.some(essential => 
      cookie.toLowerCase().includes(essential.toLowerCase())
    )

    if (!hasEssentialCookies) {
      return { valid: false, error: 'Cookie tidak mengandung data Shopee yang valid' }
    }

    return { valid: true }
  }

  /**
   * Call Shopee API with cookie validation using internal proxy
   */
  async fetchAccountInfo(cookie: string): Promise<ShopeeApiResponse | ShopeeApiError> {
    try {
      // Validate cookie first
      const validation = this.validateCookie(cookie)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid cookie format',
          code: 'VALIDATION_ERROR'
        }
      }

      // Make API call through internal proxy to avoid CORS
      const maxRetries = 3 // Retry up to 3 times for connection errors
      let lastError: any = null
      let lastResult: any = null

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), this.timeout)

          const response = await fetch(this.proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              api: 'profileinfo',
              cookie: cookie,
              data: {}
            }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
          }

          const result = await response.json()
          lastResult = result
          
          // Log result for debugging
          console.log('🔍 Proxy API Result:', JSON.stringify(result, null, 2))

          // Check if result has valid data (even if success is not explicitly true)
          // For profileinfo API, valid response should have affiliate_id, username, or other user data
          const hasValidData = result.data && (
            result.data.affiliate_id || 
            result.data.username || 
            result.data.shopee_user_name ||
            result.data.name ||
            result.data.user_id
          )

          // If we have valid data, treat as success even if success field is not true
          if (result.success || hasValidData) {
            return {
              success: true,
              data: result.data,
              timestamp: result.timestamp,
              source: 'proxy'
            }
          }

          // Check if this is a retryable error (CURL connection errors)
          const isRetryableError = result.error && (
            result.error.includes('CURL Error') ||
            result.error.includes('Failed to connect') ||
            result.error.includes('Could not connect') ||
            result.error.includes('timeout')
          )

          // If it's a retryable error and we have more attempts, retry
          if (isRetryableError && attempt < maxRetries) {
            console.log(`⚠️ Retryable error detected, retrying... (attempt ${attempt}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
            continue
          }

          // Only return error if there's a clear error message and no valid data
          if (result.error) {
            return {
              success: false,
              error: result.error || 'API returned unsuccessful response',
              code: result.code || 'API_ERROR',
              details: result.details || result
            }
          }

          // If no error message but also no valid data, treat as error
          return {
            success: false,
            error: 'API returned unsuccessful response',
            code: result.code || 'API_ERROR',
            details: result
          }

        } catch (error: any) {
          lastError = error
          
          // Check if it's an abort error (timeout)
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            // Retry timeout errors if we have more attempts
            if (attempt < maxRetries) {
              console.log(`⚠️ Timeout error, retrying... (attempt ${attempt}/${maxRetries})`)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
              continue
            }
            return {
              success: false,
              error: 'Request timeout. Silakan coba lagi atau periksa koneksi internet.',
              code: 'TIMEOUT_ERROR',
              details: error
            }
          }
          
          if (attempt < maxRetries) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          }
        }
      }

      // If we have a last result with error, return it
      if (lastResult && lastResult.error) {
        return {
          success: false,
          error: lastResult.error || 'API returned unsuccessful response',
          code: lastResult.code || 'API_ERROR',
          details: lastResult.details || lastResult
        }
      }

      // All retries failed
      return {
        success: false,
        error: lastError?.message || 'Tidak dapat terhubung ke server. Periksa koneksi internet.',
        code: lastError?.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
        details: lastError
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Terjadi kesalahan saat mengambil data akun',
        code: 'UNKNOWN_ERROR',
        details: error
      }
    }
  }

  /**
   * Extract fields from API response for database update
   */
  extractFieldsForUpdate(apiResponse: ShopeeApiResponse): {
    nama_akun?: string
    username?: string
    email?: string
    id_affiliate?: string
    nama_toko_affiliate?: string
    phone?: string
  } {
    if (!apiResponse.success || !apiResponse.data) {
      return {}
    }

    const data = apiResponse.data as any // Use any to access all possible fields
    
    // Try multiple possible field names for username
    const username = 
      data.username || 
      data.shopee_user_name || 
      data.name || 
      data.nickname || 
      data.nick_name ||
      undefined
    
    // Extract phone number - clean format if needed
    // API returns phone in format like "+62-85187748700" or "+6285187748700"
    // We can keep it as is or clean it (remove +, -, spaces)
    let phone = data.phone || undefined
    if (phone) {
      // Clean phone: remove +, -, spaces, but keep the number
      // Option 1: Keep original format
      // Option 2: Clean format (remove special chars except digits)
      // We'll keep original format but can clean if needed
      phone = phone.trim()
    }
    
    return {
      nama_akun: username || data.nickname || data.nick_name || data.email?.split('@')[0] || undefined,
      username: username,
      email: data.email || undefined,
      id_affiliate: data.affiliate_id || undefined,
      nama_toko_affiliate: username || data.nickname || data.nick_name || undefined,
      phone: phone
    }
  }
}

// Export singleton instance
export const shopeeApiService = new ShopeeApiService()

