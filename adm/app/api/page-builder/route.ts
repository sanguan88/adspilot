import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireAdminAuth as requireAuth } from '@/lib/auth-helper';

// GET /api/page-builder?page=landing
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pageKey = searchParams.get('page') || 'landing';

        const connection = await getDatabaseConnection();

        try {
            const result = await connection.query(
                'SELECT content, updated_at, updated_by FROM landing_page_builder WHERE page_key = $1',
                [pageKey]
            );

            if (result.rows.length === 0) {
                // Return empty structure if not found
                return NextResponse.json({
                    content: { sections: [] },
                    updated_at: null,
                    updated_by: null,
                });
            }

            // PostgreSQL returns JSONB as object already, no need to parse
            const content = result.rows[0].content;

            return NextResponse.json({
                content,
                updated_at: result.rows[0].updated_at,
                updated_by: result.rows[0].updated_by,
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching page builder content:', error);
        return NextResponse.json(
            { error: 'Failed to fetch page builder content' },
            { status: 500 }
        );
    }
}

// PUT /api/page-builder
export async function PUT(request: NextRequest) {
    try {
        // Get current user from session (don't require admin for page builder)
        const user = await requireAuth(request);

        const body = await request.json();

        // Support both formats:
        // 1. New format: { sections: [...] }
        // 2. Old format: { page_key, content, updated_by }
        let page_key, content;
        const updated_by = user?.email || 'system'; // Always use current user or system

        // Determine page_key from search params or body
        const { searchParams } = new URL(request.url);
        const pageFromParams = searchParams.get('page');

        if (body.sections && Array.isArray(body.sections)) {
            // New format - direct sections array
            page_key = pageFromParams || body.page_key || 'landing'; // Allow page from params, body, or default
            content = { sections: body.sections };
        } else {
            // Old format
            page_key = pageFromParams || body.page_key; // Allow page from params or body
            content = body.content;
        }

        if (!page_key || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: page_key or content' },
                { status: 400 }
            );
        }

        // Validate JSON structure
        if (!content.sections || !Array.isArray(content.sections)) {
            return NextResponse.json(
                { error: 'Invalid content structure: sections array required' },
                { status: 400 }
            );
        }

        const connection = await getDatabaseConnection();

        try {
            const result = await connection.query(
                `INSERT INTO landing_page_builder (page_key, content, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (page_key) 
         DO UPDATE SET 
         content = $2, 
         updated_by = $3, 
         updated_at = NOW()
         RETURNING *`,
                [page_key, content, updated_by]
            );

            return NextResponse.json({
                success: true,
                message: 'Page builder content berhasil disimpan',
                data: result.rows[0]
            });
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('Error saving page builder content:', error);

        if (error.message?.includes('Unauthorized') || error.message?.includes('Authentication required')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to save page builder content', details: error.message },
            { status: 500 }
        );
    }
}
