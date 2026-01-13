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

async function checkUserSubscription() {
  const envVars = loadEnvFile();

  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  const pool = new Pool(dbConfig);

  try {
    const username = 'ajaytest2';

    console.log(`🔍 Checking user: ${username}\n`);

    // 1. Get user info
    const userResult = await pool.query(
      `SELECT user_id, username, email, status_user, created_at
       FROM data_user
       WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User tidak ditemukan!');
      await pool.end();
      return;
    }

    const user = userResult.rows[0];
    console.log('📋 User Info:');
    console.log(`   User ID: ${user.user_id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Status: ${user.status_user}`);
    console.log(`   Created: ${user.created_at}\n`);

    // 2. Get all transactions
    const transactionsResult = await pool.query(
      `SELECT 
        transaction_id, plan_id, payment_status,
        base_amount, ppn_amount, total_amount,
        payment_confirmed_at, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.user_id]
    );

    console.log(`📋 Transactions (${transactionsResult.rows.length}):`);
    transactionsResult.rows.forEach((tx, idx) => {
      console.log(`\n   ${idx + 1}. Transaction: ${tx.transaction_id}`);
      console.log(`      Plan: ${tx.plan_id}`);
      console.log(`      Status: ${tx.payment_status}`);
      console.log(`      Amount: Rp ${parseFloat(tx.total_amount).toLocaleString('id-ID')}`);
      console.log(`      Created: ${tx.created_at}`);
      if (tx.payment_confirmed_at) {
        console.log(`      Confirmed: ${tx.payment_confirmed_at}`);
      }
    });

    // 3. Get subscriptions
    const subscriptionsResult = await pool.query(
      `SELECT 
        id, plan_id, transaction_id, status,
        start_date, end_date, total_amount,
        created_at
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.user_id]
    );

    console.log(`\n📋 Subscriptions (${subscriptionsResult.rows.length}):`);
    subscriptionsResult.rows.forEach((sub, idx) => {
      console.log(`\n   ${idx + 1}. Subscription ID: ${sub.id}`);
      console.log(`      Plan: ${sub.plan_id}`);
      console.log(`      Status: ${sub.status}`);
      console.log(`      Transaction: ${sub.transaction_id}`);
      console.log(`      Period: ${sub.start_date} to ${sub.end_date}`);
      console.log(`      Amount: Rp ${parseFloat(sub.total_amount).toLocaleString('id-ID')}`);
      console.log(`      Created: ${sub.created_at}`);

      // Check if transaction exists and is paid
      const matchingTx = transactionsResult.rows.find(
        tx => tx.transaction_id === sub.transaction_id
      );

      if (!matchingTx) {
        console.log(`      ⚠️  Transaction ${sub.transaction_id} NOT FOUND in transactions table!`);
      } else if (matchingTx.payment_status !== 'paid') {
        console.log(`      ⚠️  Transaction ${sub.transaction_id} status is "${matchingTx.payment_status}", not "paid"!`);
      } else {
        console.log(`      ✅ Transaction ${sub.transaction_id} is paid - VALID`);
      }
    });

    // 4. Analysis
    console.log('\n📊 Analysis:');
    const paidTransactions = transactionsResult.rows.filter(tx => tx.payment_status === 'paid');
    const activeSubscriptions = subscriptionsResult.rows.filter(sub => sub.status === 'active');
    const validSubscriptions = subscriptionsResult.rows.filter(sub => {
      const tx = transactionsResult.rows.find(t => t.transaction_id === sub.transaction_id);
      return tx && tx.payment_status === 'paid';
    });

    console.log(`   Paid Transactions: ${paidTransactions.length}`);
    console.log(`   Active Subscriptions: ${activeSubscriptions.length}`);
    console.log(`   Valid Subscriptions (from paid transactions): ${validSubscriptions.length}`);

    if (activeSubscriptions.length > 0 && paidTransactions.length === 0) {
      console.log('\n   ⚠️  ISSUE DETECTED:');
      console.log('      User has active subscription but NO paid transactions!');
      console.log('      This subscription was likely created by migration script.');
      console.log('      Recommendation: Expire or delete this subscription.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkUserSubscription();

