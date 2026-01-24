/**
 * Direct Vouchers Migration Script
 * 
 * Menggunakan koneksi PostgreSQL langsung tanpa import dari lib/db.ts
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from multiple possible locations
function loadEnvVars() {
  const possiblePaths = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../db_config.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📂 Loading env from: ${envPath}`);
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (key && value) {
            process.env[key.trim()] = value;
          }
        }
      });
      return;
    }
  }
  
  console.warn('⚠️  No .env file found. Using system environment variables.');
}

async function runMigration() {
  loadEnvVars();

  // Get database config from environment
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  // Validate config
  if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('❌ Database configuration tidak lengkap!');
    console.error('   Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
    console.error('');
    console.error('   Current values:');
    console.error(`   DB_HOST: ${dbConfig.host || 'NOT SET'}`);
    console.error(`   DB_PORT: ${dbConfig.port || 'NOT SET'}`);
    console.error(`   DB_NAME: ${dbConfig.database || 'NOT SET'}`);
    console.error(`   DB_USER: ${dbConfig.user || 'NOT SET'}`);
    console.error(`   DB_PASSWORD: ${dbConfig.password ? '***' : 'NOT SET'}`);
    process.exit(1);
  }

  console.log('🔄 Starting vouchers migration...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Step 1: Create vouchers tables
    console.log('📝 Step 1: Creating vouchers and voucher_usage tables...');
    const vouchersSchemaPath = path.join(__dirname, 'vouchers-schema.sql');
    const vouchersSchemaSql = fs.readFileSync(vouchersSchemaPath, 'utf-8');
    
    await pool.query(vouchersSchemaSql);
    console.log('✅ vouchers and voucher_usage tables created successfully!');

    // Step 2: Update transactions table
    console.log('');
    console.log('📝 Step 2: Adding voucher columns to transactions table...');
    const transactionsUpdatePath = path.join(__dirname, 'add-voucher-columns-to-transactions.sql');
    const transactionsUpdateSql = fs.readFileSync(transactionsUpdatePath, 'utf-8');
    
    await pool.query(transactionsUpdateSql);
    console.log('✅ voucher columns added to transactions table!');

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Test voucher creation in admin portal (/vouchers)');
    console.log('   2. Test voucher validation in checkout page');
    console.log('   3. Test complete voucher flow');

  } catch (error) {
    if (error.code === '42P07') { // duplicate_table
      console.warn('⚠️  Table already exists. Skipping creation.');
    } else if (error.code === '42701') { // duplicate_column
      console.warn('⚠️  Column already exists. Skipping column addition.');
    } else {
      console.error('❌ Migration error:', error.message);
      if (error.code) {
        console.error('   Error code:', error.code);
      }
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

