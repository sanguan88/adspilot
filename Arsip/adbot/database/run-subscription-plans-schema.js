/**
 * Run Subscription Plans Migration
 * 
 * Script untuk membuat subscription_plans table
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
function loadEnvVars() {
  const possiblePaths = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../db_config.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📂 Loading env from: ${envPath}`);
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (key && value) {
            process.env[key.trim()] = value;
          }
        }
      });
      return;
    }
  }
  
  console.warn('⚠️  No .env file found. Using system environment variables.');
}

async function runMigration() {
  loadEnvVars();

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('❌ Database configuration tidak lengkap!');
    process.exit(1);
  }

  console.log('🔄 Running subscription plans migration...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log('');

  const pool = new Pool(dbConfig);

  try {
    const migrationPath = path.join(__dirname, 'subscription-plans-schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    await pool.query(migrationSql);
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Created subscription_plans table with default plans:');
    console.log('   • 1-month (Rp 349.000)');
    console.log('   • 3-month (Rp 749.000)');
    console.log('   • 6-month (Rp 1.499.000)');

  } catch (error) {
    if (error.code === '42P07') { // duplicate_table
      console.warn('⚠️  Table already exists. Skipping.');
    } else if (error.code === '23505') { // unique_violation
      console.warn('⚠️  Default plans already exist. Skipping inserts.');
    } else {
      console.error('❌ Migration error:', error.message);
      if (error.code) {
        console.error('   Error code:', error.code);
      }
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

