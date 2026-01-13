/**
 * Migration script untuk membuat tabel rule_execution_logs
 * Menyimpan detail eksekusi rule per campaign dengan error message spesifik
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

/**
 * Load environment variables from possible .env files
 * Reuse logic similar to run-vouchers-schema.js
 */
function loadEnvFile() {
  const possiblePaths = [
    path.join(__dirname, '../.env.local'), // adbot/.env.local (one level up)
    path.join(__dirname, '../../.env.local'), // adbot/.env.local
    path.join(__dirname, '../../../.env.local'), // root/.env.local
    path.join(__dirname, '../../../../.env.local'), // local_pc/.env.local
    path.join(__dirname, '../../db_config.env'), // adbot/db_config.env
  ]

  let envPath = null
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      envPath = possiblePath
      break
    }
  }

  if (!envPath) {
    console.warn('⚠️  .env file not found. Using system environment variables.')
    return
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const envVars = {}

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^["']|["']$/g, '')
      envVars[key.trim()] = cleanValue
    }
  })

  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key]
  })

  console.log(`✅ Loaded env file from: ${envPath}`)
}

loadEnvFile()

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'soroboti_ads',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Running rule_execution_logs schema migration...')
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'rule-execution-logs-schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute SQL
    await client.query(sql)
    
    console.log('✅ Migration completed successfully!')
    console.log('📊 Table rule_execution_logs created')
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()

