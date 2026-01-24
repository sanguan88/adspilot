const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Audit Schema for User Isolation
 * 
 * Script untuk audit database schema dan cek apakah semua tabel
 * sudah punya kolom user_id untuk data isolation
 * 
 * Usage: node audit-schema-user-isolation.js
 */

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env.local tidak ditemukan!');
    console.error('   Path:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  const envVars = {};
  
  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) continue;
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
      
      if (key && value !== '') {
        envVars[key] = value;
      }
    }
  }
  
  return envVars;
}

async function auditSchema() {
  const envVars = loadEnvFile();

  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  const pool = new Pool(dbConfig);

  try {
    console.log('🔍 Auditing database schema for user isolation...\n');
    console.log('📊 Database:', dbConfig.database);
    console.log('🌐 Host:', dbConfig.host);
    console.log('');

    // Tables that should have user_id (user-owned data)
    const userOwnedTables = [
      'data_toko',           // Accounts/Toko
      'data_rules',          // Automation Rules
      'data_produk',         // Campaigns (might use id_toko -> data_toko.user_id)
      'data_rekam_medic',    // Rekam Medic
      'data_report_aggregate', // Reports
      'transactions',        // Transactions (already has user_id)
      'subscriptions',       // Subscriptions (already has user_id)
    ];

    // Tables that don't need user_id (system/admin tables)
    const systemTables = [
      'data_user',           // User accounts
      'payment_settings',    // System settings
      'bank_accounts',       // System bank accounts
      'payment_gateway_config', // System config
    ];

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const allTables = tablesResult.rows.map(row => row.table_name);
    
    console.log(`📋 Found ${allTables.length} tables in database\n`);

    // Check each table
    const results = {
      hasUserId: [],
      missingUserId: [],
      hasIndirectUserId: [],
      systemTables: [],
      unknown: []
    };

    for (const table of allTables) {
      // Check if table has user_id column
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        AND column_name IN ('user_id', 'owner_id', 'created_by')
      `, [table]);

      // Check if table has indirect user_id (via foreign key)
      const foreignKeysResult = await pool.query(`
        SELECT 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND (ccu.table_name = 'data_toko' OR ccu.table_name = 'data_user')
      `, [table]);

      const hasUserId = columnsResult.rows.length > 0;
      const hasIndirectUserId = foreignKeysResult.rows.length > 0;

      if (systemTables.includes(table)) {
        results.systemTables.push({
          table,
          reason: 'System/Admin table (no user_id needed)'
        });
      } else if (hasUserId) {
        const userIdCol = columnsResult.rows[0];
        results.hasUserId.push({
          table,
          column: userIdCol.column_name,
          type: userIdCol.data_type,
          nullable: userIdCol.is_nullable
        });
      } else if (hasIndirectUserId) {
        const fk = foreignKeysResult.rows[0];
        results.hasIndirectUserId.push({
          table,
          via: `${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`
        });
      } else if (userOwnedTables.includes(table)) {
        results.missingUserId.push({
          table,
          priority: 'HIGH'
        });
      } else {
        results.unknown.push({
          table,
          note: 'Not in predefined list - needs manual review'
        });
      }
    }

    // Print results
    console.log('✅ Tables WITH user_id column:');
    if (results.hasUserId.length > 0) {
      results.hasUserId.forEach(({ table, column, type, nullable }) => {
        console.log(`   ✓ ${table}`);
        console.log(`     Column: ${column} (${type}, nullable: ${nullable})`);
      });
    } else {
      console.log('   (none)');
    }
    console.log('');

    console.log('🔗 Tables with INDIRECT user_id (via foreign key):');
    if (results.hasIndirectUserId.length > 0) {
      results.hasIndirectUserId.forEach(({ table, via }) => {
        console.log(`   ✓ ${table}`);
        console.log(`     Via: ${via}`);
      });
    } else {
      console.log('   (none)');
    }
    console.log('');

    console.log('❌ Tables MISSING user_id (HIGH PRIORITY):');
    if (results.missingUserId.length > 0) {
      results.missingUserId.forEach(({ table, priority }) => {
        console.log(`   ✗ ${table} [${priority}]`);
      });
    } else {
      console.log('   (none - all good!)');
    }
    console.log('');

    console.log('⚙️  System/Admin tables (no user_id needed):');
    if (results.systemTables.length > 0) {
      results.systemTables.forEach(({ table, reason }) => {
        console.log(`   • ${table}`);
        console.log(`     ${reason}`);
      });
    } else {
      console.log('   (none)');
    }
    console.log('');

    console.log('❓ Unknown tables (needs manual review):');
    if (results.unknown.length > 0) {
      results.unknown.forEach(({ table, note }) => {
        console.log(`   ? ${table}`);
        console.log(`     ${note}`);
      });
    } else {
      console.log('   (none)');
    }
    console.log('');

    // Summary
    console.log('📊 Summary:');
    console.log(`   ✅ Has user_id: ${results.hasUserId.length}`);
    console.log(`   🔗 Indirect user_id: ${results.hasIndirectUserId.length}`);
    console.log(`   ❌ Missing user_id: ${results.missingUserId.length}`);
    console.log(`   ⚙️  System tables: ${results.systemTables.length}`);
    console.log(`   ❓ Unknown: ${results.unknown.length}`);
    console.log('');

    // Recommendations
    if (results.missingUserId.length > 0) {
      console.log('💡 Recommendations:');
      console.log('   1. Add user_id column to missing tables');
      console.log('   2. Migrate existing data (assign to appropriate user)');
      console.log('   3. Add NOT NULL constraint after migration');
      console.log('   4. Add index on user_id for performance');
      console.log('');
    }

    // Save report to file
    const reportFile = path.join(__dirname, '..', '..', 'backups', `schema-audit-${new Date().toISOString().split('T')[0]}.json`);
    const reportDir = path.dirname(reportFile);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify({
      auditDate: new Date().toISOString(),
      database: dbConfig.database,
      results
    }, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportFile}`);
    console.log('');

  } catch (error) {
    console.error('❌ Audit error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run audit
auditSchema().catch(console.error);

