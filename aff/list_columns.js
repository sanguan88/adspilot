const { Client } = require('pg');

const client = new Client({
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    host: '154.19.37.198',
    port: 3306,
    database: 'soroboti_ads',
});

async function listColumns() {
    try {
        await client.connect();
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'data_user'
    `);
        console.log('Columns in data_user:');
        res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

listColumns();
