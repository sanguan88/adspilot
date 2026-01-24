import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { clearRateLimitConfigCache } from '@/lib/rate-limit';

// GET - Ambil konfigurasi rate limit saat ini
export async function GET(request: NextRequest) {
    let connection = null;

    try {
        // Verify admin authentication
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Forbidden - Admin only' },
                { status: 403 }
            );
        }

        // Get database connection
        connection = await getDatabaseConnection();

        // Fetch current settings
        const result = await connection.query(
            'SELECT max_attempts, window_minutes, block_duration_minutes, is_enabled, updated_at FROM rate_limit_settings LIMIT 1'
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Rate limit settings not found' },
                { status: 404 }
            );
        }

        const settings = result.rows[0];

        return NextResponse.json({
            success: true,
            data: {
                maxAttempts: settings.max_attempts,
                windowMinutes: settings.window_minutes,
                blockDurationMinutes: settings.block_duration_minutes,
                isEnabled: settings.is_enabled,
                updatedAt: settings.updated_at,
            },
        });
    } catch (error) {
        console.error('[Rate Limit Settings API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// PUT - Update konfigurasi rate limit
export async function PUT(request: NextRequest) {
    let connection = null;

    try {
        // Verify admin authentication
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Forbidden - Admin only' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { maxAttempts, windowMinutes, blockDurationMinutes, isEnabled } = body;

        // Validation
        if (maxAttempts !== undefined && (maxAttempts < 1 || maxAttempts > 1000)) {
            return NextResponse.json(
                { success: false, error: 'maxAttempts must be between 1 and 1000' },
                { status: 400 }
            );
        }

        if (windowMinutes !== undefined && (windowMinutes < 1 || windowMinutes > 1440)) {
            return NextResponse.json(
                { success: false, error: 'windowMinutes must be between 1 and 1440 (24 hours)' },
                { status: 400 }
            );
        }

        if (blockDurationMinutes !== undefined && (blockDurationMinutes < 1 || blockDurationMinutes > 10080)) {
            return NextResponse.json(
                { success: false, error: 'blockDurationMinutes must be between 1 and 10080 (7 days)' },
                { status: 400 }
            );
        }

        // Get database connection
        connection = await getDatabaseConnection();

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (maxAttempts !== undefined) {
            updates.push(`max_attempts = $${paramIndex++}`);
            values.push(maxAttempts);
        }

        if (windowMinutes !== undefined) {
            updates.push(`window_minutes = $${paramIndex++}`);
            values.push(windowMinutes);
        }

        if (blockDurationMinutes !== undefined) {
            updates.push(`block_duration_minutes = $${paramIndex++}`);
            values.push(blockDurationMinutes);
        }

        if (isEnabled !== undefined) {
            updates.push(`is_enabled = $${paramIndex++}`);
            values.push(isEnabled);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No fields to update' },
                { status: 400 }
            );
        }

        // Add updated_at and updated_by
        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${paramIndex++}`);
        values.push(decoded.userId);

        // Execute update
        const query = `
      UPDATE rate_limit_settings 
      SET ${updates.join(', ')}
      WHERE id = (SELECT id FROM rate_limit_settings LIMIT 1)
      RETURNING max_attempts, window_minutes, block_duration_minutes, is_enabled, updated_at
    `;

        const result = await connection.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Failed to update settings' },
                { status: 500 }
            );
        }

        const settings = result.rows[0];

        // Clear cache to force reload
        clearRateLimitConfigCache();

        return NextResponse.json({
            success: true,
            message: 'Rate limit settings updated successfully',
            data: {
                maxAttempts: settings.max_attempts,
                windowMinutes: settings.window_minutes,
                blockDurationMinutes: settings.block_duration_minutes,
                isEnabled: settings.is_enabled,
                updatedAt: settings.updated_at,
            },
        });
    } catch (error) {
        console.error('[Rate Limit Settings API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
