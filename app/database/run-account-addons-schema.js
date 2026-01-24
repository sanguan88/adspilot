/**
 * Database Migration Script: Account Addons Schema
 * 
 * Run this script to create account_addons table
 * Usage: node database/run-account-addons-schema.js
 */

require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'adspilot',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    })

    let client
    try {
        client = await pool.connect()
        console.log('✅ Connected to PostgreSQL database')

        // Read SQL file
        const sqlPath = path.join(__dirname, 'account-addons-schema-pg.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        console.log('📝 Running account_addons schema migration...')
        await client.query(sql)
        console.log('✅ account_addons table created successfully')

        // Verify table exists
        const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'account_addons'
    `)

        if (verifyResult.rows.length > 0) {
            console.log('✅ Verification successful: account_addons table exists')

            // Show table structure
            const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'account_addons'
        ORDER BY ordinal_position
      `)

            console.log('\n📋 Table structure:')
            columnsResult.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
            })
        } else {
            console.error('❌ Verification failed: account_addons table not found')
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message)
        console.error(error)
        process.exit(1)
    } finally {
        if (client) {
            client.release()
        }
        await pool.end()
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n✅ Migration completed successfully')
        process.exit(0)
    })
    .catch(error => {
        console.error('\n❌ Migration failed:', error)
        process.exit(1)
    })
