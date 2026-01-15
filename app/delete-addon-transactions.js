const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function run() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected successfully.');

        // Start transaction
        await client.query('BEGIN');

        try {
            // 1. Show addon transactions before deletion
            console.log('\n=== Addon Transactions (before deletion) ===');
            const beforeResult = await client.query(`
        SELECT transaction_id, user_id, plan_id, payment_status, total_amount, created_at
        FROM transactions
        WHERE plan_id LIKE 'addon-%'
        ORDER BY created_at DESC
      `);

            console.log(`Found ${beforeResult.rows.length} addon transaction(s):`);
            beforeResult.rows.forEach(row => {
                console.log(`  - ${row.transaction_id} | ${row.plan_id} | ${row.payment_status} | Rp${row.total_amount} | ${row.created_at}`);
            });

            // 2. Delete related voucher_usage records first (foreign key constraint)
            console.log('\n=== Deleting related voucher_usage records ===');
            const voucherUsageResult = await client.query(`
        DELETE FROM voucher_usage
        WHERE transaction_id IN (
          SELECT transaction_id 
          FROM transactions 
          WHERE plan_id LIKE 'addon-%'
        )
        RETURNING voucher_code, transaction_id, discount_amount
      `);

            console.log(`Deleted ${voucherUsageResult.rows.length} voucher_usage record(s):`);
            voucherUsageResult.rows.forEach(row => {
                console.log(`  - ${row.voucher_code} | ${row.transaction_id} | -Rp${row.discount_amount}`);
            });

            // 3. Delete addon transactions
            console.log('\n=== Deleting addon transactions ===');
            const deleteResult = await client.query(`
        DELETE FROM transactions
        WHERE plan_id LIKE 'addon-%'
        RETURNING transaction_id, plan_id, payment_status, total_amount
      `);

            console.log(`Deleted ${deleteResult.rows.length} addon transaction(s):`);
            deleteResult.rows.forEach(row => {
                console.log(`  - ${row.transaction_id} | ${row.plan_id} | ${row.payment_status} | Rp${row.total_amount}`);
            });

            // 4. Show remaining transactions
            console.log('\n=== Remaining Transactions ===');
            const remainingResult = await client.query(`
        SELECT 
          plan_id,
          COUNT(*) as count,
          SUM(total_amount) as total_revenue
        FROM transactions
        GROUP BY plan_id
        ORDER BY count DESC
      `);

            console.log('Transaction summary by plan:');
            remainingResult.rows.forEach(row => {
                console.log(`  ${row.plan_id}: ${row.count} transaction(s), Rp${row.total_revenue}`);
            });

            // Commit transaction
            await client.query('COMMIT');
            console.log('\n✅ All addon transactions deleted successfully!');

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }

        client.release();
    } catch (e) {
        console.error('\n❌ Error:', e);
    } finally {
        await pool.end();
    }
}

run();
