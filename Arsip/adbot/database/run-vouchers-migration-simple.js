/**
 * Simple Vouchers Migration Script
 * 
 * Script untuk create vouchers table dan update transactions table
 * Menggunakan koneksi database yang sama dengan aplikasi
 */

const fs = require('fs');
const path = require('path');

// Import database connection function (using dynamic require)
async function runMigration() {
  try {
    // Change to adbot directory to load modules correctly
    process.chdir(path.join(__dirname, '../'));
    
    // Load environment variables (Next.js style)
    const envLocalPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=').trim();
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (key && cleanValue) {
            process.env[key.trim()] = cleanValue;
          }
        }
      });
      console.log('✅ Loaded .env.local');
    }

    // Use dynamic import for ES modules (db.ts uses ES modules)
    const { getDatabaseConnection } = await import('../lib/db.js');
    
    console.log('🔄 Starting vouchers migration...');
    
    const connection = await getDatabaseConnection();
    
    try {
      // Step 1: Create vouchers schema
      console.log('📝 Step 1: Creating vouchers and voucher_usage tables...');
      const vouchersSchemaPath = path.join(__dirname, 'vouchers-schema.sql');
      const vouchersSchemaSql = fs.readFileSync(vouchersSchemaPath, 'utf-8');
      
      await connection.query(vouchersSchemaSql);
      console.log('✅ vouchers and voucher_usage tables created successfully!');

      // Step 2: Update transactions table
      console.log('');
      console.log('📝 Step 2: Adding voucher columns to transactions table...');
      const transactionsUpdatePath = path.join(__dirname, 'add-voucher-columns-to-transactions.sql');
      const transactionsUpdateSql = fs.readFileSync(transactionsUpdatePath, 'utf-8');
      
      await connection.query(transactionsUpdateSql);
      console.log('✅ voucher columns added to transactions table!');

      console.log('');
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      if (error.code === '42P07') { // duplicate_table
        console.warn('⚠️  Table already exists. Skipping creation.');
      } else if (error.code === '42701') { // duplicate_column
        console.warn('⚠️  Column already exists. Skipping column addition.');
      } else {
        throw error;
      }
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    process.exit(1);
  }
}

runMigration();

