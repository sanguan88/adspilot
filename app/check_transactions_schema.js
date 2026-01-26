const { Client } = require('pg');

async function checkTransactionsSchema() {
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

        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'");
        console.log('Columns in transactions table:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

checkTransactionsSchema();
