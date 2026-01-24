import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireActiveStatus } from '@/lib/auth';
import { checkResourceAccess } from '@/lib/role-checker';

/**
 * GET /api/subscriptions
 * Get current user subscription status
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireActiveStatus(request);

        // Check permission to view active subscription
        await checkResourceAccess(user, 'view', 'subscriptions', false);

        const connection = await getDatabaseConnection();

        try {
            // Get current active subscription
            const result = await connection.query(
                `SELECT 
          s.id, s.user_id, s.plan_id, s.status,
          s.start_date, s.end_date, s.auto_renew,
          s.created_at, s.updated_at,
          p.name as plan_name, 
          p.features
        FROM user_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.plan_id
        WHERE s.user_id = $1 
          AND s.status = 'active' 
          AND s.end_date > NOW()
        ORDER BY s.end_date DESC
        LIMIT 1`,
                [user.id]
            );

            connection.release();

            if (result.rows.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: {
                        hasActiveSubscription: false,
                        subscription: null
                    }
                });
            }

            const subscription = result.rows[0];

            return NextResponse.json({
                success: true,
                data: {
                    hasActiveSubscription: true,
                    subscription: {
                        id: subscription.id,
                        planId: subscription.plan_id,
                        planName: subscription.plan_name,
                        status: subscription.status,
                        startDate: subscription.start_date,
                        endDate: subscription.end_date,
                        autoRenew: subscription.auto_renew,
                        features: typeof subscription.features === 'string'
                            ? JSON.parse(subscription.features)
                            : subscription.features
                    }
                }
            });
        } catch (error: any) {
            connection.release();
            throw error;
        }
    } catch (error: any) {
        console.error('Get subscription error:', error);
        if (error.message === 'Authentication required') {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (error.message.startsWith('Permission denied')) {
            return NextResponse.json({ success: false, error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil data subscription' },
            { status: 500 }
        );
    }
}
