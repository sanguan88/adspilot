import { Pool, Client, PoolClient } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Load environment variables from db_config.env as fallback (development only)
 * SECURITY: In production, always use proper environment variables
 */
function loadEnvFallback() {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  try {
    const envPath = path.join(process.cwd(), 'db_config.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      const envLines = envContent.split('\n')
      
      for (const line of envLines) {
        const trimmedLine = line.trim()
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=')
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim()
            // Only set if not already set in process.env
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        }
      }
    }
  } catch (error) {
    // Silent fail - fallback loading is optional
  }
}

// Load fallback env vars (development only)
loadEnvFallback()

// Helper function untuk validasi environment variables
// Hanya validasi saat runtime, bukan saat build time
function validateEnvVars() {
  const requiredEnvVars = {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      `Please set these variables in your .env file or environment.\n` +
      `For development, you can also use db_config.env file as fallback.`
    )
  }

  return requiredEnvVars
}

// Get DB config dengan lazy validation (hanya saat runtime)
function getDBConfig() {
  // Validasi environment variables
  const envVars = validateEnvVars()
  
  return {
    host: envVars.DB_HOST!,
    user: envVars.DB_USER!,
    password: envVars.DB_PASSWORD!,
    database: envVars.DB_NAME!,
    port: parseInt(process.env.DB_PORT || '3306'),
    // PostgreSQL connection settings
    connectionTimeoutMillis: 10000, // 10 detik
    idleTimeoutMillis: 30000,
    max: 10, // Maximum number of clients in the pool
  }
}

// Export config dengan lazy evaluation
// Config akan divalidasi saat runtime saat function dipanggil
export const DB_CONFIG = getDBConfig()

// Connection pool untuk mengelola koneksi dengan lebih efisien
let connectionPool: Pool | null = null

/**
 * Get atau create connection pool
 * Connection pool lebih efisien untuk production
 */
function getConnectionPool(): Pool {
  if (!connectionPool) {
    const config = getDBConfig()
    connectionPool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      idleTimeoutMillis: config.idleTimeoutMillis,
      max: config.max,
    })
  }
  return connectionPool
}

/**
 * Helper function untuk membuat koneksi database
 * Gunakan ini untuk konsistensi di seluruh aplikasi
 * 
 * @returns Promise<PoolClient>
 */
export async function getDatabaseConnection(): Promise<PoolClient> {
  // Validasi env vars saat runtime (saat function dipanggil)
  const config = getDBConfig()
  
  // Gunakan connection pool untuk production
  if (process.env.NODE_ENV === 'production') {
    const pool = getConnectionPool()
    return await pool.connect()
  }
  
  // Untuk development, gunakan direct connection dari pool juga
  const pool = getConnectionPool()
  return await pool.connect()
}

/**
 * Helper function untuk execute query dengan auto-close connection
 * Berguna untuk single query operations
 * 
 * @param callback Function yang menerima connection dan mengembalikan Promise<T>
 * @returns Promise<T>
 */
export async function withDatabaseConnection<T>(
  callback: (connection: PoolClient) => Promise<T>,
  retries: number = 3
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    let connection: PoolClient | null = null
    try {
      connection = await getDatabaseConnection()
      const result = await callback(connection)
      
      // Release connection back to pool
      connection.release()
      
      return result
    } catch (error: any) {
      lastError = error
      
      // Release connection jika ada error
      if (connection) {
        try {
          connection.release()
        } catch (closeError) {
          // Ignore close error
        }
      }
      
      // Retry jika error timeout atau connection refused
      if (
        (error.code === 'ETIMEDOUT' || 
         error.code === 'ECONNREFUSED' || 
         error.code === 'ENOTFOUND' ||
         error.code === '57P01' || // PostgreSQL connection failure
         error.code === '57P02' || // PostgreSQL connection does not exist
         error.code === '57P03') && // PostgreSQL connection failure
        attempt < retries
      ) {
        // Wait sebelum retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Jika bukan timeout error atau sudah max retries, throw error
      throw error
    }
  }
  
  // Jika semua retry gagal, throw last error
  throw lastError || new Error('Database connection failed after retries')
}
