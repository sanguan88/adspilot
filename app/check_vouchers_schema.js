const { Client } = require('pg');

async function checkSchema() {
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

        const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'affiliate_vouchers'`);
        console.log(`Columns in affiliate_vouchers:`, res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
