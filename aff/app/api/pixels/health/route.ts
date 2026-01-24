import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pixels/health
 * Get pixel health status and recent logs for authenticated affiliate
 */
export async function GET(request: NextRequest) {
    try {
        const { authorized, response, affiliate } = await requireAffiliateAuth(request)

        if (!authorized || !affiliate) {
            return response
        }

        const affiliateId = affiliate.affiliateId

        // Get date range from query params
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

        const connection = await getDatabaseConnection()

        try {
            // 1. Get today's event count
            const todayCountRes = await connection.query(
                `SELECT COUNT(*) as count
                FROM affiliate_pixel_logs
                WHERE affiliate_id = $1 
                AND DATE(created_at) = CURRENT_DATE`,
                [affiliateId]
            )
            const todayCount = parseInt(todayCountRes.rows[0]?.count || '0')

            // 2. Get event count by platform (within date range)
            const platformCountRes = await connection.query(
                `SELECT 
                    platform,
                    COUNT(*) as count,
                    SUM(CASE WHEN event_status = 'success' THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN event_status = 'failed' THEN 1 ELSE 0 END) as failed_count
                FROM affiliate_pixel_logs
                WHERE affiliate_id = $1 
                AND DATE(created_at) BETWEEN $2 AND $3
                GROUP BY platform`,
                [affiliateId, startDate, endDate]
            )

            const platformStats = platformCountRes.rows.map(row => ({
                platform: row.platform,
                total: parseInt(row.count),
                success: parseInt(row.success_count),
                failed: parseInt(row.failed_count)
            }))

            // 3. Get daily trend data (for chart)
            const trendRes = await connection.query(
                `WITH date_series AS (
                    SELECT generate_series(
                        $2::date,
                        $3::date,
                        '1 day'::interval
                    )::date AS date
                )
                SELECT 
                    ds.date,
                    COALESCE(fb.count, 0) as facebook,
                    COALESCE(tt.count, 0) as tiktok,
                    COALESCE(gg.count, 0) as google
                FROM date_series ds
                LEFT JOIN (
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM affiliate_pixel_logs
                    WHERE affiliate_id = $1 AND platform = 'facebook'
                    GROUP BY DATE(created_at)
                ) fb ON ds.date = fb.date
                LEFT JOIN (
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM affiliate_pixel_logs
                    WHERE affiliate_id = $1 AND platform = 'tiktok'
                    GROUP BY DATE(created_at)
                ) tt ON ds.date = tt.date
                LEFT JOIN (
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM affiliate_pixel_logs
                    WHERE affiliate_id = $1 AND platform = 'google'
                    GROUP BY DATE(created_at)
                ) gg ON ds.date = gg.date
                ORDER BY ds.date ASC`,
                [affiliateId, startDate, endDate]
            )

            const trendData = trendRes.rows.map(row => ({
                date: row.date,
                facebook: parseInt(row.facebook),
                tiktok: parseInt(row.tiktok),
                google: parseInt(row.google)
            }))

            // 4. Get recent logs (last 20)
            const recentLogsRes = await connection.query(
                `SELECT 
                    platform,
                    pixel_id,
                    event_name,
                    event_status,
                    error_message,
                    created_at
                FROM affiliate_pixel_logs
                WHERE affiliate_id = $1
                ORDER BY created_at DESC
                LIMIT 20`,
                [affiliateId]
            )

            const recentLogs = recentLogsRes.rows.map(row => ({
                platform: row.platform,
                pixelId: row.pixel_id,
                eventName: row.event_name,
                status: row.event_status,
                errorMessage: row.error_message,
                timestamp: row.created_at
            }))

            // 5. Check if system is "active" (has events in last 24 hours)
            const last24hRes = await connection.query(
                `SELECT COUNT(*) as count
                FROM affiliate_pixel_logs
                WHERE affiliate_id = $1 
                AND created_at >= NOW() - INTERVAL '24 hours'`,
                [affiliateId]
            )
            const isActive = parseInt(last24hRes.rows[0]?.count || '0') > 0

            // 6. Calculate overall success rate
            const totalEvents = platformStats.reduce((sum, p) => sum + p.total, 0)
            const totalSuccess = platformStats.reduce((sum, p) => sum + p.success, 0)
            const successRate = totalEvents > 0 ? Math.round((totalSuccess / totalEvents) * 100) : 0

            return NextResponse.json({
                success: true,
                data: {
                    isActive,
                    todayCount,
                    platformStats,
                    trendData,
                    recentLogs,
                    successRate,
                    dateRange: { startDate, endDate }
                }
            })

        } finally {
            connection.release()
        }

    } catch (error: any) {
        console.error('Pixel health check error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
