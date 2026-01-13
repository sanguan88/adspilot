/**
 * Migration: Create tutorials tables
 * 
 * Run with: node migrations/create-tutorials-tables.js
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=')
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
            }
        })
    }
} catch (err) {
    console.error('Error loading .env.local:', err)
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

async function migrate() {
    const client = await pool.connect()

    try {
        console.log('🚀 Starting tutorials tables migration...')

        // Create tutorials table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tutorials (
                id SERIAL PRIMARY KEY,
                slug VARCHAR(255) UNIQUE NOT NULL,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                duration VARCHAR(50),
                type VARCHAR(20) NOT NULL CHECK (type IN ('video', 'article')),
                category VARCHAR(100) NOT NULL,
                icon VARCHAR(50) DEFAULT 'BookOpen',
                cover_image TEXT,
                video_url TEXT,
                is_published BOOLEAN DEFAULT false,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `)
        console.log('✅ Created tutorials table')

        // Create tutorial_sections table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tutorial_sections (
                id SERIAL PRIMARY KEY,
                tutorial_id INTEGER NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
                order_index INTEGER NOT NULL DEFAULT 0,
                title VARCHAR(500) NOT NULL,
                content TEXT,
                image_url TEXT,
                image_caption TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `)
        console.log('✅ Created tutorial_sections table')

        // Create tutorial_tips table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tutorial_tips (
                id SERIAL PRIMARY KEY,
                tutorial_id INTEGER NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)
        console.log('✅ Created tutorial_tips table')

        // Create tutorial_warnings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tutorial_warnings (
                id SERIAL PRIMARY KEY,
                tutorial_id INTEGER NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)
        console.log('✅ Created tutorial_warnings table')

        // Create tutorial_faqs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tutorial_faqs (
                id SERIAL PRIMARY KEY,
                tutorial_id INTEGER NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)
        console.log('✅ Created tutorial_faqs table')

        // Create tutorial_related table (for related tutorials)
        await client.query(`
            CREATE TABLE IF NOT EXISTS tutorial_related (
                id SERIAL PRIMARY KEY,
                tutorial_id INTEGER NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
                related_tutorial_id INTEGER NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
                UNIQUE(tutorial_id, related_tutorial_id)
            )
        `)
        console.log('✅ Created tutorial_related table')

        // Create indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorials_slug ON tutorials(slug)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorials_category ON tutorials(category)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorials_published ON tutorials(is_published)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorials_order ON tutorials(order_index)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorial_sections_tutorial ON tutorial_sections(tutorial_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorial_sections_order ON tutorial_sections(tutorial_id, order_index)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorial_tips_tutorial ON tutorial_tips(tutorial_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorial_warnings_tutorial ON tutorial_warnings(tutorial_id)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tutorial_faqs_tutorial ON tutorial_faqs(tutorial_id)`)
        console.log('✅ Created indexes')

        console.log('\n🏁 Migration completed successfully!')

    } catch (error) {
        console.error('❌ Migration failed:', error.message)
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

migrate().catch(console.error)
