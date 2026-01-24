import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'

// Function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  
  return cookies
    .replace(/[\r\n\t]+/g, ' ')  // Replace newlines, carriage returns, tabs with space
    .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
    .trim()                      // Remove leading/trailing spaces
}

// Function to get account cookies by id_toko
async function getAccountCookies(connection: PoolClient, idToko: string) {
  try {
    const result = await connection.query(
      'SELECT cookies FROM data_toko WHERE id_toko = $1 AND cookies IS NOT NULL AND cookies != \'\'',
      [idToko]
    )
    return result.rows.length > 0 ? result.rows[0].cookies : null
  } catch (error) {
    throw error
  }
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null
  
  try {
    const body = await request.json()
    const { action, campaign_id_list, account_username, id_toko } = body
    
    if (!action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'action is required' 
        },
        { status: 400 }
      )
    }

    if (!campaign_id_list || !Array.isArray(campaign_id_list) || campaign_id_list.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'campaign_id_list is required and must be a non-empty array' 
        },
        { status: 400 }
      )
    }

    // Use id_toko if provided, otherwise fallback to account_username
    const tokoId = id_toko || account_username

    if (!tokoId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'id_toko or account_username is required' 
        },
        { status: 400 }
      )
    }
    
    // Create database connection
    connection = await getDatabaseConnection()
    
    // Get account cookies
    const cookies = await getAccountCookies(connection, tokoId)
    
    if (!cookies) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account cookies not found or invalid' 
        },
        { status: 404 }
      )
    }

    // Validate action type
    const validActions = ['pause', 'resume', 'stop', 'edit_budget']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid action. Supported actions: ${validActions.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // For edit_budget, new_budget is required
    if (action === 'edit_budget') {
      const { new_budget } = body
      if (!new_budget || new_budget <= 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'new_budget is required and must be greater than 0 for edit_budget action' 
          },
          { status: 400 }
        )
      }

      // Budget validation: must be positive integer (no longer requires multiple of 500000)
      if (new_budget < 0 || !Number.isInteger(new_budget)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Budget harus berupa bilangan bulat positif' 
          },
          { status: 400 }
        )
      }
    }

    // Call Shopee mass_edit API
    const cleanedCookies = cleanCookies(cookies)
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/mass_edit/'
    const headers = {
      'Cookie': cleanedCookies,
      'Content-Type': 'application/json'
    }
    
    const requestPayload: any = {
      campaign_id_list: campaign_id_list.map((id: any) => parseInt(id, 10))
    }

    if (action === 'edit_budget') {
      requestPayload.type = 'change_budget'
      requestPayload.change_budget = {
        daily_budget: parseInt(body.new_budget)
      }
    } else {
      requestPayload.type = action
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload)
    })
    
    const responseText = await response.text()
    let result: any = {}
    
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${responseText}`)
    }
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`)
    }
    
    // Check if response indicates error even with 200 status
    if (result.code && result.code !== 0) {
      throw new Error(`API returned error: ${result.msg || 'Unknown error'} - ${JSON.stringify(result.validation_error_list || [])}`)
    }
    
    const successMessage = action === 'edit_budget' 
      ? `Successfully updated budget for ${campaign_id_list.length} campaign(s)`
      : `Successfully ${action}d ${campaign_id_list.length} campaign(s)`
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        action,
        campaign_count: campaign_id_list.length,
        campaign_ids: campaign_id_list,
        id_toko: tokoId
      }
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform mass action'
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    )
  } finally {
    // Close database connection
    if (connection) {
      connection.release()
    }
  }
}

