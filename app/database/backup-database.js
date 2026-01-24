const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Backup Database Script
 * 
 * Script untuk backup seluruh database PostgreSQL ke file SQL
 * 
 * Usage: node backup-database.js
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
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Unescape quotes
      value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
      
      if (key && value !== '') {
        envVars[key] = value;
      }
    }
  }
  
  return envVars;
}

async function backupDatabase() {
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
    console.log('🔄 Starting database backup...\n');
    console.log('📊 Database:', dbConfig.database);
    console.log('🌐 Host:', dbConfig.host);
    console.log('🔌 Port:', dbConfig.port);
    console.log('');

    // Create backup directory
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('📁 Created backup directory:', backupDir);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFile = path.join(backupDir, `backup_${dbConfig.database}_${timestamp}.sql`);

    console.log('💾 Backup file:', backupFile);
    console.log('');

    // Get all table names
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`📋 Found ${tables.length} tables:`);
    tables.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table}`);
    });
    console.log('');

    // Start writing backup file
    const backupStream = fs.createWriteStream(backupFile);
    
    // Write header
    backupStream.write(`-- =====================================================\n`);
    backupStream.write(`-- Database Backup\n`);
    backupStream.write(`-- Database: ${dbConfig.database}\n`);
    backupStream.write(`-- Host: ${dbConfig.host}:${dbConfig.port}\n`);
    backupStream.write(`-- Backup Date: ${new Date().toISOString()}\n`);
    backupStream.write(`-- =====================================================\n\n`);
    backupStream.write(`-- Set timezone\n`);
    backupStream.write(`SET timezone = 'UTC';\n\n`);

    // Backup each table
    for (const table of tables) {
      console.log(`📦 Backing up table: ${table}...`);
      
      // Get table structure (CREATE TABLE statement)
      const structureResult = await pool.query(`
        SELECT 
          'CREATE TABLE IF NOT EXISTS ' || quote_ident(table_name) || ' (' ||
          string_agg(
            quote_ident(column_name) || ' ' || 
            CASE 
              WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
              WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
              WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
              WHEN data_type = 'integer' THEN 'INTEGER'
              WHEN data_type = 'bigint' THEN 'BIGINT'
              WHEN data_type = 'boolean' THEN 'BOOLEAN'
              WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
              WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
              WHEN data_type = 'date' THEN 'DATE'
              WHEN data_type = 'text' THEN 'TEXT'
              WHEN data_type = 'jsonb' THEN 'JSONB'
              WHEN data_type = 'json' THEN 'JSON'
              ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE 
              WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
              ELSE ''
            END,
            ', '
            ORDER BY ordinal_position
          ) || ');'
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        GROUP BY table_name
      `, [table]);

      if (structureResult.rows.length > 0) {
        backupStream.write(`\n-- =====================================================\n`);
        backupStream.write(`-- Table: ${table}\n`);
        backupStream.write(`-- =====================================================\n\n`);
        backupStream.write(`${structureResult.rows[0].create_table}\n\n`);
      }

      // Get table data
      const dataResult = await pool.query(`SELECT * FROM ${table}`);
      
      if (dataResult.rows.length > 0) {
        backupStream.write(`-- Data for table: ${table}\n`);
        backupStream.write(`-- Total rows: ${dataResult.rows.length}\n\n`);
        
        // Get column names
        const columns = Object.keys(dataResult.rows[0]);
        
        // Write INSERT statements
        for (const row of dataResult.rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              // Escape single quotes
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            if (value instanceof Date) return `'${value.toISOString()}'`;
            if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            return value;
          });
          
          backupStream.write(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`);
        }
        
        backupStream.write(`\n`);
        console.log(`   ✅ Backed up ${dataResult.rows.length} rows`);
      } else {
        console.log(`   ⚠️  Table is empty`);
        backupStream.write(`-- Table ${table} is empty\n\n`);
      }
    }

    backupStream.end();

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      backupStream.on('finish', resolve);
      backupStream.on('error', reject);
    });

    // Get file size
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('');
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Backup file: ${backupFile}`);
    console.log(`📊 File size: ${fileSizeMB} MB`);
    console.log('');
    console.log('💡 To restore, use:');
    console.log(`   psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} < ${backupFile}`);
    console.log('');

  } catch (error) {
    console.error('❌ Backup error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run backup
backupDatabase().catch(console.error);

