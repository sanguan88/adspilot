const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
            }
        });
    }
} catch (err) {
    console.error('Error loading .env.local:', err);
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting analytics tables migration...');

        // 1. Subscription Plans Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id SERIAL PRIMARY KEY,
                plan_id VARCHAR(50) UNIQUE NOT NULL,
                plan_name VARCHAR(100) NOT NULL,
                price DECIMAL(15, 2) NOT NULL,
                billing_cycle VARCHAR(20) DEFAULT 'monthly',
                features TEXT[],
                color VARCHAR(20),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Created subscription_plans table');

        // 2. Subscriptions Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                plan_id INTEGER REFERENCES subscription_plans(id),
                status VARCHAR(20) DEFAULT 'active',
                start_date TIMESTAMP DEFAULT NOW(),
                end_date TIMESTAMP,
                auto_renew BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Created subscriptions table');

        // 3. Transactions Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                subscription_id INTEGER REFERENCES subscriptions(id),
                amount DECIMAL(15, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'IDR',
                status VARCHAR(20) DEFAULT 'success',
                payment_method VARCHAR(50),
                payment_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Created transactions table');

        // 4. Seed Data (Optional - ONLY if tables are empty)
        const planCheck = await client.query('SELECT COUNT(*) FROM subscription_plans');
        if (parseInt(planCheck.rows[0].count) === 0) {
            console.log('🌱 Seeding initial plans...');
            await client.query(`
                INSERT INTO subscription_plans (plan_id, plan_name, price, billing_cycle, color, features) VALUES
                ('basic_monthly', 'Basic Monthly', 149000, 'monthly', '#3b82f6', ARRAY['1 Store', '5 Automation Rules', 'Email Support']),
                ('pro_monthly', 'Pro Monthly', 299000, 'monthly', '#8b5cf6', ARRAY['5 Stores', '25 Automation Rules', 'Telegram Priority']),
                ('premium_monthly', 'Premium Monthly', 599000, 'monthly', '#10b981', ARRAY['Unlimited Stores', 'Unlimited Rules', 'Dedicated Manager']);
            `);

            // Seed some random transactions and subscriptions for analytics visualization
            console.log('🌱 Seeding sample data for analytics visualization...');
            const plans = await client.query('SELECT id, plan_name FROM subscription_plans');

            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const plan = plans.rows[Math.floor(Math.random() * plans.rows.length)];
                const amount = (plan.plan_name.includes('Basic') ? 149000 : plan.plan_name.includes('Pro') ? 299000 : 599000);

                // Create subscription
                const subRes = await client.query(`
                    INSERT INTO subscriptions (user_id, plan_id, status, created_at)
                    VALUES ($1, $2, 'active', $3) RETURNING id
                `, ['sample-user-' + i, plan.id, date]);

                // Create transaction
                await client.query(`
                    INSERT INTO transactions (user_id, subscription_id, amount, status, created_at)
                    VALUES ($1, $2, 'success', $3)
                `, ['sample-user-' + i, subRes.rows[0].id, amount, date]);
            }
            console.log('✅ Sample data seeded');
        }

        console.log('🏁 Migration finished successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
