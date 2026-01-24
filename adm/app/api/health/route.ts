import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

// GET - Get application health status
export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'unknown',
          responseTime: 0,
        },
        mainApp: {
          status: 'unknown',
          uptime: 0,
        },
        worker: {
          status: 'unknown',
          uptime: 0,
        },
      },
    }

    // Check database connection
    const dbStartTime = Date.now()
    try {
      await withDatabaseConnection(async (connection) => {
        await connection.query('SELECT 1')
        connection.release()
      })
      health.services.database.status = 'healthy'
      health.services.database.responseTime = Date.now() - dbStartTime
    } catch (error) {
      health.services.database.status = 'unhealthy'
      health.status = 'degraded'
    }

    // Check main app (PM2 status would be checked here)
    // For now, assume healthy if database is healthy
    health.services.mainApp.status = health.services.database.status === 'healthy' ? 'healthy' : 'unknown'
    
    // Check worker (PM2 status would be checked here)
    health.services.worker.status = health.services.database.status === 'healthy' ? 'healthy' : 'unknown'

    return NextResponse.json({
      success: true,
      data: health,
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        success: true,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        },
      },
      { status: 503 }
    )
  }
}

