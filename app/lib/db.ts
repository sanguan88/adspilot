import { Pool, Client, PoolClient } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Load environment variables from .env files (development fallback)
 * SECURITY: In production, always use proper environment variables
 */
function loadEnvFallback() {
  // Load untuk development dan juga untuk memastikan env vars tersedia
  // Di production, sebaiknya gunakan environment variables yang proper
  try {
    // Juga coba load dari .env.local (Next.js standard)
    const envLocalPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf-8')
      const envLines = envContent.split('\n')
      
      for (const line of envLines) {
        const trimmedLine = line.trim()
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const equalIndex = trimmedLine.indexOf('=')
          if (equalIndex === -1) continue
          
          const key = trimmedLine.substring(0, equalIndex).trim()
          let value = trimmedLine.substring(equalIndex + 1).trim()
          
          // Handle quoted values
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          
          // Unescape escaped quotes
          value = value.replace(/\\"/g, '"').replace(/\\'/g, "'")
          
          if (key && value !== '') {
            // .env.local memiliki prioritas lebih tinggi
            process.env[key] = value
          }
        }
      }
    }
    
    // Juga coba load dari .env (fallback)
    const dotEnvPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(dotEnvPath)) {
      const envContent = fs.readFileSync(dotEnvPath, 'utf-8')
      const envLines = envContent.split('\n')
      
      for (const line of envLines) {
        const trimmedLine = line.trim()
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const equalIndex = trimmedLine.indexOf('=')
          if (equalIndex === -1) continue
          
          const key = trimmedLine.substring(0, equalIndex).trim()
          let value = trimmedLine.substring(equalIndex + 1).trim()
          
          // Handle quoted values
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          
          // Unescape escaped quotes
          value = value.replace(/\\"/g, '"').replace(/\\'/g, "'")
          
          if (key && value !== '') {
            // Hanya set jika belum di-set (prioritas lebih rendah dari .env.local)
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        }
      }
    }
  } catch (error) {
    // Log error di development untuk debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('[DB Config] Error loading env files:', error instanceof Error ? error.message : 'Unknown error')
    }
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
      `Please set these variables in your .env or .env.local file or environment.`
    )
  }

  return requiredEnvVars
}

// Get DB config dengan lazy validation (hanya saat runtime)
function getDBConfig() {
  // Pastikan env vars dimuat (reload untuk memastikan)
  loadEnvFallback()
  
  // Validasi environment variables
  const envVars = validateEnvVars()
  
  const port = parseInt(process.env.DB_PORT || '5432')
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    host: envVars.DB_HOST!,
    user: envVars.DB_USER!,
    password: envVars.DB_PASSWORD!,
    database: envVars.DB_NAME!,
    port: port,
    // PostgreSQL connection settings
    connectionTimeoutMillis: isDevelopment ? 30000 : 10000, // Lebih panjang untuk development (30s vs 10s)
    idleTimeoutMillis: isDevelopment ? 60000 : 30000, // 60 detik untuk development (lebih stabil untuk local DB)
    max: isDevelopment ? 5 : 10, // Lebih sedikit untuk development (kurangi overhead)
    // Keep-alive untuk mencegah connection terminated
    keepAlive: isDevelopment,
    keepAliveInitialDelayMillis: isDevelopment ? 10000 : 0, // Send keep-alive setelah 10 detik idle
  }
}

// Export config dengan lazy evaluation
// Config akan divalidasi saat runtime saat function dipanggil
export const DB_CONFIG = getDBConfig()

// Connection pool untuk mengelola koneksi dengan lebih efisien
let connectionPool: Pool | null = null
let poolConfig: ReturnType<typeof getDBConfig> | null = null
let keepAliveInterval: NodeJS.Timeout | null = null // Keep-alive interval untuk development

/**
 * Get atau create connection pool
 * Connection pool lebih efisien untuk production
 */
