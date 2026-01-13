import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

interface RouteParams {
    params: Promise<{ slug: string }>
}

// GET /api/tutorials/[slug] - Get tutorial by slug (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params

        const result = await withDatabaseConnection(async (connection) => {
            // Get tutorial by slug (only published)
            const tutorialResult = await connection.query(
                'SELECT * FROM tutorials WHERE slug = $1 AND is_published = true',
                [slug]
            )

            if (tutorialResult.rows.length === 0) {
                return null
            }

            const tutorial = tutorialResult.rows[0]

            // Get sections
            const sectionsResult = await connection.query(
                `SELECT id, title, content, image_url, image_caption 
                 FROM tutorial_sections 
                 WHERE tutorial_id = $1 
                 ORDER BY order_index ASC`,
                [tutorial.id]
            )

            // Get tips
            const tipsResult = await connection.query(
                'SELECT content FROM tutorial_tips WHERE tutorial_id = $1 ORDER BY order_index ASC',
                [tutorial.id]
            )

            // Get warnings
            const warningsResult = await connection.query(
                'SELECT content FROM tutorial_warnings WHERE tutorial_id = $1 ORDER BY order_index ASC',
                [tutorial.id]
            )

            // Get FAQs
            const faqsResult = await connection.query(
                'SELECT question, answer FROM tutorial_faqs WHERE tutorial_id = $1 ORDER BY order_index ASC',
                [tutorial.id]
            )

            // Get related tutorials (only published)
            const relatedResult = await connection.query(
                `SELECT t.slug, t.title, t.description, t.duration, t.type, t.category, t.icon
                 FROM tutorials t
                 INNER JOIN tutorial_related tr ON t.id = tr.related_tutorial_id
                 WHERE tr.tutorial_id = $1 AND t.is_published = true`,
                [tutorial.id]
            )

            return {
                slug: tutorial.slug,
                title: tutorial.title,
                description: tutorial.description,
                duration: tutorial.duration,
                type: tutorial.type,
                category: tutorial.category,
                icon: tutorial.icon,
                videoUrl: tutorial.video_url,
                coverImage: tutorial.cover_image,
                sections: sectionsResult.rows.map(s => ({
                    id: `section-${s.id}`,
                    title: s.title,
                    content: s.content || '',
                    image: s.image_url,
                    imageCaption: s.image_caption
                })),
                tips: tipsResult.rows.map(t => t.content),
                warnings: warningsResult.rows.map(w => w.content),
                faqs: faqsResult.rows.map(f => ({ question: f.question, answer: f.answer })),
                relatedSlugs: relatedResult.rows.map(r => r.slug),
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
