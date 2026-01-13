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

  const dbConfig = {
    host: envVars.DB_HOST || 'localhost',
    port: parseInt(envVars.DB_PORT || '5432'),
    database: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  };

  if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('❌ Database configuration tidak lengkap!');
    console.error('   Required: DB_NAME, DB_USER, DB_PASSWORD');
    process.exit(1);
  }

  console.log('📦 Running subscriptions schema...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    const sqlPath = path.join(__dirname, 'subscriptions-schema.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ File schema tidak ditemukan: ${sqlPath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Remove comments and split by semicolon
    let cleanedSql = sqlContent
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length >= 10);

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        const statementType = statement.split(/\s+/)[0].toUpperCase();
        let tableName = 'unknown';
        
        if (statementType === 'CREATE') {
          const match = statement.match(/CREATE\s+(?:TABLE|INDEX|UNIQUE\s+INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:idx_)?(\w+)/i);
          tableName = match ? match[1] : 'unknown';
        }
        
        console.log(`⏳ Executing: ${statementType} ${tableName}...`);
        await pool.query(statement);
        console.log(`✅ Success: ${statementType} ${tableName}\n`);
        successCount++;
      } catch (error) {
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
      console.log('\n✅ Subscriptions schema berhasil dijalankan!');
      console.log('\n📋 Tabel yang dibuat:');
      console.log('   - subscriptions');
      console.log('\n📋 Indexes yang dibuat:');
      console.log('   - idx_subscriptions_user_id');
      console.log('   - idx_subscriptions_transaction_id');
      console.log('   - idx_subscriptions_status');
      console.log('   - idx_subscriptions_start_date');
      console.log('   - idx_subscriptions_end_date');
      console.log('   - idx_subscriptions_user_active (unique)');
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

