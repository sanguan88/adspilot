/**
 * Check Audit Logs in Database
 * Run: node check-audit-logs.js
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=:#]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    }
}

loadEnv();

async function checkAuditLogs() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔍 Checking audit logs...\n');

        // Get total count
        const countResult = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
        const total = parseInt(countResult.rows[0].total);
        console.log(`📊 Total audit logs: ${total}\n`);

        if (total === 0) {
            console.log('⚠️  No audit logs found in database');
            return;
        }

        // Get latest 10 logs
        const logsResult = await pool.query(`
      SELECT 
        id,
        user_email,
        user_role,
        action,
        resource_type,
        resource_name,
        description,
        old_values,
        new_values,
        ip_address,
        status,
        created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

        console.log('📋 Latest 10 Audit Logs:\n');
        console.log('═'.repeat(100));

        logsResult.rows.forEach((log, index) => {
            console.log(`\n${index + 1}. ID: ${log.id}`);
            console.log(`   Time: ${new Date(log.created_at).toLocaleString('id-ID')}`);
            console.log(`   User: ${log.user_email} (${log.user_role})`);
            console.log(`   Action: ${log.action}`);
            console.log(`   Resource: ${log.resource_type} - ${log.resource_name || 'N/A'}`);
            console.log(`   Description: ${log.description}`);
            console.log(`   Status: ${log.status}`);
            console.log(`   IP: ${log.ip_address || 'N/A'}`);

            if (log.old_values) {
                console.log(`   Old Values: ${JSON.stringify(log.old_values, null, 2)}`);
            }

            if (log.new_values) {
                console.log(`   New Values: ${JSON.stringify(log.new_values, null, 2)}`);
            }

            console.log('   ' + '─'.repeat(98));
        });

        console.log('\n═'.repeat(100));

        // Get summary by action
        const summaryResult = await pool.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
    `);

        console.log('\n📊 Summary by Action:\n');
        summaryResult.rows.forEach(row => {
            console.log(`   ${row.action.padEnd(30)} : ${row.count} logs`);
        });

        console.log('\n✅ Check complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

// Run check
checkAuditLogs();
