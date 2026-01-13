const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env.local tidak ditemukan!');
    console.error('   Path:', envPath);
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
 * Migrate mock subscriptions to real subscriptions table
 * 
 * Logic:
 * 1. Get all users with status_user = 'aktif'
 * 2. For each user:
 *    - Check if they have a paid transaction
 *    - If yes: create subscription from that transaction
 *    - If no: create subscription with default plan (3-month) based on user created_at
 */
async function migrateMockSubscriptions() {
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
    console.error('   Required: DB_NAME, DB_USER, DB_PASSWORD');
    process.exit(1);
  }

  console.log('📦 Migrating mock subscriptions to real subscriptions...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // 1. Get all active users
    const activeUsersResult = await pool.query(
      `SELECT 
        user_id, username, email, nama_lengkap, 
        status_user, created_at
      FROM data_user
      WHERE status_user = 'aktif'
      ORDER BY created_at ASC`
    );

    const activeUsers = activeUsersResult.rows;
    console.log(`📊 Found ${activeUsers.length} active users\n`);

    if (activeUsers.length === 0) {
      console.log('⚠️  No active users found. Nothing to migrate.');
      await pool.end();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Process each user
    for (const user of activeUsers) {
      try {
        // Check if user already has a subscription
        const existingSubResult = await pool.query(
          `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
          [user.user_id]
        );

        if (existingSubResult.rows.length > 0) {
          console.log(`⏭️  User ${user.username} already has active subscription. Skipped.`);
          skippedCount++;
          continue;
        }

        // Check if user has any transactions
        const allTransactionsResult = await pool.query(
          `SELECT 
            transaction_id, plan_id, payment_status,
            base_amount, ppn_amount, total_amount,
            payment_confirmed_at
          FROM transactions
          WHERE user_id = $1
          ORDER BY created_at DESC`,
          [user.user_id]
        );

        // Check if user has pending transaction
        const hasPendingTransaction = allTransactionsResult.rows.some(
          tx => tx.payment_status === 'pending'
        );

        if (hasPendingTransaction) {
          // Skip: User punya transaction pending
          console.log(`⏭️  User ${user.username}: Has pending transaction. Skipping subscription creation.`);
          console.log(`    Subscription will be created automatically when transaction is confirmed as paid.`);
          skippedCount++;
          continue;
        }

        // Check if user has a paid transaction
        const paidTransaction = allTransactionsResult.rows.find(
          tx => tx.payment_status === 'paid'
        );

        let subscriptionData;

        if (paidTransaction) {
          // Use transaction data
          console.log(`📝 User ${user.username}: Found paid transaction ${paidTransaction.transaction_id}`);

          // Calculate subscription period
          const planDuration = {
            '1-month': 1,
            '3-month': 3,
            '6-month': 6,
          };
          const months = planDuration[paidTransaction.plan_id] || 3;

          const startDate = paidTransaction.payment_confirmed_at 
            ? new Date(paidTransaction.payment_confirmed_at)
            : new Date(user.created_at);
          
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + months);

          const billingCycleMap = {
            '1-month': 'monthly',
            '3-month': 'quarterly',
            '6-month': 'semi-annual',
          };

          subscriptionData = {
            user_id: user.user_id,
            plan_id: paidTransaction.plan_id,
            transaction_id: paidTransaction.transaction_id,
            status: 'active',
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            billing_cycle: billingCycleMap[paidTransaction.plan_id] || 'quarterly',
            base_amount: parseFloat(paidTransaction.base_amount),
            ppn_amount: parseFloat(paidTransaction.ppn_amount),
            total_amount: parseFloat(paidTransaction.total_amount),
            auto_renew: false,
          };
        } else {
          // No transactions at all → Create default subscription for trial/mock users
          console.log(`📝 User ${user.username}: No transactions. Creating default 3-month subscription for trial user.`);

          const startDate = new Date(user.created_at);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 3);

          // Default pricing for 3-month plan (from payment-calculator.ts)
          const baseAmount = 749000;
          const ppnAmount = Math.round(baseAmount * 0.11);
          const totalAmount = baseAmount + ppnAmount;

          // Generate a dummy transaction_id for reference (max 50 chars)
          // Format: TRIAL-{user_id_short}-{timestamp_short}
          const userIdShort = user.user_id.substring(0, 10);
          const timestampShort = Date.now().toString().slice(-8);
          const dummyTransactionId = `TRIAL-${userIdShort}-${timestampShort}`.substring(0, 50);

          subscriptionData = {
            user_id: user.user_id,
            plan_id: '3-month',
            transaction_id: dummyTransactionId,
            status: 'active',
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            billing_cycle: 'quarterly',
            base_amount: baseAmount,
            ppn_amount: ppnAmount,
            total_amount: totalAmount,
            auto_renew: false,
          };
        }

        // Expire any existing active subscription (shouldn't happen, but just in case)
        await pool.query(
          `UPDATE subscriptions 
           SET status = 'expired', updated_at = NOW()
           WHERE user_id = $1 AND status = 'active'`,
          [user.user_id]
        );

        // Insert new subscription
        await pool.query(
          `INSERT INTO subscriptions (
            user_id, plan_id, transaction_id,
            status, start_date, end_date, billing_cycle,
            base_amount, ppn_amount, total_amount,
            auto_renew, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            subscriptionData.user_id,
            subscriptionData.plan_id,
            subscriptionData.transaction_id,
            subscriptionData.status,
            subscriptionData.start_date,
            subscriptionData.end_date,
            subscriptionData.billing_cycle,
            subscriptionData.base_amount,
            subscriptionData.ppn_amount,
            subscriptionData.total_amount,
            subscriptionData.auto_renew,
          ]
        );

        console.log(`✅ Created subscription for ${user.username}:`);
        console.log(`   Plan: ${subscriptionData.plan_id}`);
        console.log(`   Period: ${subscriptionData.start_date} to ${subscriptionData.end_date}`);
        console.log(`   Amount: Rp ${subscriptionData.total_amount.toLocaleString('id-ID')}`);
        console.log('');
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error processing user ${user.username}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (migratedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Check subscriptions table to verify data');
      console.log('   2. Test subscription page in admin panel');
      console.log('   3. Verify user access based on subscription status');
    }
  } catch (error) {
    console.error('❌ Migration error:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateMockSubscriptions();

