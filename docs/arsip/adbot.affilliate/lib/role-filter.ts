import { UserPayload } from './auth';

/**
 * Generate WHERE clause untuk filter berdasarkan role user
 */
export function getRoleBasedFilter(user: UserPayload): {
  whereClause: string;
  params: any[];
} {
  let whereClause = '';
  const params: any[] = [];

  switch (user.role) {
    case 'superadmin':
      // Superadmin: tampilkan semua akun (tidak ada filter)
      whereClause = '';
      break;

    case 'admin':
      // Admin: hanya tampilkan site yang dia kelola
      if (user.kode_site) {
        whereClause = 'AND da.kode_site = ?';
        params.push(user.kode_site);
      } else {
        // Jika admin tidak punya kode_site, tidak tampilkan apa-apa
        whereClause = 'AND 1 = 0'; // Always false
      }
      break;

    case 'manager':
      // Manager: hanya tampilkan tim yang dia kelola
      // Manager mengelola tim berdasarkan kode_tim di data_user yang sama dengan kode_tim di data_tim
      if (user.kode_tim) {
        whereClause = 'AND da.kode_tim = ?';
        params.push(user.kode_tim);
      } else {
        // Jika manager tidak punya kode_tim, tidak tampilkan apa-apa
        whereClause = 'AND 1 = 0'; // Always false
      }
      break;

    case 'staff':
      // Staff: hanya tampilkan akun yang dia kelola (PIC_akun = nama_lengkap)
      whereClause = 'AND da.pic_akun = ?';
      params.push(user.nama_lengkap);
      break;

    default:
      // Default: tidak tampilkan apa-apa
      whereClause = 'AND 1 = 0';
      break;
  }

  return { whereClause, params };
}

/**
 * Generate WHERE clause untuk filter dropdown options berdasarkan role
 */
export function getRoleBasedFilterForOptions(user: UserPayload): {
  whereClause: string;
  params: any[];
} {
  let whereClause = '';
  const params: any[] = [];

  switch (user.role) {
    case 'superadmin':
      whereClause = '';
      break;

    case 'admin':
      if (user.kode_site) {
        whereClause = 'AND da.kode_site = ?';
        params.push(user.kode_site);
      } else {
        whereClause = 'AND 1 = 0';
      }
      break;

    case 'manager':
      if (user.kode_tim) {
        whereClause = 'AND da.kode_tim = ?';
        params.push(user.kode_tim);
      } else {
        whereClause = 'AND 1 = 0';
      }
      break;

    case 'staff':
      whereClause = 'AND da.pic_akun = ?';
      params.push(user.nama_lengkap);
      break;

    default:
      whereClause = 'AND 1 = 0';
      break;
  }

  return { whereClause, params };
}

