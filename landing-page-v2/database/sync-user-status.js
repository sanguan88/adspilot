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
 * Sync user status berdasarkan subscription dan transaction
 * 
 * Logic:
 * 1. User dengan subscription active → status_user = 'aktif'
 * 2. User dengan transaction pending (tidak ada subscription active) → status_user = 'pending_payment'
 * 3. User tanpa subscription active dan tanpa transaction pending → status_user = 'inactive'
 */
async function syncUserStatus() {
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

  console.log('🔄 Syncing user status...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Get all users
    const usersResult = await pool.query(
      `SELECT user_id, username, email, status_user
       FROM data_user
       ORDER BY created_at ASC`
    );

    const users = usersResult.rows;
    console.log(`📊 Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found.');
      await pool.end();
      return;
    }

    let updatedCount = 0;
    let unchangedCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        // Check if user has active subscription
        const activeSubResult = await pool.query(
          `SELECT id FROM subscriptions 
           WHERE user_id = $1 AND status = 'active'`,
          [user.user_id]
        );

        const hasActiveSubscription = activeSubResult.rows.length > 0;

        // Check if user has pending transaction
        const pendingTxResult = await pool.query(
          `SELECT id FROM transactions 
           WHERE user_id = $1 AND payment_status = 'pending'`,
          [user.user_id]
        );

        const hasPendingTransaction = pendingTxResult.rows.length > 0;

        // Determine correct status
        let correctStatus;
        if (hasActiveSubscription) {
          correctStatus = 'aktif';
        } else if (hasPendingTransaction) {
          correctStatus = 'pending_payment';
        } else {
          correctStatus = 'inactive';
        }

        // Update if different
        if (user.status_user !== correctStatus) {
          await pool.query(
            `UPDATE data_user 
             SET status_user = $1, update_at = NOW()
             WHERE user_id = $2`,
            [correctStatus, user.user_id]
          );

          console.log(`✅ Updated ${user.username}:`);
          console.log(`   ${user.status_user} → ${correctStatus}`);
          if (hasActiveSubscription) {
            console.log(`   Reason: Has active subscription`);
          } else if (hasPendingTransaction) {
            console.log(`   Reason: Has pending transaction`);
          } else {
            console.log(`   Reason: No active subscription or pending transaction`);
          }
          console.log('');
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.username}:`, error.message);
        errors.push({ userId: user.user_id, username: user.username, error: error.message });
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Unchanged: ${unchangedCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(err => {
        console.log(`   ${err.username}: ${err.error}`);
      });
    }

    if (updatedCount > 0) {
      console.log('\n✅ User status sync completed!');
      console.log('\n📋 Next steps:');
      console.log('   1. Verify user status in database');
      console.log('   2. Test login flow for users with pending_payment status');
      console.log('   3. Test access control in ProtectedRoute');
    } else {
      console.log('\n✅ All user statuses are already correct!');
    }

  } catch (error) {
    console.error('❌ Sync error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

syncUserStatus();

