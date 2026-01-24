const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

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

async function insertDummyData() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Inserting dummy pixel event data...');

        const client = await pool.connect();
        try {
            // Get first affiliate (for testing)
            const affiliateRes = await client.query(
                `SELECT affiliate_id FROM affiliates LIMIT 1`
            );

            if (affiliateRes.rows.length === 0) {
                console.log('❌ No affiliates found. Please create an affiliate first.');
                return;
            }

            const affiliateId = affiliateRes.rows[0].affiliate_id;
            console.log(`✅ Using affiliate ID: ${affiliateId}`);

            // Sample events
            const events = [
                // Facebook events
                { platform: 'facebook', pixelId: 'FB_123456789', eventName: 'PageView', status: 'success', hoursAgo: 1 },
                { platform: 'facebook', pixelId: 'FB_123456789', eventName: 'ViewContent', status: 'success', hoursAgo: 2 },
                { platform: 'facebook', pixelId: 'FB_123456789', eventName: 'AddToCart', status: 'success', hoursAgo: 3 },
                { platform: 'facebook', pixelId: 'FB_123456789', eventName: 'Purchase', status: 'success', hoursAgo: 4 },
                { platform: 'facebook', pixelId: 'FB_123456789', eventName: 'Purchase', status: 'failed', hoursAgo: 5, error: 'Network timeout' },

                // TikTok events
                { platform: 'tiktok', pixelId: 'TT_987654321', eventName: 'PageView', status: 'success', hoursAgo: 1 },
                { platform: 'tiktok', pixelId: 'TT_987654321', eventName: 'ClickButton', status: 'success', hoursAgo: 2 },
                { platform: 'tiktok', pixelId: 'TT_987654321', eventName: 'CompletePayment', status: 'success', hoursAgo: 3 },

                // Google events
                { platform: 'google', pixelId: 'G-XXXXXXXXX', eventName: 'page_view', status: 'success', hoursAgo: 1 },
                { platform: 'google', pixelId: 'G-XXXXXXXXX', eventName: 'purchase', status: 'success', hoursAgo: 2 },
                { platform: 'google', pixelId: 'G-XXXXXXXXX', eventName: 'conversion', status: 'success', hoursAgo: 4 },
            ];

            for (const event of events) {
                await client.query(
                    `INSERT INTO affiliate_pixel_logs 
                    (affiliate_id, platform, pixel_id, event_name, event_status, error_message, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${event.hoursAgo} hours')`,
                    [
                        affiliateId,
                        event.platform,
                        event.pixelId,
                        event.eventName,
                        event.status,
                        event.error || null
                    ]
                );
            }

            console.log(`✅ Inserted ${events.length} dummy pixel events`);
            console.log('📊 Breakdown:');
            console.log('   - Facebook: 5 events (4 success, 1 failed)');
            console.log('   - TikTok: 3 events (all success)');
            console.log('   - Google: 3 events (all success)');
            console.log('\n🎉 Refresh your Pixel Tracking page to see the data!');

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Failed to insert dummy data:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    insertDummyData()
        .then(() => {
            console.log('✅ Script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}
