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

/**
 * Update transactions dengan payment_proof_url menjadi waiting_verification
 */
async function updatePendingWithProof() {
  const envVars = loadEnvFile();

  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  console.log('🔄 Updating transactions with proof to waiting_verification...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Get transactions with proof but status is still pending
    const result = await pool.query(
      `SELECT transaction_id, payment_status, payment_proof_url
       FROM transactions
       WHERE payment_proof_url IS NOT NULL
         AND payment_proof_url != ''
         AND payment_status = 'pending'`
    );

    console.log(`📊 Found ${result.rows.length} transactions with proof but status still pending\n`);

    if (result.rows.length === 0) {
      console.log('✅ No transactions to update.');
      await pool.end();
      return;
    }

    let updatedCount = 0;

    for (const tx of result.rows) {
      await pool.query(
        `UPDATE transactions 
         SET payment_status = 'waiting_verification',
             updated_at = NOW()
         WHERE transaction_id = $1`,
        [tx.transaction_id]
      );

      console.log(`✅ Updated transaction ${tx.transaction_id}: pending → waiting_verification`);
      updatedCount++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log('\n✅ Update completed!');
  } catch (error) {
    console.error('❌ Update error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updatePendingWithProof();

