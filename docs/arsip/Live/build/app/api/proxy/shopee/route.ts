import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/proxy/shopee - Proxy endpoint for Shopee API calls
export async function POST(request: NextRequest) {
  try {
    // Try to parse JSON body with proper error handling
    let body: any
    try {
      body = await request.json()
      
      // Validate body is an object
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json(
          { success: false, error: 'Request body must be a valid JSON object' },
          { status: 400 }
        )
      }
    } catch (parseError: any) {
      console.error('❌ JSON parse error:', parseError)
      
      // Check if it's a JSON parse error (empty body, invalid JSON, etc)
      if (parseError instanceof SyntaxError || 
          parseError.message?.includes('JSON') || 
          parseError.message?.includes('Unexpected end') ||
          parseError.message?.includes('Unexpected token')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid or empty JSON in request body',
            details: parseError.message || 'Unexpected end of JSON input'
          },
          { status: 400 }
        )
      }
      
      // Other errors (network, etc)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to parse request body',
          details: parseError.message || 'Unknown error'
        },
        { status: 400 }
      )
    }

    const { api, cookie, data } = body

    if (!api) {
      return NextResponse.json(
        { success: false, error: 'API endpoint is required' },
        { status: 400 }
      )
    }

    if (!cookie) {
      return NextResponse.json(
        { success: false, error: 'Cookie is required' },
        { status: 400 }
      )
    }

    // Clean and encrypt cookie
    const cleanedCookies = cookie.replace(/\s+/g, '').trim()
    const encryptedCookie = encodeURIComponent(Buffer.from(cleanedCookies).toString('base64'))

    // Call Shopee API through Sorobot
    const requestBody = {
      endpoint: api,
      ...(data || {})
    }

    console.log('🔍 Proxy Request:', { api, cookieLength: cookie?.length, hasData: !!data })

    let response: Response
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout

      response = await fetch('https://adm.sorobot.id/conn/shopee.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Auth-Token': encryptedCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
    } catch (fetchError: any) {
      console.error('❌ Fetch error:', fetchError)
      return NextResponse.json(
        { 
          success: false, 
          error: `Network error: ${fetchError.message || 'Failed to connect to Shopee API'}`,
          code: 'NETWORK_ERROR',
          details: process.env.NODE_ENV === 'development' ? fetchError.stack : undefined
        },
        { status: 500 }
      )
    }

    if (!response.ok) {
      let errorText = ''
      try {
        errorText = await response.text()
      } catch (e) {
        errorText = 'Failed to read error response'
      }
      console.error(`❌ Shopee API error: ${response.status} ${response.statusText}`, errorText)
      return NextResponse.json(
        { 
          success: false, 
          error: `API call failed: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      )
    }

    let result: any
    try {
      result = await response.json()
      console.log('🔍 Sorobot API Response:', JSON.stringify(result, null, 2))
    } catch (parseError: any) {
      console.error('❌ JSON parse error:', parseError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON response from API',
          details: parseError.message
        },
        { status: 500 }
      )
    }

    // Check if result has valid data FIRST (even if success is not explicitly true)
    // For profileinfo API, valid response should have affiliate_id, username, or other user data
    // Priority: If we have valid data, treat as success regardless of error messages
    const hasValidData = result.data && (
      result.data.affiliate_id || 
      result.data.username || 
      result.data.shopee_user_name ||
      result.data.name ||
      result.data.user_id
    )

    // If we have valid data, treat as success even if there's an error message
    if (hasValidData) {
      return NextResponse.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        source: 'sorobot'
      })
    }

    // Only treat as error if there's a clear error message AND no valid data
    const hasError = result.error || 
                     (result.success === false && result.error) ||
                     (result.data && result.data.error && !result.data.affiliate_id && !result.data.username)
    
    if (hasError) {
      const errorMessage = result.error || result.data?.error || result.message || 'API returned unsuccessful response'
      console.error('❌ Sorobot API Error:', {
        error: errorMessage,
        fullResponse: result
      })
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        code: 'API_ERROR',
        details: result
      })
    }

    // If no error message and no valid data, check success field
    // Return the response with timestamp
    return NextResponse.json({
      success: result.success !== false,
      data: result.data || result,
      timestamp: new Date().toISOString(),
      source: 'sorobot'
    })

  } catch (error: any) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

