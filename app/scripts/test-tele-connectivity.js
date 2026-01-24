const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = '1833411503';

async function testTelegram() {
    console.log(`Bot Token: ${botToken ? 'Loaded' : 'NOT FOUND'}`);
    console.log(`Sending test message to ${chatId}...`);

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: '🧪 *Test Connectivity Script*\nIf you see this, the bot token and networking are working.',
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

testTelegram();
