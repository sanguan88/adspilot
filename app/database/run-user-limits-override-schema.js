/**
 * Run User Limits Override Schema Migration
 * 
 * Script untuk create table user_limits_override
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        envVars[key.trim()] = value.replace(/^["']|["']$/g, ''); // Remove quotes
      }
    });
    
    // Set environment variables
    Object.keys(envVars).forEach(key => {
      if (!process.env[key]) {
        process.env[key] = envVars[key];
      }
    });
  } else {
    console.warn('⚠️  .env.local file not found. Using system environment variables.');
  }
}

/**
 * Create user_limits_override table
 */
async function createUserLimitsOverrideTable() {
  loadEnvFile();

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  console.log('🔄 Creating user_limits_override table...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'user-limits-override-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await pool.query(schemaSQL);

    console.log('✅ user_limits_override table created successfully!');
    console.log('');
    console.log('📊 Table structure:');
    console.log('   - user_limits_override');
    console.log('     • user_id (VARCHAR, UNIQUE)');
    console.log('     • max_accounts (INTEGER, NULL)');
    console.log('     • max_automation_rules (INTEGER, NULL)');
    console.log('     • max_campaigns (INTEGER, NULL)');
    console.log('     • created_at, updated_at (TIMESTAMP)');
    console.log('     • created_by, updated_by (VARCHAR)');
    console.log('     • notes (TEXT)');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Update API /api/users/[userId]/limits (PUT) to save to database');
    console.log('   2. Update getUserSubscriptionLimits() to check override table');
    console.log('   3. Test override functionality');
    console.log('');
    console.log('✅ Migration completed!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table user_limits_override already exists. Skipping...');
    } else {
      console.error('❌ Migration error:', error.message);
      console.error(error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

// Run migration
createUserLimitsOverrideTable();

