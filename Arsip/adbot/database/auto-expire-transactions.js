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
 * Auto-expire transactions
 * 
 * Rules:
 * 1. Transaction dengan status 'pending' atau 'waiting_verification'
 * 2. expires_at < NOW() (sudah melewati tanggal kadaluarsa)
 * 3. Update payment_status menjadi 'expired'
 */
async function autoExpireTransactions() {
  const envVars = loadEnvFile();

  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  console.log('🕐 Auto-expire transactions...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Find transactions that should be expired
    const expiredResult = await pool.query(
      `SELECT 
        id, transaction_id, user_id, plan_id, 
        payment_status, expires_at, created_at
      FROM transactions
      WHERE payment_status IN ('pending', 'waiting_verification')
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
      ORDER BY expires_at ASC`
    );

    const expiredTransactions = expiredResult.rows;

    if (expiredTransactions.length === 0) {
      console.log('✅ Tidak ada transaksi yang perlu di-expire');
      return;
    }

    console.log(`📋 Ditemukan ${expiredTransactions.length} transaksi yang perlu di-expire:\n`);

    let expiredCount = 0;
    let errors = [];

    for (const transaction of expiredTransactions) {
      try {
        // Update status to expired
        await pool.query(
          `UPDATE transactions 
           SET payment_status = 'expired',
               updated_at = NOW()
           WHERE id = $1 AND payment_status IN ('pending', 'waiting_verification')`,
          [transaction.id]
        );

        console.log(`✅ Expired transaction ${transaction.transaction_id} (User: ${transaction.user_id})`);
        console.log(`   Status: ${transaction.payment_status} → expired`);
        console.log(`   Expires at: ${transaction.expires_at}`);
        console.log(`   Created at: ${transaction.created_at}\n`);

        expiredCount++;
      } catch (error) {
        console.error(`❌ Error expiring transaction ${transaction.transaction_id}:`, error.message);
        errors.push({ transactionId: transaction.transaction_id, error: error.message });
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Expired: ${expiredCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(err => {
        console.log(`   Transaction ${err.transactionId}: ${err.error}`);
      });
    }

    if (expiredCount > 0) {
      console.log('\n✅ Auto-expire completed!');
      console.log('\n📋 Next steps:');
      console.log('   1. Check transactions table for expired transactions');
      console.log('   2. Users with expired transactions cannot proceed to payment');
      console.log('   3. Users need to create new transaction');
    }

  } catch (error) {
    console.error('❌ Auto-expire error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  autoExpireTransactions()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { autoExpireTransactions };

