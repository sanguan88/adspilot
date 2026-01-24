import { UserPayload } from './auth';

/**
 * Generate WHERE clause untuk filter berdasarkan role user
 * UPDATED: User isolation - admin/superadmin lihat semua, user hanya miliknya
 */
export function getRoleBasedFilter(user: UserPayload): {
  whereClause: string;
  params: any[];
} {
  let whereClause = '';
  const params: any[] = [];

  switch (user.role) {
    case 'superadmin':
    case 'admin':
      // Superadmin & Admin: tampilkan semua data (tidak ada filter)
      whereClause = '';
      break;

    case 'manager':
    case 'user':
    case 'staff':
      // Manager, User, Staff: hanya tampilkan data yang dimiliki user
      whereClause = 'AND dt.user_id = $1';
      params.push(user.userId);
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
 * UPDATED: User isolation - admin/superadmin lihat semua, user hanya miliknya
 */
export function getRoleBasedFilterForOptions(user: UserPayload): {
  whereClause: string;
  params: any[];
} {
  let whereClause = '';
  const params: any[] = [];

  switch (user.role) {
    case 'superadmin':
    case 'admin':
      whereClause = '';
      break;

    case 'manager':
    case 'user':
    case 'staff':
      // Manager, User, Staff: hanya tampilkan toko yang dimiliki user
      whereClause = 'AND dt.user_id = $1';
      params.push(user.userId);
      break;

    default:
      whereClause = 'AND 1 = 0';
      break;
  }

  return { whereClause, params };
}

/**
 * Check if user can access all data (admin/superadmin)
 */
export function canAccessAllData(user: UserPayload): boolean {
  return user.role === 'superadmin' || user.role === 'admin';
}

/**
 * Generate WHERE clause untuk filter by user_id
 * Returns empty string for admin/superadmin, or user_id filter for others
 */
export function getUserFilter(user: UserPayload, columnName: string = 'user_id', paramIndex: number = 1): {
  whereClause: string;
  params: any[];
} {
  if (canAccessAllData(user)) {
    return { whereClause: '', params: [] };
  }

  return {
    whereClause: `AND ${columnName} = $${paramIndex}`,
    params: [user.userId]
  };
}

/**
 * Generate WHERE clause untuk filter by toko_id (via data_toko.user_id)
 * For tables that reference toko_id instead of user_id directly
 */
export function getTokoFilter(user: UserPayload, tokoColumnName: string = 'id_toko', paramIndex: number = 1): {
  whereClause: string;
  params: any[];
} {
  if (canAccessAllData(user)) {
    return { whereClause: '', params: [] };
  }

  return {
    whereClause: `AND ${tokoColumnName} IN (SELECT id_toko FROM data_toko WHERE user_id = $${paramIndex})`,
    params: [user.userId]
  };
}

