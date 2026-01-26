const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function auditToko() {
    const client = await pool.connect();
    try {
        console.log('--- 1. Mencari Toko ---');
        const tokoRes = await client.query("SELECT id_toko, nama_toko, status_cookies, status_toko, user_id FROM data_toko WHERE nama_toko ILIKE '%CITA CITA ANAK%' OR id_toko ILIKE '%CITA CITA ANAK%'");
        console.log(JSON.stringify(tokoRes.rows, null, 2));

        if (tokoRes.rows.length > 0) {
            const idToko = tokoRes.rows[0].id_toko;
            console.log(`\n--- 2. Mengecek data_produk untuk id_toko: ${idToko} ---`);
            const produkRes = await client.query("SELECT COUNT(*) as count, MIN(report_date) as earliest, MAX(report_date) as latest FROM data_produk WHERE id_toko = $1", [idToko]);
            console.log(JSON.stringify(produkRes.rows, null, 2));

            console.log(`\n--- 3. Mengecek data 5 baris terakhir di data_produk ---`);
            const latestRes = await client.query("SELECT report_date, report_cost, report_click, report_impression FROM data_produk WHERE id_toko = $1 ORDER BY report_date DESC LIMIT 5", [idToko]);
            console.log(JSON.stringify(latestRes.rows, null, 2));
        }
    } catch (err) {
        console.error('Audit Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

auditToko();
