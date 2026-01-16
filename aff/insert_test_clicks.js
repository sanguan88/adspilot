const { Client } = require('pg');

async function insertTestClicks() {
    const client = new Client({
        host: '154.19.37.198',
        port: 3306,
        user: 'soroboti_db',
        password: '123qweASD!@#!@#',
        database: 'soroboti_ads',
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // First, check table structure
        const tableInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'affiliate_clicks'
      ORDER BY ordinal_position;
    `);

        console.log('Table structure:', tableInfo.rows);

        // Insert 10 test clicks for today
        const result = await client.query(`
      INSERT INTO affiliate_clicks (affiliate_id, link_id, ip_address, user_agent, created_at)
      SELECT 
        a.affiliate_id,
        (SELECT link_id FROM tracking_links WHERE url LIKE '%TES79C6_TTK1010%' ORDER BY created_at DESC LIMIT 1),
        '127.0.1.1',
        'Test Browser',
        NOW() - (gs || ' hours')::INTERVAL
      FROM affiliates a
      CROSS JOIN generate_series(1, 10) gs
      WHERE a.affiliate_code = 'TES79C6'
      RETURNING click_id;
    `);

        console.log(`✅ Inserted ${result.rowCount} test clicks successfully!`);
        console.log('Test click IDs:', result.rows.map(r => r.click_id));

        await client.end();
    } catch (error) {
        console.error('Error inserting test clicks:', error);
        process.exit(1);
    }
}

insertTestClicks();
