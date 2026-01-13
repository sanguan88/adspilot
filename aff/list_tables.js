const { Client } = require('pg');

const client = new Client({
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    host: '154.19.37.198',
    port: 3306,
    database: 'soroboti_ads',
});

async function listTables() {
    try {
        await client.connect();
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables in public schema:');
        res.rows.forEach(row => console.log('- ' + row.table_name));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

listTables();
