/**
 * Migration: Create affiliate_pixels table for multi-pixel support
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables manually
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=:#]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    }
}

loadEnv();

async function runMigration() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const client = await pool.connect();
        try {
            console.log('🔄 Creating affiliate_pixels table...');

            await client.query(`
                CREATE TABLE IF NOT EXISTS affiliate_pixels (
                    id SERIAL PRIMARY KEY,
                    affiliate_id VARCHAR(100) NOT NULL,
                    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'tiktok', 'google')),
                    pixel_id VARCHAR(100) NOT NULL,
                    name VARCHAR(100),
                    is_active BOOLEAN DEFAULT TRUE,
                    events_config JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);

            // Index for faster lookups
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_affiliate_pixels_affiliate_id 
                ON affiliate_pixels(affiliate_id)
            `);

            console.log('✅ affiliate_pixels table created.');

            // Migrate potential existing data from affiliates table (if any)
            console.log('🔄 Migrating existing pixel data...');

            // Migrate FB
            await client.query(`
                INSERT INTO affiliate_pixels (affiliate_id, platform, pixel_id, name)
                SELECT affiliate_id, 'facebook', fb_pixel_id, 'Default FB Pixel'
                FROM affiliates 
                WHERE fb_pixel_id IS NOT NULL AND fb_pixel_id != ''
                AND NOT EXISTS (
                    SELECT 1 FROM affiliate_pixels 
                    WHERE affiliate_id = affiliates.affiliate_id AND platform = 'facebook'
                )
            `);

            // Migrate TikTok
            await client.query(`
                INSERT INTO affiliate_pixels (affiliate_id, platform, pixel_id, name)
                SELECT affiliate_id, 'tiktok', tiktok_pixel_id, 'Default TikTok Pixel'
                FROM affiliates 
                WHERE tiktok_pixel_id IS NOT NULL AND tiktok_pixel_id != ''
                AND NOT EXISTS (
                    SELECT 1 FROM affiliate_pixels 
                    WHERE affiliate_id = affiliates.affiliate_id AND platform = 'tiktok'
                )
            `);

            // Migrate Google
            await client.query(`
                INSERT INTO affiliate_pixels (affiliate_id, platform, pixel_id, name)
                SELECT affiliate_id, 'google', google_pixel_id, 'Default Google Pixel'
                FROM affiliates 
                WHERE google_pixel_id IS NOT NULL AND google_pixel_id != ''
                AND NOT EXISTS (
                    SELECT 1 FROM affiliate_pixels 
                    WHERE affiliate_id = affiliates.affiliate_id AND platform = 'google'
                )
            `);

            console.log('✅ Existing pixel data migrated.');

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}
