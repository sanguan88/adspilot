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

async function verifySubscriptions() {
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
    console.log('📊 Verifying subscriptions data...\n');

    // 1. Count subscriptions
    const subsCount = await pool.query('SELECT COUNT(*) as total FROM subscriptions');
    console.log(`✅ Total subscriptions: ${subsCount.rows[0].total}`);

    // 2. Count by status
    const statusCount = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM subscriptions 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('\n📋 Subscriptions by status:');
    statusCount.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });

    // 3. Count by plan
    const planCount = await pool.query(`
      SELECT plan_id, COUNT(*) as count 
      FROM subscriptions 
      GROUP BY plan_id 
      ORDER BY count DESC
    `);
    console.log('\n📋 Subscriptions by plan:');
    planCount.rows.forEach(row => {
      console.log(`   ${row.plan_id}: ${row.count}`);
    });

    // 4. Show sample subscriptions with user details
    const sampleSubs = await pool.query(`
      SELECT 
        s.id, s.user_id, s.plan_id, s.status,
        s.start_date, s.end_date, s.total_amount,
        s.transaction_id,
        u.username, u.email, u.status_user
      FROM subscriptions s
      LEFT JOIN data_user u ON s.user_id = u.user_id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    console.log('\n📋 Sample subscriptions (latest 5):');
    sampleSubs.rows.forEach((sub, idx) => {
      console.log(`\n   ${idx + 1}. ${sub.username || sub.user_id}`);
      console.log(`      Plan: ${sub.plan_id}`);
      console.log(`      Status: ${sub.status}`);
      console.log(`      Period: ${sub.start_date} to ${sub.end_date}`);
      console.log(`      Amount: Rp ${parseFloat(sub.total_amount).toLocaleString('id-ID')}`);
      console.log(`      Transaction: ${sub.transaction_id}`);
      console.log(`      User Status: ${sub.status_user}`);
    });

    // 5. Check for users with paid transactions but no subscription
    const usersWithPaidTx = await pool.query(`
      SELECT DISTINCT t.user_id, u.username
      FROM transactions t
      LEFT JOIN data_user u ON t.user_id = u.user_id
      WHERE t.payment_status = 'paid'
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s 
          WHERE s.user_id = t.user_id 
          AND s.transaction_id = t.transaction_id
        )
    `);

    if (usersWithPaidTx.rows.length > 0) {
      console.log('\n⚠️  Users with paid transactions but no matching subscription:');
      usersWithPaidTx.rows.forEach(row => {
        console.log(`   - ${row.username || row.user_id}`);
      });
      console.log('\n   💡 Consider running migration again or manually create subscriptions for these users.');
    } else {
      console.log('\n✅ All paid transactions have matching subscriptions!');
    }

    // 6. Check for active users without subscription
    const activeUsersNoSub = await pool.query(`
      SELECT u.user_id, u.username
      FROM data_user u
      WHERE u.status_user = 'aktif'
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s 
          WHERE s.user_id = u.user_id 
          AND s.status = 'active'
        )
    `);

    if (activeUsersNoSub.rows.length > 0) {
      console.log('\n⚠️  Active users without active subscription:');
      activeUsersNoSub.rows.forEach(row => {
        console.log(`   - ${row.username || row.user_id}`);
      });
    } else {
      console.log('\n✅ All active users have active subscriptions!');
    }

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySubscriptions();

