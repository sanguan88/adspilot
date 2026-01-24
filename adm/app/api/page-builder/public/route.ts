import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';

// GET /api/page-builder/public?page=landing
// Public endpoint for landing page to fetch content (no auth required)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pageKey = searchParams.get('page') || 'landing';

        const connection = await getDatabaseConnection();

        try {
            const result = await connection.query(
                'SELECT content, updated_at FROM landing_page_builder WHERE page_key = $1',
                [pageKey]
            );

            if (result.rows.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: { sections: [] },
                    updated_at: null,
                });
            }

            // Filter only enabled sections and blocks for public consumption
            const content = result.rows[0].content;
            const filteredContent = {
                sections: content.sections
                    ?.filter((section: any) => section.enabled !== false)
                    .map((section: any) => ({
                        ...section,
                        blocks: section.blocks?.filter((block: any) => block.enabled !== false) || []
                    }))
                    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                    || []
            };

            // Add CORS headers for cross-origin requests from landing page
            const response = NextResponse.json({
                success: true,
                data: filteredContent,
                updated_at: result.rows[0].updated_at,
            });

            response.headers.set('Access-Control-Allow-Origin', '*');
            response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

            return response;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching public page builder content:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch page content' },
            { status: 500 }
        );
    }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
