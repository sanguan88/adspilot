/**
 * Script untuk test koneksi database PostgreSQL
 * Menjalankan berbagai test koneksi dengan konfigurasi berbeda
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnvFile();

// Baca konfigurasi dari environment atau default
const dbConfigs = [
  // Config 1: Tanpa SSL (default)
  {
    name: 'Config 1: Tanpa SSL',
    host: process.env.DB_HOST || '154.19.37.179',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'soroboti_db',
    password: process.env.DB_PASSWORD || '123qweASD!@#!@#',
    database: process.env.DB_NAME || 'soroboti_db',
    ssl: false,
    connectionTimeoutMillis: 5000,
  },
  // Config 2: Dengan SSL (rejectUnauthorized: false)
  {
    name: 'Config 2: Dengan SSL (rejectUnauthorized: false)',
    host: process.env.DB_HOST || '154.19.37.179',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'soroboti_db',
    password: process.env.DB_PASSWORD || '123qweASD!@#!@#',
    database: process.env.DB_NAME || 'soroboti_db',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  },
  // Config 3: Dengan SSL (require: true)
  {
    name: 'Config 3: Dengan SSL (require: true)',
    host: process.env.DB_HOST || '154.19.37.179',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'soroboti_db',
    password: process.env.DB_PASSWORD || '123qweASD!@#!@#',
    database: process.env.DB_NAME || 'soroboti_db',
    ssl: { require: true, rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  },
];

async function testConnection(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${config.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Config:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    ssl: config.ssl ? 'enabled' : 'disabled',
  });

  const pool = new Pool(config);
  let client = null;

  try {
    console.log('\n[1] Mencoba koneksi ke database...');
    client = await pool.connect();
    console.log('✓ Koneksi berhasil!');

    console.log('\n[2] Menjalankan query test (SELECT 1)...');
    const result1 = await client.query('SELECT 1 as test');
    console.log('✓ Query berhasil:', result1.rows[0]);

    console.log('\n[3] Menjalankan query test (SELECT version())...');
    const result2 = await client.query('SELECT version()');
    console.log('✓ PostgreSQL version:', result2.rows[0].version.substring(0, 50) + '...');

    console.log('\n[4] Menjalankan query test (SELECT current_database())...');
    const result3 = await client.query('SELECT current_database()');
    console.log('✓ Current database:', result3.rows[0].current_database);

    console.log('\n[5] Menjalankan query test (SELECT current_user)...');
    const result4 = await client.query('SELECT current_user');
    console.log('✓ Current user:', result4.rows[0].current_user);

    console.log('\n[6] Menjalankan query test (SELECT COUNT(*) FROM data_user)...');
    try {
      const result5 = await client.query('SELECT COUNT(*) as count FROM data_user');
      console.log('✓ Total users:', result5.rows[0].count);
    } catch (err) {
      console.log('⚠ Table data_user tidak ditemukan atau tidak bisa diakses:', err.message);
    }

    console.log('\n[7] Menjalankan query test (SELECT COUNT(*) FROM information_schema.tables)...');
    const result6 = await client.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('✓ Total tables:', result6.rows[0].count);

    console.log(`\n${'='.repeat(60)}`);
    console.log('✓ SEMUA TEST BERHASIL!');
    console.log(`${'='.repeat(60)}\n`);

    return { success: true, config: config.name };
  } catch (error) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('✗ ERROR:', error.message);
    console.log(`${'='.repeat(60)}`);
    
    if (error.code) {
      console.log('Error Code:', error.code);
    }
    if (error.severity) {
      console.log('Severity:', error.severity);
    }
    if (error.detail) {
      console.log('Detail:', error.detail);
    }
    if (error.hint) {
      console.log('Hint:', error.hint);
    }

    // Tips berdasarkan error code
    if (error.code === '28P01') {
      console.log('\n💡 Tips: Password authentication failed');
      console.log('   - Periksa apakah password benar');
      console.log('   - Periksa apakah user database ada');
      console.log('   - Periksa file .env.local atau environment variables');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('\n💡 Tips: Connection refused atau timeout');
      console.log('   - Periksa apakah host dan port benar');
      console.log('   - Periksa apakah database server berjalan');
      console.log('   - Periksa firewall atau network settings');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Tips: Host tidak ditemukan');
      console.log('   - Periksa apakah host/IP address benar');
      console.log('   - Periksa koneksi internet');
    }

    return { success: false, config: config.name, error: error.message, code: error.code };
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function runAllTests() {
  console.log('\n🚀 MULAI TEST KONEKSI DATABASE POSTGRESQL');
  console.log('='.repeat(60));
  console.log('Environment Variables:');
  console.log('  DB_HOST:', process.env.DB_HOST || 'NOT SET (using default)');
  console.log('  DB_PORT:', process.env.DB_PORT || 'NOT SET (using default)');
  console.log('  DB_USER:', process.env.DB_USER || 'NOT SET (using default)');
  console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET (using default)');
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : 'NOT SET (using default)');
  console.log('='.repeat(60));

  const results = [];

  for (const config of dbConfigs) {
    const result = await testConnection(config);
    results.push(result);

    // Jika berhasil, tidak perlu test config lain
    if (result.success) {
      console.log('\n✅ KONEKSI BERHASIL! Menggunakan config:', config.name);
      console.log('\n📋 Rekomendasi:');
      console.log('   Tambahkan ke .env.local atau lib/database.ts:');
      console.log(`   DB_SSL=${config.ssl ? 'true' : 'false'}`);
      break;
    }

    // Tunggu sebentar sebelum test berikutnya
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n📊 RINGKASAN HASIL TEST:');
  console.log('='.repeat(60));
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`✓ ${result.config}: BERHASIL`);
    } else {
      console.log(`✗ ${result.config}: GAGAL (${result.code || result.error})`);
    }
  });
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.success).length;
  if (successCount === 0) {
    console.log('\n❌ SEMUA TEST GAGAL!');
    console.log('\n💡 Saran:');
    console.log('   1. Periksa kredensial database (user, password)');
    console.log('   2. Periksa apakah database server berjalan');
    console.log('   3. Periksa firewall atau network settings');
    console.log('   4. Periksa apakah port 3306 benar (PostgreSQL biasanya 5432)');
    console.log('   5. Coba koneksi manual dengan psql atau pgAdmin');
    process.exit(1);
  } else {
    console.log(`\n✅ ${successCount} dari ${results.length} test berhasil!`);
    process.exit(0);
  }
}

// Jalankan test
runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

