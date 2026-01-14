const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env.local tidak ditemukan!');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value.trim();
      }
    }
  });

  return envVars;
}

async function updateSchema() {
  const envVars = loadEnvFile();

  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  console.log('📦 Updating transactions schema...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Drop existing constraint if exists
    await pool.query(`
      ALTER TABLE transactions 
      DROP CONSTRAINT IF EXISTS transactions_payment_status_check;
    `);

    // Add new constraint with 'rejected' status
    await pool.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_payment_status_check 
      CHECK (payment_status IN ('pending', 'paid', 'rejected', 'expired', 'cancelled'));
    `);

    console.log('✅ Schema berhasil diupdate!');
    console.log('   Status yang didukung: pending, paid, rejected, expired, cancelled');
  } catch (error) {
    console.error('❌ Error updating schema:');
    console.error(`   ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateSchema();

