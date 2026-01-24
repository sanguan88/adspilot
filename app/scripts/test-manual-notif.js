const { sendRuleNotification } = require('../tele/service');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testManualNotif() {
    const chatId = '1833411503';
    console.log(`Testing manual notification to Chat ID: ${chatId}`);

    try {
        const result = await sendRuleNotification(chatId, {
            ruleName: "Manual Test Rule",
            ruleId: "manual-test-id",
            triggeredAt: new Date(),
            conditions: ["ROAS > 5", "Clicks > 100"],
            actions: ["Increase Budget 10%"],
            message: "Ini adalah pesan tes manual dari script."
        });

        if (result.ok) {
            console.log("✅ Berhasil kirim notif!");
        } else {
            console.error("❌ Gagal kirim:", result.description);
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testManualNotif();
