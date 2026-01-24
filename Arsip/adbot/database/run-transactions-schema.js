const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ File .env.local tidak ditemukan!');
    console.error('   Path:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value.trim();
      }
    }
  });

  return envVars;
}

async function runSchema() {
  const envVars = loadEnvFile();

  // Database configuration
  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  // Validate required env vars
  if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('❌ Database configuration tidak lengkap!');
    console.error('   Required: DB_NAME, DB_USER, DB_PASSWORD');
    process.exit(1);
  }

  console.log('📦 Running transactions schema...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'transactions-schema.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ File schema tidak ditemukan: ${sqlPath}`);
      process.exit(1);
    }

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
      .filter(s => s.length > 0 && s.length >= 10); // Filter out very short statements

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Extract statement type and table name for logging
        const statementType = statement.split(/\s+/)[0].toUpperCase();
        let tableName = 'unknown';
        
        if (statementType === 'CREATE') {
          const match = statement.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:idx_)?(\w+)/i);
          tableName = match ? match[1] : 'unknown';
        }
        
        console.log(`⏳ Executing: ${statementType} ${tableName}...`);
        await pool.query(statement);
        console.log(`✅ Success: ${statementType} ${tableName}\n`);
        successCount++;
      } catch (error) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || 
            error.message.includes('already exists')) {
          console.log(`⏭️  Skipped: Already exists\n`);
          successCount++;
        } else {
          console.error(`❌ Error: ${error.message.split('\n')[0]}`);
          console.error(`   Code: ${error.code || 'N/A'}\n`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ Transactions schema berhasil dijalankan!');
      console.log('\n📋 Tabel yang dibuat:');
      console.log('   - transactions');
      console.log('\n📋 Indexes yang dibuat:');
      console.log('   - idx_transactions_user_id');
      console.log('   - idx_transactions_transaction_id');
      console.log('   - idx_transactions_payment_status');
      console.log('   - idx_transactions_unique_code');
      console.log('   - idx_transactions_created_at');
    } else {
      console.log('\n⚠️  Ada beberapa error. Silakan cek log di atas.');
    }

  } catch (error) {
    console.error('❌ Error running schema:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSchema();

