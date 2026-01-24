import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-helper';
import LANDING_PAGE_SEED_DATA from '@/data/landing-page-seed';

// POST /api/page-builder/seed - Seed the database with landing page content
export async function POST(request: NextRequest) {
    try {
        // Require admin authentication
        await requireAdminAuth(request);

        const { searchParams } = new URL(request.url);
        const pageKey = searchParams.get('page') || 'landing';
        const forceOverwrite = searchParams.get('force') === 'true';

        const connection = await getDatabaseConnection();

        try {
            // Check if data already exists
            const existing = await connection.query(
                'SELECT id FROM landing_page_builder WHERE page_key = $1',
                [pageKey]
            );

            if (existing.rows.length > 0 && !forceOverwrite) {
                return NextResponse.json({
                    success: false,
                    message: 'Data already exists. Use ?force=true to overwrite.',
                }, { status: 409 });
            }

            // Insert or update with seed data
            const result = await connection.query(
                `INSERT INTO landing_page_builder (page_key, content, updated_by, updated_at)
                 VALUES ($1, $2, 'seed-script', NOW())
                 ON CONFLICT (page_key) 
                 DO UPDATE SET 
                 content = $2, 
                 updated_by = 'seed-script', 
                 updated_at = NOW()
                 RETURNING *`,
                [pageKey, LANDING_PAGE_SEED_DATA]
            );

            return NextResponse.json({
                success: true,
                message: `Successfully seeded ${LANDING_PAGE_SEED_DATA.sections.length} sections`,
                data: {
                    sections_count: LANDING_PAGE_SEED_DATA.sections.length,
                    blocks_count: LANDING_PAGE_SEED_DATA.sections.reduce(
                        (acc, s) => acc + (s.blocks?.length || 0), 0
                    ),
                    updated_at: result.rows[0].updated_at,
                }
            });
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('Error seeding page builder content:', error);

        if (error.message?.includes('Unauthorized') || error.message?.includes('Authentication required')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to seed page builder content', details: error.message },
            { status: 500 }
        );
    }
}
