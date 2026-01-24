import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

// GET /api/tutorials - List all tutorials (with optional filters)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const category = searchParams.get('category')
        const type = searchParams.get('type')
        const published = searchParams.get('published')
        const search = searchParams.get('search')

        const result = await withDatabaseConnection(async (connection) => {
            let query = `
                SELECT 
                    t.*,
                    (SELECT COUNT(*) FROM tutorial_sections WHERE tutorial_id = t.id) as section_count,
                    (SELECT COUNT(*) FROM tutorial_tips WHERE tutorial_id = t.id) as tip_count,
                    (SELECT COUNT(*) FROM tutorial_warnings WHERE tutorial_id = t.id) as warning_count,
                    (SELECT COUNT(*) FROM tutorial_faqs WHERE tutorial_id = t.id) as faq_count
                FROM tutorials t
                WHERE 1=1
            `
            const params: any[] = []
            let paramIndex = 1

            if (category && category !== 'all') {
                query += ` AND t.category = $${paramIndex}`
                params.push(category)
                paramIndex++
            }

            if (type && type !== 'all') {
                query += ` AND t.type = $${paramIndex}`
                params.push(type)
                paramIndex++
            }

            if (published !== null && published !== undefined) {
                query += ` AND t.is_published = $${paramIndex}`
                params.push(published === 'true')
                paramIndex++
            }

            if (search) {
                query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`
                params.push(`%${search}%`)
                paramIndex++
            }

            query += ' ORDER BY t.order_index ASC, t.created_at DESC'

            const tutorials = await connection.query(query, params)
            return tutorials.rows
        })

        return NextResponse.json({ tutorials: result })
    } catch (error: any) {
        console.error('Error fetching tutorials:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/tutorials - Create a new tutorial
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            slug,
            title,
            description,
            duration,
            type,
            category,
            icon = 'BookOpen',
            cover_image,
            video_url,
            is_published = false,
            order_index = 0,
            sections = [],
            tips = [],
            warnings = [],
            faqs = [],
            related_slugs = []
        } = body

        if (!slug || !title || !type || !category) {
            return NextResponse.json(
                { error: 'Missing required fields: slug, title, type, category' },
                { status: 400 }
            )
        }

        const result = await withDatabaseConnection(async (connection) => {
            // Begin transaction
            await connection.query('BEGIN')

            try {
                // Insert tutorial
                const tutorialResult = await connection.query(
                    `INSERT INTO tutorials (slug, title, description, duration, type, category, icon, cover_image, video_url, is_published, order_index)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     RETURNING *`,
                    [slug, title, description, duration, type, category, icon, cover_image, video_url, is_published, order_index]
                )
                const tutorial = tutorialResult.rows[0]

                // Insert sections
                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i]
                    await connection.query(
                        `INSERT INTO tutorial_sections (tutorial_id, order_index, title, content, image_url, image_caption)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [tutorial.id, i, section.title, section.content, section.image_url, section.image_caption]
                    )
                }

                // Insert tips
                for (let i = 0; i < tips.length; i++) {
                    await connection.query(
                        `INSERT INTO tutorial_tips (tutorial_id, content, order_index)
                         VALUES ($1, $2, $3)`,
                        [tutorial.id, tips[i], i]
                    )
                }

                // Insert warnings
                for (let i = 0; i < warnings.length; i++) {
                    await connection.query(
                        `INSERT INTO tutorial_warnings (tutorial_id, content, order_index)
                         VALUES ($1, $2, $3)`,
                        [tutorial.id, warnings[i], i]
                    )
                }

                // Insert FAQs
                for (let i = 0; i < faqs.length; i++) {
                    const faq = faqs[i]
                    await connection.query(
                        `INSERT INTO tutorial_faqs (tutorial_id, question, answer, order_index)
                         VALUES ($1, $2, $3, $4)`,
                        [tutorial.id, faq.question, faq.answer, i]
                    )
                }

                // Insert related tutorials (by slug)
                if (related_slugs.length > 0) {
                    for (const relatedSlug of related_slugs) {
                        const relatedResult = await connection.query(
                            'SELECT id FROM tutorials WHERE slug = $1',
                            [relatedSlug]
                        )
                        if (relatedResult.rows.length > 0) {
                            await connection.query(
                                `INSERT INTO tutorial_related (tutorial_id, related_tutorial_id)
                                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                [tutorial.id, relatedResult.rows[0].id]
                            )
                        }
                    }
                }

                await connection.query('COMMIT')
                return tutorial
            } catch (error) {
                await connection.query('ROLLBACK')
                throw error
            }
        })

        return NextResponse.json({ tutorial: result }, { status: 201 })
    } catch (error: any) {
        console.error('Error creating tutorial:', error)
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
