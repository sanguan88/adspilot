const { Client } = require('pg');

async function checkFinal() {
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

        // 1. List all vouchers to see if any are named/described for Om Fey
        const vouchers = await client.query(
            "SELECT code, name, description, created_by FROM vouchers WHERE name ILIKE '%fery%' OR description ILIKE '%fery%' OR code ILIKE '%fery%'"
        );
        console.log('\n--- Vouchers matching Fery ---');
        console.log(JSON.stringify(vouchers.rows, null, 2));

        // 2. Check if there are any users with referral_date set but referred_by_affiliate is NULL
        const orphanedReferrals = await client.query(
            "SELECT user_id, email, username, referral_date, referred_by_affiliate FROM data_user WHERE referral_date IS NOT NULL AND referred_by_affiliate IS NULL"
        );
        console.log('\n--- Orphaned Referrals (Date set, but no code) ---');
        console.log(JSON.stringify(orphanedReferrals.rows, null, 2));

        // 3. Search for the email as a REFERRAL (maybe they were referred?)
        const referredCheck = await client.query(
            "SELECT * FROM data_user WHERE email = 'ferymarendra@gmail.com'"
        );
        console.log('\n--- User Record for ferymarendra@gmail.com ---');
        console.log(JSON.stringify(referredCheck.rows, null, 2));

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

checkFinal();
