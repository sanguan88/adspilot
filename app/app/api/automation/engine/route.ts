/**
 * Automation Engine API
 * 
 * API untuk mengontrol automation worker
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// In-memory state (untuk development)
// Untuk production, gunakan database atau Redis untuk state management
let engineState = {
  isRunning: false,
  checkInterval: 60000, // 1 menit
  nextCheck: null as string | null,
}

/**
 * GET - Get engine status
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user (optional, bisa di-disable untuk internal use)
    // const user = requireAuth(request)

    // Calculate next check time
    const nextCheck = engineState.isRunning
      ? new Date(Date.now() + engineState.checkInterval).toISOString()
      : null

    return NextResponse.json({
      success: true,
      data: {
        isRunning: engineState.isRunning,
        checkInterval: engineState.checkInterval,
        nextCheck,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get engine status',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Control engine (start/stop/restart)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request)
    
    // Only superadmin can control engine
    if (user.role !== 'superadmin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Only superadmin can control engine',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be: start, stop, or restart',
        },
        { status: 400 }
      )
    }

    // Update state
    // Note: Untuk production, ini harus mengontrol actual PM2 process
    // atau menggunakan IPC/API call ke worker process
    switch (action) {
      case 'start':
        engineState.isRunning = true
        break
      case 'stop':
        engineState.isRunning = false
        break
      case 'restart':
        engineState.isRunning = false
        // Simulate restart delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        engineState.isRunning = true
        break
    }

    const nextCheck = engineState.isRunning
      ? new Date(Date.now() + engineState.checkInterval).toISOString()
      : null

    return NextResponse.json({
      success: true,
      message: `Engine ${action} successful`,
      data: {
        isRunning: engineState.isRunning,
        checkInterval: engineState.checkInterval,
        nextCheck,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to control engine',
      },
      { status: 500 }
    )
  }
}

