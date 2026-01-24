import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Helper function to read password from .env.local (same parsing as standalone script)
function getDbPassword(): string {
  // Always read from file to ensure correct password (same method as standalone script)
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      // Parse dengan cara yang sama seperti script standalone
      let password: string | null = null;
      envContent.split('\n').forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (key.trim() === 'DB_PASSWORD') {
              password = value;
            }
          }
        }
      });
      if (password) {
        console.log('Database Config - Password read from .env.local file (parsed like standalone script)');
        return password;
      }
    }
  } catch (err) {
    console.warn('Could not read .env.local file:', err);
  }
  
  // Fallback: try process.env
  if (process.env.DB_PASSWORD) {
    console.log('Database Config - Password from process.env');
    return process.env.DB_PASSWORD;
  }
  
  // Final fallback
  console.warn('Database Config - Using default password (fallback)');
  return '123qweASD!@#!@#';
}

// Database configuration untuk PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || '154.19.37.179',
  port: parseInt(process.env.DB_PORT || '3306'), // PostgreSQL menggunakan port 3306 (customized)
  user: process.env.DB_USER || 'soroboti_db',
  password: getDbPassword(),
  database: process.env.DB_NAME || 'soroboti_db',
  max: 10, // connectionLimit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10 seconds for better reliability
  // PostgreSQL specific options
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  timezone: '+07:00'
};

// Log database configuration (without password for security)
console.log('Database Config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  ssl: dbConfig.ssl ? 'enabled' : 'disabled'
});

// Create connection pool with error handling
let pool: Pool | null = null;

try {
  pool = new Pool(dbConfig);
  
  // Handle pool errors
  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
  });
  
  // Test connection on initialization
  pool.connect()
    .then((client) => {
      console.log('Database pool initialized successfully');
      client.release();
    })
    .catch((err) => {
      console.error('Failed to initialize database pool:', err);
      console.error('Database Config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database,
        ssl: dbConfig.ssl ? 'enabled' : 'disabled'
      });
    });
} catch (error) {
  console.error('Error creating database pool:', error);
}

