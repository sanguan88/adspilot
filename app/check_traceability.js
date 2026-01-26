const { Client } = require('pg');

async function checkTraceability() {
    const client = new Client({
        host: '154.19.37.198',
        port: 3306,
        user: 'soroboti_db',
        password: '123qweASD!@#!@#',
        database: 'soroboti_ads',
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const userRes = await client.query("SELECT COUNT(*) FROM data_user WHERE referred_by_affiliate IS NOT NULL");
        console.log('Users with affiliate source:', userRes.rows[0].count);

        const trxRes = await client.query("SELECT COUNT(*) FROM transactions WHERE voucher_affiliate_id IS NOT NULL AND payment_status = 'paid'");
        console.log('Paid transactions with affiliate link:', trxRes.rows[0].count);

        // Get some examples
        const examples = await client.query("SELECT username, email, referred_by_affiliate FROM data_user WHERE referred_by_affiliate IS NOT NULL LIMIT 5");
        console.log('Examples of traced users:', examples.rows);

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

checkTraceability();
