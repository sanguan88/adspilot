import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

// GET /api/tutorials - List all published tutorials
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const category = searchParams.get('category')
        const type = searchParams.get('type')
        const search = searchParams.get('search')

        const result = await withDatabaseConnection(async (connection) => {
            let query = `
                SELECT 
                    t.id,
                    t.slug,
                    t.title,
                    t.description,
                    t.duration,
                    t.type,
                    t.category,
                    t.icon,
                    t.cover_image,
                    t.video_url,
                    t.order_index,
                    t.created_at
                FROM tutorials t
                WHERE t.is_published = true
            `
            const params: any[] = []
            let paramIndex = 1

            if (category && category !== 'all' && category !== 'Semua') {
                query += ` AND t.category = $${paramIndex}`
                params.push(category)
                paramIndex++
            }

            if (type && type !== 'all') {
                query += ` AND t.type = $${paramIndex}`
                params.push(type)
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
