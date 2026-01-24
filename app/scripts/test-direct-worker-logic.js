const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function getTelegramChatId(userId) {
    const res = await pool.query(
        `SELECT chatid_tele FROM data_user WHERE user_id = $1`,
        [userId]
    );
    return res.rows.length > 0 ? res.rows[0].chatid_tele : null;
}

async function test() {
    // Rule: ON Ads - Test Notif tele
    const rule_user_id = '3649c16c-012a-4eb1-902d-e309469ab0b0';
    const chatId = await getTelegramChatId(rule_user_id);

    console.log(`User ID: ${rule_user_id}`);
    console.log(`Chat ID Found: ${chatId}`);

    if (chatId) {
        console.log("✅ Database OK, Chat ID ditemukan.");

        // Coba kirim pesan aseli via fetch (bypass config modul kita yang ribet)
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: "Tes Koneksi dari Worker Diagnostic Script"
            })
        });

        const data = await response.json();
        console.log("Telegram Response:", data);
    } else {
        console.log("❌ Gagal: Chat ID tidak ditemukan untuk user tersebut.");
    }

    await pool.end();
}

test();
