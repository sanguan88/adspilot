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
 * Cleanup invalid subscriptions
 * 
 * Rules:
 * 1. Subscription dengan transaction_id yang tidak ada di transactions table → DELETE
 * 2. Subscription dengan transaction_id yang status != 'paid' → EXPIRE
 * 3. Subscription yang dibuat migration (transaction_id starts with 'MIG-') dan tidak ada transaction paid → EXPIRE
 */
async function cleanupInvalidSubscriptions() {
  const envVars = loadEnvFile();

  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('❌ Database configuration tidak lengkap!');
    process.exit(1);
  }

  console.log('🧹 Cleaning up invalid subscriptions...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Get all active subscriptions
    const allSubsResult = await pool.query(`
      SELECT 
        s.id, s.user_id, s.transaction_id, s.status, s.plan_id,
        u.username, u.email
      FROM subscriptions s
      LEFT JOIN data_user u ON s.user_id = u.user_id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    `);

    console.log(`📊 Found ${allSubsResult.rows.length} active subscriptions\n`);

    if (allSubsResult.rows.length === 0) {
      console.log('✅ No active subscriptions to check.');
      await pool.end();
      return;
    }

    let deletedCount = 0;
    let expiredCount = 0;
    let validCount = 0;
    const errors = [];

    for (const sub of allSubsResult.rows) {
      try {
        // Check if transaction exists
        const txResult = await pool.query(
          `SELECT transaction_id, payment_status 
           FROM transactions 
           WHERE transaction_id = $1`,
          [sub.transaction_id]
        );

        if (txResult.rows.length === 0) {
          // Transaction tidak ada → DELETE subscription
          console.log(`🗑️  Deleting subscription ${sub.id} (${sub.username}):`);
          console.log(`    Transaction ${sub.transaction_id} not found in transactions table`);

          await pool.query(
            `DELETE FROM subscriptions WHERE id = $1`,
            [sub.id]
          );

          deletedCount++;
          continue;
        }

        const transaction = txResult.rows[0];

        // Check if transaction is paid
        if (transaction.payment_status !== 'paid') {
          // Transaction tidak paid → EXPIRE subscription
          console.log(`⏸️  Expiring subscription ${sub.id} (${sub.username}):`);
          console.log(`    Transaction ${sub.transaction_id} status is "${transaction.payment_status}", not "paid"`);

          await pool.query(
            `UPDATE subscriptions 
             SET status = 'expired',
                 updated_at = NOW()
             WHERE id = $1`,
            [sub.id]
          );

          expiredCount++;
          continue;
        }

        // Subscription is valid
        console.log(`✅ Valid subscription ${sub.id} (${sub.username}):`);
        console.log(`    Transaction ${sub.transaction_id} is paid`);
        validCount++;

      } catch (error) {
        console.error(`❌ Error processing subscription ${sub.id}:`, error.message);
        errors.push({ subscriptionId: sub.id, error: error.message });
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   ✅ Valid subscriptions: ${validCount}`);
    console.log(`   🗑️  Deleted: ${deletedCount}`);
    console.log(`   ⏸️  Expired: ${expiredCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(err => {
        console.log(`   Subscription ${err.subscriptionId}: ${err.error}`);
      });
    }

    if (deletedCount > 0 || expiredCount > 0) {
      console.log('\n✅ Cleanup completed!');
      console.log('\n📋 Next steps:');
      console.log('   1. Check subscription page in admin panel');
      console.log('   2. Verify only valid subscriptions are shown');
      console.log('   3. Users with expired subscriptions should not have access');
    } else {
      console.log('\n✅ All subscriptions are valid!');
    }

  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupInvalidSubscriptions();

