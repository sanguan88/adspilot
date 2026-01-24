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
        // Superadmin: semua username
        query = 'SELECT DISTINCT username FROM data_akun';
        break;

      case 'admin':
        // Admin: hanya username dari site yang dia kelola
        if (user.kode_site) {
          query = 'SELECT DISTINCT username FROM data_akun WHERE kode_site = $1';
          params.push(user.kode_site);
          paramIndex++;
        } else {
          // Jika admin tidak punya kode_site, return empty array
          return [];
        }
        break;

      case 'manager':
        // Manager: hanya username dari tim yang dia kelola (nama_tim = nama_lengkap)
        query = 'SELECT DISTINCT da.username FROM data_akun da LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim WHERE dt.nama_tim = $1';
        params.push(user.nama_lengkap);
        paramIndex++;
        break;

      case 'staff':
        // Staff: hanya username yang dia kelola (PIC_akun = nama_lengkap)
        query = 'SELECT DISTINCT username FROM data_akun WHERE pic_akun = $1';
        params.push(user.nama_lengkap);
        paramIndex++;
        break;

      default:
        return [];
    }

    const result = await connection.query(query, params);
    return result.rows.map((row: any) => row.username).filter((username: string) => username);
  } finally {
    connection.release();
  }
}
