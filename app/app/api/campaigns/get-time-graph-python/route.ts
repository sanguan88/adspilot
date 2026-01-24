import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

// Function to call Shopee API get_time_graph using Python script
async function callShopeeGetTimeGraphPython(cookies: string, startTime: string, endTime: string) {
  // Generate unique filename to avoid race conditions
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const scriptDir = process.cwd()
  const tempScriptPath = path.join(scriptDir, `temp_get_time_graph_${uniqueId}.py`)
  
  try {
    // Read the template Python script
    const templateScript = `import requests
import json
import sys
from datetime import datetime

# Get parameters from command line arguments
cookies = sys.argv[1]
start_date = sys.argv[2]
end_date = sys.argv[3]

API_URL = "https://seller.shopee.co.id/api/pas/v1/report/get_time_graph/"

def convert_date_to_timestamp(date_str, is_start=True):
    """Convert date string (YYYY-MM-DD) to Unix timestamp"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    if is_start:
        date_obj = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        date_obj = date_obj.replace(hour=23, minute=59, second=59, microsecond=999000)
    return int(date_obj.timestamp())

headers = {
    "Cookie": cookies,
    "User-Agent": "ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1",
    "X-Region": "id",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Accept-Language": "id-ID,id;q=0.9",
    "Origin": "https://seller.shopee.co.id",
    "Referer": "https://seller.shopee.co.id/"
}

start_timestamp = convert_date_to_timestamp(start_date, True)
end_timestamp = convert_date_to_timestamp(end_date, False)

payload = {
    "agg_interval": 4,
    "campaign_type": "new_cpc_homepage",
    "start_time": start_timestamp,
    "end_time": end_timestamp,
    "need_roi_target_setting": False
}

try:
    response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
    result = {
        "status_code": response.status_code,
        "success": response.status_code == 200,
        "data": response.json() if response.status_code == 200 else {"error": response.text}
    }
    print(json.dumps(result))
except Exception as e:
    error_result = {
        "status_code": 500,
        "success": False,
        "error": str(e)
    }
    print(json.dumps(error_result))
    sys.exit(1)
`

    // Write temporary script
    fs.writeFileSync(tempScriptPath, templateScript)
    
    // Escape cookies for command line (replace quotes and special characters)
    const escapedCookies = cookies.replace(/"/g, '\\"').replace(/\$/g, '\\$')
    
    // Execute Python script
    const pythonCommand = `python "${tempScriptPath}" "${escapedCookies}" "${startTime}" "${endTime}"`
    
    console.log(`[get_time_graph_python] Executing Python script...`)
    const { stdout, stderr } = await execAsync(pythonCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
      timeout: 30000 // 30 seconds timeout
    })
    
    if (stderr) {
      console.error(`[get_time_graph_python] Python stderr: ${stderr}`)
    }
    
    // Parse JSON response from Python script
    const result = JSON.parse(stdout.trim())
    
    if (!result.success) {
      throw new Error(`Python script failed: ${result.error || 'Unknown error'}`)
    }
    
    return {
      success: true,
      data: result.data?.data || result.data
    }
    
  } catch (error) {
    const sanitized = error instanceof Error ? error.message : String(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error calling get_time_graph via Python: ${sanitized}`)
    throw error
  } finally {
    // Always clean up temporary file, even if there was an error
    try {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath)
      }
    } catch (cleanupError) {
      // Log cleanup errors but don't throw - file will be cleaned up later
      console.error(`[get-time-graph-python] Failed to cleanup temp file ${tempScriptPath}:`, cleanupError)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cookies, start_time, end_time } = body
    
    if (!cookies || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: cookies, start_time, end_time' },
        { status: 400 }
      )
    }
    
    const result = await callShopeeGetTimeGraphPython(cookies, start_time, end_time)
    
    return NextResponse.json({
      success: true,
      data: result.data
    })
    
  } catch (error) {
    const sanitized = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: sanitized },
      { status: 500 }
    )
  }
}

