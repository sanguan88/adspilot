import { Pool, PoolClient } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Load environment variables from .env files (development fallback)
 * SECURITY: In production, always use proper environment variables
 */
function loadEnvFallback() {
  try {
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

          if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }

          value = value.replace(/\\"/g, '"').replace(/\\'/g, "'")

          if (key && value !== '') {
            process.env[key] = value
          }
        }
      }
    }

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

          if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }

          value = value.replace(/\\"/g, '"').replace(/\\'/g, "'")

          if (key && value !== '' && !process.env[key]) {
            process.env[key] = value
          }
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[DB Config] Error loading env files:', error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

loadEnvFallback()

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

function getDBConfig() {
  loadEnvFallback()
  const envVars = validateEnvVars()
  const port = parseInt(process.env.DB_PORT || '5432')

  return {
    host: envVars.DB_HOST!,
    user: envVars.DB_USER!,
    password: envVars.DB_PASSWORD!,
    database: envVars.DB_NAME!,
    port: port,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  }
}

export const DB_CONFIG = getDBConfig()

let connectionPool: Pool | null = null
let poolConfig: ReturnType<typeof getDBConfig> | null = null

function getConnectionPool(): Pool {
  const config = getDBConfig()

  if (!connectionPool || !poolConfig ||
    poolConfig.host !== config.host ||
    poolConfig.port !== config.port ||
    poolConfig.database !== config.database ||
    poolConfig.user !== config.user) {

    if (connectionPool) {
      connectionPool.end().catch(() => { })
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
    })

    connectionPool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err)
    })
  }

  return connectionPool
}

export async function getDatabaseConnection(): Promise<PoolClient> {
  loadEnvFallback()
  const config = getDBConfig()

  try {
    const pool = getConnectionPool()
    const client = await pool.connect()
    return client
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[DB Connection] Error connecting to database:', {
        code: error.code,
        message: error.message,
        host: config.host,
        port: config.port,
        database: config.database,
      })
    }
    throw error
  }
}

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
      connection.release()
      return result
    } catch (error: any) {
      lastError = error

      if (connection) {
        try {
          connection.release()
        } catch (closeError) {
          // Ignore close error
        }
      }

      if (
        (error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === '57P01' ||
          error.code === '57P02' ||
          error.code === '57P03') &&
        attempt < retries
      ) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }

  throw lastError || new Error('Database connection failed after retries')
}
