// Migration runner for landing_page_builder table
const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    database: 'soroboti_ads',
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting migration...');

        // Create table
        await client.query(`
      CREATE TABLE IF NOT EXISTS landing_page_builder (
        id SERIAL PRIMARY KEY,
        page_key VARCHAR(50) NOT NULL UNIQUE,
        content JSONB NOT NULL DEFAULT '{"sections": []}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Table landing_page_builder created');

        // Create indexes
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_landing_page_builder_page_key 
      ON landing_page_builder(page_key);
    `);
        console.log('✅ Index idx_landing_page_builder_page_key created');

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_landing_page_builder_content 
      ON landing_page_builder USING GIN (content);
    `);
        console.log('✅ Index idx_landing_page_builder_content created');

        // Insert default data
        await client.query(`
      INSERT INTO landing_page_builder (page_key, content, updated_by) 
      VALUES ('landing', '{"sections": []}'::jsonb, 'system')
      ON CONFLICT (page_key) DO NOTHING;
    `);
        console.log('✅ Default data inserted');

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
