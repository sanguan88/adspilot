/**
 * Run Vouchers Schema Migration
 * 
 * Script untuk create vouchers table, voucher_usage table, dan update transactions table
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnvFile() {
  // Try multiple possible paths for .env files
  const possiblePaths = [
    path.join(__dirname, '../../.env.local'), // adbot/.env.local
    path.join(__dirname, '../../../.env.local'), // root/.env.local
    path.join(__dirname, '../../../../.env.local'), // local_pc/.env.local
    path.join(__dirname, '../../db_config.env'), // adbot/db_config.env
  ];
  
  let envPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      envPath = possiblePath;
      break;
    }
  }
  
  if (!envPath) {
    console.warn('⚠️  .env file not found. Using system environment variables.');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim();
      // Remove quotes and handle password with special characters
      const cleanValue = value.replace(/^["']|["']$/g, '');
      envVars[key.trim()] = cleanValue;
    }
  });
  
  // Set environment variables (override existing ones to use file values)
  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key];
  });
  
  console.log(`✅ Loaded env file from: ${envPath}`);
}

async function runVouchersMigration() {
  loadEnvFile(); // Load environment variables

  // Try to load from db_config.env if available (might have different format)
  const dbConfigEnvPath = path.join(__dirname, '../../db_config.env');
  if (fs.existsSync(dbConfigEnvPath)) {
    const envContent = fs.readFileSync(dbConfigEnvPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'), // Default PostgreSQL port
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('❌ Database configuration tidak lengkap!');
    console.error('   Required: DB_NAME, DB_USER, DB_PASSWORD in .env.local or environment variables.');
    process.exit(1);
  }

  console.log('🔄 Running vouchers schema migration...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Step 1: Create vouchers table
    console.log('📝 Step 1: Creating vouchers table...');
    const vouchersSchemaPath = path.join(__dirname, 'vouchers-schema.sql');
    const vouchersSchemaSql = fs.readFileSync(vouchersSchemaPath, 'utf-8');
    
    await pool.query(vouchersSchemaSql);
    console.log('✅ vouchers and voucher_usage tables created successfully!');

    // Step 2: Update transactions table (add voucher columns)
    console.log('');
    console.log('📝 Step 2: Adding voucher columns to transactions table...');
    const transactionsUpdatePath = path.join(__dirname, 'add-voucher-columns-to-transactions.sql');
    const transactionsUpdateSql = fs.readFileSync(transactionsUpdatePath, 'utf-8');
    
    await pool.query(transactionsUpdateSql);
    console.log('✅ voucher_code and discount_amount columns added to transactions table!');

    // Optional: Describe table structure for verification
    console.log('');
    console.log('📊 Vouchers table structure:');
    const vouchersTableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vouchers'
      ORDER BY ordinal_position;
    `);
    vouchersTableInfo.rows.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${col.column_default ? `, DEFAULT ${col.column_default}` : ''})`);
    });

    console.log('');
    console.log('📊 Transactions table new columns:');
    const transactionsNewCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name IN ('voucher_code', 'discount_amount')
      ORDER BY ordinal_position;
    `);
    transactionsNewCols.rows.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${col.column_default ? `, DEFAULT ${col.column_default}` : ''})`);
    });

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Test voucher validation API');
    console.log('   2. Test voucher creation in admin portal');
    console.log('   3. Update transaction creation to support vouchers');
    console.log('   4. Create UI for voucher management (admin)');
    console.log('   5. Create UI for voucher input (checkout page)');

  } catch (error) {
    if (error.code === '42P07') { // duplicate_table
      console.warn('⚠️  Table already exists. Skipping creation.');
    } else if (error.code === '42701') { // duplicate_column
      console.warn('⚠️  Column already exists. Skipping column addition.');
    } else {
      console.error('❌ Migration error:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runVouchersMigration();

