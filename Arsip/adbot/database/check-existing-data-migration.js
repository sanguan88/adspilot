const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Check Existing Data for Migration
 * 
 * Script untuk cek apakah ada data existing yang perlu di-migrate
 * (data yang user_id-nya NULL atau tidak valid)
 * 
 * Usage: node check-existing-data-migration.js
 */

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env.local tidak ditemukan!');
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

async function checkExistingData() {
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
    console.log('🔍 Checking existing data for migration needs...\n');
    console.log('📊 Database:', dbConfig.database);
    console.log('');

    // Tables to check
    const tablesToCheck = [
      'data_toko',
      'data_rules',
      'data_produk',
      'report_aggregate',
    ];

    const results = {
      needsMigration: [],
      allGood: [],
      totalRows: {},
      nullUserIds: {},
      emptyUserIds: {},
      invalidUserIds: {}
    };

    for (const table of tablesToCheck) {
      console.log(`📋 Checking table: ${table}...`);

      // Get total rows
      const totalResult = await pool.query(`SELECT COUNT(*) as total FROM ${table}`);
      const total = parseInt(totalResult.rows[0].total);
      results.totalRows[table] = total;

      // Check for NULL user_id
      const nullResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table} 
        WHERE user_id IS NULL
      `);
      const nullCount = parseInt(nullResult.rows[0].count);
      results.nullUserIds[table] = nullCount;

      // Check for empty string user_id
      const emptyResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table} 
        WHERE user_id = '' OR user_id IS NULL
      `);
      const emptyCount = parseInt(emptyResult.rows[0].count);
      results.emptyUserIds[table] = emptyCount;

      // Check for invalid user_id (not in data_user)
      const invalidResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table} t
        WHERE t.user_id IS NOT NULL 
        AND t.user_id != ''
        AND NOT EXISTS (
          SELECT 1 FROM data_user u WHERE u.user_id = t.user_id
        )
      `);
      const invalidCount = parseInt(invalidResult.rows[0].count);
      results.invalidUserIds[table] = invalidCount;

      // Check for valid user_id
      const validResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${table} t
        WHERE t.user_id IS NOT NULL 
        AND t.user_id != ''
        AND EXISTS (
          SELECT 1 FROM data_user u WHERE u.user_id = t.user_id
        )
      `);
      const validCount = parseInt(validResult.rows[0].count);

      console.log(`   Total rows: ${total}`);
      console.log(`   ✅ Valid user_id: ${validCount}`);
      console.log(`   ❌ NULL user_id: ${nullCount}`);
      console.log(`   ❌ Empty user_id: ${emptyCount}`);
      console.log(`   ⚠️  Invalid user_id: ${invalidCount}`);

      if (nullCount > 0 || emptyCount > 0 || invalidCount > 0) {
        results.needsMigration.push({
          table,
          total,
          valid: validCount,
          null: nullCount,
          empty: emptyCount,
          invalid: invalidCount,
          needsAction: true
        });
        console.log(`   ⚠️  NEEDS MIGRATION`);
      } else {
        results.allGood.push({
          table,
          total,
          valid: validCount
        });
        console.log(`   ✅ All good!`);
      }
      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   ✅ Tables OK: ${results.allGood.length}`);
    console.log(`   ⚠️  Tables need migration: ${results.needsMigration.length}`);
    console.log('');

    if (results.needsMigration.length > 0) {
      console.log('⚠️  Tables that need migration:');
      results.needsMigration.forEach(({ table, total, valid, null: nullCount, empty, invalid }) => {
        console.log(`   • ${table}:`);
        console.log(`     Total: ${total}, Valid: ${valid}`);
        if (nullCount > 0) console.log(`     NULL user_id: ${nullCount}`);
        if (empty > 0) console.log(`     Empty user_id: ${empty}`);
        if (invalid > 0) console.log(`     Invalid user_id: ${invalid}`);
      });
      console.log('');
      console.log('💡 Next steps:');
      console.log('   1. Review data in each table');
      console.log('   2. Determine which user should own orphaned data');
      console.log('   3. Run migration script to assign user_id');
      console.log('');
    } else {
      console.log('✅ All tables have valid user_id! No migration needed.');
      console.log('');
    }

    // Get sample of data without user_id for review
    if (results.needsMigration.length > 0) {
      console.log('📋 Sample data without valid user_id:');
      for (const { table } of results.needsMigration) {
        const sampleResult = await pool.query(`
          SELECT * 
          FROM ${table} 
          WHERE user_id IS NULL 
             OR user_id = ''
             OR NOT EXISTS (
               SELECT 1 FROM data_user u WHERE u.user_id = ${table}.user_id
             )
          LIMIT 5
        `);
        
        if (sampleResult.rows.length > 0) {
          console.log(`\n   Table: ${table} (showing first 5 rows):`);
          sampleResult.rows.forEach((row, idx) => {
            console.log(`   ${idx + 1}. ID: ${row.id || row.id_toko || row.rule_id || 'N/A'}, user_id: ${row.user_id || 'NULL'}`);
          });
        }
      }
      console.log('');
    }

    // Save report
    const reportFile = path.join(__dirname, '..', '..', 'backups', `data-migration-check-${new Date().toISOString().split('T')[0]}.json`);
    const reportDir = path.dirname(reportFile);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify({
      checkDate: new Date().toISOString(),
      database: dbConfig.database,
      results
    }, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportFile}`);
    console.log('');

  } catch (error) {
    console.error('❌ Check error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run check
checkExistingData().catch(console.error);

