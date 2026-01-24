import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';

// Public API endpoint - GET /api/content?page=landing
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pageKey = searchParams.get('page') || 'landing';

        const connection = await getDatabaseConnection();

        try {
            const result = await connection.query(
                'SELECT content FROM landing_page_builder WHERE page_key = ?',
                [pageKey]
            );

            if (result.rows.length === 0) {
                // Return empty structure if not found
                return NextResponse.json(
                    { sections: [] },
                    {
                        headers: {
                            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                        },
                    }
                );
            }

            // Parse JSON content if it's a string
            const content = typeof result.rows[0].content === 'string'
                ? JSON.parse(result.rows[0].content)
                : result.rows[0].content;

            return NextResponse.json(content, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                },
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching page content:', error);
        return NextResponse.json(
            { sections: [] },
            { status: 500 }
        );
    }
}
