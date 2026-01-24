/**
 * Script untuk menjalankan SQL schema payment settings
 * 
 * Usage:
 *   node database/run-schema.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env.local tidak ditemukan!');
    console.log('📝 Pastikan file .env.local sudah dibuat di folder adbot/');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        env[key] = value;
      }
    }
  });
  
  return env;
}

async function runSchema() {
  // Read SQL file (accept filename as argument or use default)
  const sqlFileName = process.argv[2] || 'payment-settings-schema.sql';
  console.log(`🚀 Running SQL Schema: ${sqlFileName}...\n`);
  
  const env = loadEnvFile();
  
  const config = {
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '3306'),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  };
  
  console.log('📋 Database Config:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log('');
  
  const sqlPath = path.join(__dirname, sqlFileName);
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file tidak ditemukan: ${sqlPath}`);
    console.error(`   Usage: node run-schema.js <sql-file-name>`);
    process.exit(1);
  }
  
  console.log(`📄 Using SQL file: ${sqlFileName}\n`);
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  
  // Remove comments and split by semicolon
  let cleanedSql = sqlContent
    // Remove single-line comments
    .replace(/--.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Clean up whitespace
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  // Split by semicolon, but keep multi-line statements together
  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const pool = new Pool(config);
  
  try {
    console.log('⏳ Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected!\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip if too short (likely empty after cleaning)
      if (statement.length < 10) {
        continue;
      }
      
      try {
        // Extract statement type and table name for logging
        const statementType = statement.split(/\s+/)[0].toUpperCase();
        let tableName = 'unknown';
        
        if (statementType === 'CREATE') {
          const match = statement.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:idx_)?(\w+)/i);
          tableName = match ? match[1] : 'unknown';
        } else if (statementType === 'INSERT') {
          const match = statement.match(/INTO\s+(\w+)/i);
          tableName = match ? match[1] : 'unknown';
        }
        
        console.log(`⏳ Executing: ${statementType} ${tableName}...`);
        
        await client.query(statement);
        
        console.log(`✅ Success: ${statementType} ${tableName}`);
        successCount++;
      } catch (error) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || 
            error.code === '23505' ||
            error.message.includes('already exists') ||
            error.message.includes('duplicate key')) {
          console.log(`⏭️  Skipped: Already exists`);
          successCount++;
        } else {
          console.error(`❌ Error: ${error.message.split('\n')[0]}`);
          console.error(`   Code: ${error.code || 'N/A'}`);
          errorCount++;
        }
      }
    }
    
    client.release();
    await pool.end();
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ Schema berhasil dijalankan!');
      console.log('\n📝 Langkah selanjutnya:');
      console.log('   1. Buka admin panel: /payment-settings');
      console.log('   2. Pilih "Manual Transfer" sebagai active method');
      console.log('   3. Tambahkan bank accounts');
      console.log('   4. Save settings');
    } else {
      console.log('\n⚠️  Ada beberapa error. Silakan cek log di atas.');
    }
    
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`\nError Details:`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Possible issues:');
      console.error('   - Firewall blocking connection');
      console.error('   - Wrong IP address');
      console.error('   - Network connectivity problem');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Possible issues:');
      console.error('   - Database server not running');
      console.error('   - Wrong port number');
    } else if (error.code === '28P01') {
      console.error('\n💡 Possible issues:');
      console.error('   - Wrong username or password');
    } else if (error.code === '3D000') {
      console.error('\n💡 Possible issues:');
      console.error('   - Database does not exist');
    }
    
    await pool.end();
    process.exit(1);
  }
}

runSchema();

