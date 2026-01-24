/**
 * Helper functions untuk mendeteksi dan menangani database errors
 * Memastikan tidak ada informasi sensitif yang diexpose
 */

/**
 * Check apakah error adalah database connection error
 */
export function isDatabaseConnectionError(error: any): boolean {
  if (!error) return false;

  // PostgreSQL connection error codes
  const dbErrorCodes = [
    'ECONNREFUSED',      // Connection refused
    'ETIMEDOUT',         // Connection timeout
    'ENOTFOUND',         // DNS lookup failed
    '57P01',             // PostgreSQL: admin_shutdown
    '57P02',             // PostgreSQL: crash_shutdown
    '57P03',             // PostgreSQL: cannot_connect_now
    '08003',             // PostgreSQL: connection_does_not_exist
    '08006',             // PostgreSQL: connection_failure
    '08001',             // PostgreSQL: sqlclient_unable_to_establish_sqlconnection
    '08004',             // PostgreSQL: sqlserver_rejected_establishment_of_sqlconnection
    '28P01',             // PostgreSQL: invalid_authorization_specification (wrong password)
    '3D000',             // PostgreSQL: invalid_catalog_name (database does not exist)
    '53300',             // PostgreSQL: too_many_connections
  ];

  // Check error code
  if (error.code && dbErrorCodes.includes(error.code)) {
    return true;
  }

  // Check error message untuk keywords database connection
  const errorMessage = error.message?.toLowerCase() || '';
  const dbKeywords = [
    'connection',
    'connect',
    'database',
    'postgresql',
    'timeout',
    'refused',
    'network',
    'host',
    'port',
    'authentication',
    'password',
    'credentials',
    'terminated', // Connection terminated unexpectedly
    'closed', // Connection closed
    'lost', // Connection lost
  ];

  const hasDbKeyword = dbKeywords.some(keyword => errorMessage.includes(keyword));

  // Check jika error adalah dari pg library
  const isPgError = error.constructor?.name?.includes('Postgres') || 
                    error.constructor?.name?.includes('Database') ||
                    error.message?.includes('pg') ||
                    error.message?.includes('postgres');

  return hasDbKeyword || isPgError;
}

/**
 * Get generic error message untuk database errors
 * Tidak expose informasi sensitif
 */
export function getGenericDatabaseErrorMessage(): string {
  return 'Database tidak dapat diakses saat ini. Silakan coba lagi dalam beberapa saat.';
}

/**
 * Sanitize error untuk logging
 * Hapus informasi sensitif seperti host, database name, password, dll
 */
export function sanitizeErrorForLogging(error: any): { type: string; code?: string } {
  if (!error) {
    return { type: 'UnknownError' };
  }

  const errorType = error.constructor?.name || 'UnknownError';
  const errorCode = error.code || undefined;

  // Jangan log message karena mungkin mengandung info sensitif
  return {
    type: errorType,
    code: errorCode,
  };
}

