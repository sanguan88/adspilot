import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/tutorials/[id] - Get tutorial by ID or slug
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        const result = await withDatabaseConnection(async (connection) => {
            // Check if id is numeric (ID) or string (slug)
            const isNumeric = /^\d+$/.test(id)
            const query = isNumeric
                ? 'SELECT * FROM tutorials WHERE id = $1'
                : 'SELECT * FROM tutorials WHERE slug = $1'

            const tutorialResult = await connection.query(query, [isNumeric ? parseInt(id) : id])

            if (tutorialResult.rows.length === 0) {
                return null
            }

            const tutorial = tutorialResult.rows[0]

            // Get sections
            const sectionsResult = await connection.query(
                'SELECT * FROM tutorial_sections WHERE tutorial_id = $1 ORDER BY order_index ASC',
                [tutorial.id]
            )

            // Get tips
            const tipsResult = await connection.query(
                'SELECT * FROM tutorial_tips WHERE tutorial_id = $1 ORDER BY order_index ASC',
                [tutorial.id]
            )

            // Get warnings
            const warningsResult = await connection.query(
                'SELECT * FROM tutorial_warnings WHERE tutorial_id = $1 ORDER BY order_index ASC',
                [tutorial.id]
            )

            // Get FAQs
            const faqsResult = await connection.query(
                'SELECT * FROM tutorial_faqs WHERE tutorial_id = $1 ORDER BY order_index ASC',
                [tutorial.id]
            )

            // Get related tutorials
            const relatedResult = await connection.query(
                `SELECT t.* FROM tutorials t
                 INNER JOIN tutorial_related tr ON t.id = tr.related_tutorial_id
                 WHERE tr.tutorial_id = $1`,
                [tutorial.id]
            )

            return {
                ...tutorial,
                sections: sectionsResult.rows,
                tips: tipsResult.rows.map(t => t.content),
                warnings: warningsResult.rows.map(w => w.content),
                faqs: faqsResult.rows.map(f => ({ question: f.question, answer: f.answer })),
                related: relatedResult.rows
            }
        })

        if (!result) {
            return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 })
        }

        return NextResponse.json({ tutorial: result })
    } catch (error: any) {
        console.error('Error fetching tutorial:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT /api/tutorials/[id] - Update a tutorial
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const body = await request.json()
        const {
            slug,
            title,
            description,
            duration,
            type,
            category,
            icon,
            cover_image,
            video_url,
            is_published,
            order_index,
            sections = [],
            tips = [],
            warnings = [],
            faqs = [],
            related_slugs = []
        } = body

        const result = await withDatabaseConnection(async (connection) => {
            await connection.query('BEGIN')

            try {
                // Update tutorial
                const updateFields = []
                const updateValues = []
                let paramIndex = 1

                const fieldsToUpdate = {
                    slug, title, description, duration, type, category, icon,
                    cover_image, video_url, is_published, order_index
                }

                for (const [key, value] of Object.entries(fieldsToUpdate)) {
                    if (value !== undefined) {
                        updateFields.push(`${key} = $${paramIndex}`)
                        updateValues.push(value)
                        paramIndex++
                    }
                }

                if (updateFields.length > 0) {
                    updateFields.push(`updated_at = NOW()`)
                    updateValues.push(id)

                    const updateQuery = `
                        UPDATE tutorials 
                        SET ${updateFields.join(', ')}
                        WHERE id = $${paramIndex}
                        RETURNING *
                    `
                    await connection.query(updateQuery, updateValues)
                }

                // Update sections - delete and recreate
                if (sections.length > 0 || body.hasOwnProperty('sections')) {
                    await connection.query('DELETE FROM tutorial_sections WHERE tutorial_id = $1', [id])
                    for (let i = 0; i < sections.length; i++) {
                        const section = sections[i]
                        await connection.query(
                            `INSERT INTO tutorial_sections (tutorial_id, order_index, title, content, image_url, image_caption)
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [id, i, section.title, section.content, section.image_url, section.image_caption]
                        )
                    }
                }

                // Update tips
                if (tips.length > 0 || body.hasOwnProperty('tips')) {
                    await connection.query('DELETE FROM tutorial_tips WHERE tutorial_id = $1', [id])
                    for (let i = 0; i < tips.length; i++) {
                        await connection.query(
                            `INSERT INTO tutorial_tips (tutorial_id, content, order_index) VALUES ($1, $2, $3)`,
                            [id, tips[i], i]
                        )
                    }
                }

                // Update warnings
                if (warnings.length > 0 || body.hasOwnProperty('warnings')) {
                    await connection.query('DELETE FROM tutorial_warnings WHERE tutorial_id = $1', [id])
                    for (let i = 0; i < warnings.length; i++) {
                        await connection.query(
                            `INSERT INTO tutorial_warnings (tutorial_id, content, order_index) VALUES ($1, $2, $3)`,
                            [id, warnings[i], i]
                        )
                    }
                }

                // Update FAQs
                if (faqs.length > 0 || body.hasOwnProperty('faqs')) {
                    await connection.query('DELETE FROM tutorial_faqs WHERE tutorial_id = $1', [id])
                    for (let i = 0; i < faqs.length; i++) {
                        const faq = faqs[i]
                        await connection.query(
                            `INSERT INTO tutorial_faqs (tutorial_id, question, answer, order_index) VALUES ($1, $2, $3, $4)`,
                            [id, faq.question, faq.answer, i]
                        )
                    }
                }

                // Update related tutorials
                if (related_slugs.length > 0 || body.hasOwnProperty('related_slugs')) {
                    await connection.query('DELETE FROM tutorial_related WHERE tutorial_id = $1', [id])
                    for (const relatedSlug of related_slugs) {
                        const relatedResult = await connection.query(
                            'SELECT id FROM tutorials WHERE slug = $1',
                            [relatedSlug]
                        )
                        if (relatedResult.rows.length > 0) {
                            await connection.query(
                                `INSERT INTO tutorial_related (tutorial_id, related_tutorial_id)
                                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                                [id, relatedResult.rows[0].id]
                            )
                        }
                    }
                }

                await connection.query('COMMIT')

                // Fetch updated tutorial
                const updatedResult = await connection.query('SELECT * FROM tutorials WHERE id = $1', [id])
                return updatedResult.rows[0]
            } catch (error) {
                await connection.query('ROLLBACK')
                throw error
            }
        })

        return NextResponse.json({ tutorial: result })
    } catch (error: any) {
        console.error('Error updating tutorial:', error)
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE /api/tutorials/[id] - Delete a tutorial
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        await withDatabaseConnection(async (connection) => {
            // Cascade delete will handle related tables
            await connection.query('DELETE FROM tutorials WHERE id = $1', [id])
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting tutorial:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
