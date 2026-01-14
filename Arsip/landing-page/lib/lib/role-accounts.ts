import { UserPayload } from './auth';
import { getDatabaseConnection } from './db';

/**
 * Get list of usernames that user can access based on their role
 */
export async function getAllowedUsernames(user: UserPayload): Promise<string[]> {
  const connection = await getDatabaseConnection();
  
  try {
    let query = '';
    const params: any[] = [];
    let paramIndex = 1;

    switch (user.role) {
      case 'superadmin':
      case 'admin':
        // Superadmin & Admin: semua id_toko
        query = 'SELECT DISTINCT id_toko FROM data_toko';
        break;

      case 'manager':
      case 'staff':
      case 'user':
        // Manager, Staff, User: hanya toko yang dimiliki user
        // user.userId is now VARCHAR (user_id), not INTEGER (no)
        query = 'SELECT DISTINCT id_toko FROM data_toko WHERE user_id = $1';
        params.push(user.userId.toString()); // Ensure it's a string
        paramIndex++;
        break;

      default:
        return [];
    }

    const result = await connection.query(query, params);
    return result.rows.map((row: any) => row.id_toko).filter((id_toko: string) => id_toko);
  } finally {
    connection.release();
  }
}