// Database connection helper
export const db = {
  // Check connection health
  async checkConnection() {
    if (!pool) {
      console.error('Database pool not initialized');
      return false;
    }
    
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error: any) {
      console.error('Database connection check failed:', error);
      // Log more details for authentication errors
      if (error.code === '28P01') {
        console.error('Authentication failed. Please check:');
        console.error('- DB_USER:', dbConfig.user);
        console.error('- DB_PASSWORD: [hidden]');
        console.error('- DB_HOST:', dbConfig.host);
        console.error('- DB_PORT:', dbConfig.port);
        console.error('- DB_NAME:', dbConfig.database);
      } else if (error.code === 'ECONNREFUSED') {
        console.error('Connection refused. Please check:');
        console.error('- DB_HOST:', dbConfig.host);
        console.error('- DB_PORT:', dbConfig.port);
        console.error('- Is database server running?');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Connection timeout. Please check:');
        console.error('- Network connectivity');
        console.error('- Firewall settings');
        console.error('- DB_HOST:', dbConfig.host);
        console.error('- DB_PORT:', dbConfig.port);
      }
      return false;
    }
  },

  // Convert MySQL placeholder (?) to PostgreSQL placeholder ($1, $2, ...)
  convertPlaceholders(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }
    
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  },

  // Execute query dengan retry mechanism
  async query(sql: string, params?: any[]) {
    if (!pool) {
      throw new Error('Database pool not initialized. Please check database configuration.');
    }
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Check connection health before query (only on retry)
        if (retryCount > 0) {
          const isHealthy = await this.checkConnection();
          if (!isHealthy) {
            console.warn(`Database connection unhealthy, retrying... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          }
        }
        
        // Convert MySQL placeholders to PostgreSQL placeholders
        const convertedSql = this.convertPlaceholders(sql, params);
        
        // Execute query with PostgreSQL
        const result = await pool.query(convertedSql, params || []);
        
        // PostgreSQL returns { rows, rowCount, ... }
        if (result && result.rows) {
          return result.rows;
        }
        
        // If result is not in expected format, return empty array
        if (!result) {
          console.warn('Database query returned undefined result');
          return [];
        }
        
        return result;
      } catch (error: any) {
        retryCount++;
        console.error(`Database query attempt ${retryCount} failed:`, error.message);
        console.error('Error code:', error.code);
        
        // Don't retry on certain errors
        if (error.code === '28P01' || error.code === '3D000') {
          // Authentication error or database doesn't exist - don't retry
          throw error;
        }
        
        if (retryCount >= maxRetries) {
          console.error('Database query error after all retries:', error);
          console.error('SQL:', sql);
          console.error('Params:', params);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  },

  // Get single row
  async getOne(sql: string, params?: any[]) {
    const rows = await this.query(sql, params);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },

  // Get all rows
  async getAll(sql: string, params?: any[]) {
    return await this.query(sql, params);
  },

  // Insert and return insert ID
  async insert(sql: string, params?: any[]) {
    if (!pool) {
      throw new Error('Database pool not initialized. Please check database configuration.');
    }
    
    try {
      // Convert MySQL placeholders to PostgreSQL placeholders
      const convertedSql = this.convertPlaceholders(sql, params);
      
      // For PostgreSQL, we need to add RETURNING clause at the end if not present
      let finalSql = convertedSql;
      if (!convertedSql.toUpperCase().includes('RETURNING')) {
        // Try to extract table name and add RETURNING clause
        const match = convertedSql.match(/INSERT\s+INTO\s+(\w+)/i);
        if (match) {
          const tableName = match[1];
          
          // Determine the primary key column based on table name
          let idColumn = 'no'; // default to 'no' (common in this database)
          
          // For specific tables, use their primary key column
          if (tableName === 'data_akun') {
            idColumn = 'no'; // Primary key is 'no' (auto-increment)
          } else if (tableName === 'data_tim') {
            idColumn = 'kode_tim'; // Primary key is 'kode_tim'
          } else if (tableName === 'data_site') {
            idColumn = 'kode_site'; // Primary key is 'kode_site'
          } else if (tableName === 'data_user') {
            idColumn = 'no'; // Primary key is 'no'
          } else if (tableName === 'data_device_sessions') {
            idColumn = 'id'; // Primary key is 'id' (or device_identifier)
          } else if (tableName === 'data_lisense') {
            idColumn = 'id'; // Primary key is 'id'
          }
          // For other tables, default to 'no' (most common in this database)
          
          finalSql = convertedSql + ` RETURNING ${idColumn}`;
        }
      }
      
      const result = await pool.query(finalSql, params || []);
      
      // PostgreSQL returns the inserted row with RETURNING clause
      if (result && result.rows && result.rows.length > 0) {
        const insertedRow = result.rows[0];
        // Return the first column value (usually the ID)
        return insertedRow[Object.keys(insertedRow)[0]];
      }
      
      return null;
    } catch (error: any) {
      console.error('Database insert error:', error);
      throw error;
    }
  },

  // Update and return affected rows
  async update(sql: string, params?: any[]) {
    if (!pool) {
      throw new Error('Database pool not initialized. Please check database configuration.');
    }
    
    try {
      // Convert MySQL placeholders to PostgreSQL placeholders
      const convertedSql = this.convertPlaceholders(sql, params);
      
      const result = await pool.query(convertedSql, params || []);
      
      // PostgreSQL returns rowCount
      if (result && result.rowCount !== undefined) {
        return result.rowCount;
      }
      
      return 0;
    } catch (error: any) {
      console.error('Database update error:', error);
      throw error;
    }
  },

  // Delete and return affected rows
  async delete(sql: string, params?: any[]) {
    return await this.update(sql, params);
  },

  // Transaction helper
  async transaction(callback: (client: any) => Promise<any>) {
    if (!pool) {
      throw new Error('Database pool not initialized. Please check database configuration.');
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Close all connections
  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};

export default db;