function getConnectionPool(): Pool {
  const config = getDBConfig()
  
  // Reset pool jika config berubah atau pool error
  if (!connectionPool || !poolConfig || 
      poolConfig.host !== config.host ||
      poolConfig.port !== config.port ||
      poolConfig.database !== config.database ||
      poolConfig.user !== config.user) {
    
    // Close existing pool jika ada
    if (connectionPool) {
      connectionPool.end().catch(() => {})
    }
    
    // Clear keep-alive interval jika ada
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval)
      keepAliveInterval = null
    }
    
    poolConfig = config
    connectionPool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      idleTimeoutMillis: config.idleTimeoutMillis,
      max: config.max,
      // Keep-alive settings untuk development
      ...(config.keepAlive && {
        keepAlive: true,
        keepAliveInitialDelayMillis: config.keepAliveInitialDelayMillis || 0,
      }),
      // Statement timeout untuk prevent hanging queries
      statement_timeout: process.env.NODE_ENV === 'development' ? 30000 : 10000,
      // Query timeout
      query_timeout: process.env.NODE_ENV === 'development' ? 30000 : 10000,
    })
    
    // Setup keep-alive ping untuk development (mencegah connection terminated)
    if (process.env.NODE_ENV === 'development') {
      // Clear existing interval jika ada
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
      }
      
      // Ping setiap 20 detik untuk keep connection alive
      keepAliveInterval = setInterval(() => {
        if (connectionPool) {
          connectionPool.query('SELECT 1').catch((err) => {
            // Ignore errors - just keep connection alive
            if (err?.message?.includes('Connection terminated')) {
              console.warn('[DB Pool] Connection terminated detected in keep-alive, will reset on next use')
            }
          })
        } else {
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval)
            keepAliveInterval = null
          }
        }
      }, 20000) // Every 20 seconds
    }
    
    // Handle pool errors - reset pool jika error
    connectionPool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err)
      // Reset pool jika ada error untuk force reconnect
      connectionPool = null
      poolConfig = null
    })
  }
  
  return connectionPool
}

/**
 * Helper function untuk membuat koneksi database
 * Gunakan ini untuk konsistensi di seluruh aplikasi
 * Dengan retry mechanism untuk handle connection terminated
 * 
 * @returns Promise<PoolClient>
 */
export async function getDatabaseConnection(retries: number = 2): Promise<PoolClient> {
  // Pastikan env vars dimuat
  loadEnvFallback()
  
  // Validasi env vars saat runtime (saat function dipanggil)
  const config = getDBConfig()
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Force reset pool jika ada connection terminated error sebelumnya
      if (attempt > 1) {
        // Reset pool untuk force reconnect
        if (connectionPool) {
          try {
            await connectionPool.end()
          } catch (e) {
            // Ignore error saat end
          }
        }
        connectionPool = null
        poolConfig = null
      }
      
    // Gunakan connection pool (sama untuk production dan development)
    const pool = getConnectionPool()
    const client = await pool.connect()
      
      // Test connection dengan simple query
      try {
        await client.query('SELECT 1')
      } catch (testError: any) {
        // Connection test failed, release and retry
        client.release()
        if (testError?.message?.includes('Connection terminated') || 
            testError?.message?.includes('connection') ||
            attempt < retries) {
          lastError = testError
          await new Promise(resolve => setTimeout(resolve, 100 * attempt)) // Small delay before retry
          continue
        }
        throw testError
      }
      
    return client
  } catch (error: any) {
      lastError = error
      
      // Check if it's a connection terminated error that can be retried
      const isConnectionTerminated = error?.message?.includes('Connection terminated') ||
        error?.code === 'UNKNOWN' && error?.message?.includes('Connection')
      
      if (isConnectionTerminated && attempt < retries) {
        // Log and retry
        if (process.env.NODE_ENV === 'development') {
          console.error(`[DB Connection] Connection terminated, retrying (attempt ${attempt}/${retries})...`)
        }
        await new Promise(resolve => setTimeout(resolve, 100 * attempt)) // Small delay before retry
        continue
      }
      
    // Log error detail di development
    if (process.env.NODE_ENV === 'development') {
      console.error('[DB Connection] Error connecting to database:', {
        code: error.code,
        message: error.message,
        host: config.host,
        port: config.port,
        database: config.database,
          attempt,
      })
    }
      
      // If last attempt or not retryable error, throw
      if (attempt >= retries || !isConnectionTerminated) {
    throw error
      }
  }
  }
  
  // If all retries failed, throw last error
  throw lastError || new Error('Database connection failed after retries')
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
