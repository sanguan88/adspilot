/**
 * Payment Calculator
 * Helper functions untuk menghitung PPN dan generate kode unik
 */

// PPN rate untuk Indonesia (11%)
export const PPN_RATE = 11.0;

// Note: Plan definitions are now stored in database (subscription_plans table)
// Use /api/plans endpoint to fetch plans
// This file only contains calculation utilities

/**
 * Generate random 3 digit unique code (100-999)
 */
export function generateUniqueCode(): number {
  return Math.floor(Math.random() * 900) + 100; // 100-999
}

/**
 * Calculate PPN amount
 * @param baseAmount - Harga sebelum PPN
 * @param ppnRate - Persentase PPN (default 11%)
 * @returns Jumlah PPN
 */
export function calculatePPN(baseAmount: number, ppnRate: number = PPN_RATE): number {
  return Math.round(baseAmount * (ppnRate / 100));
}

/**
 * Calculate total amount (base + PPN + unique code)
 * @param baseAmount - Harga paket
 * @param uniqueCode - Kode unik 3 digit
 * @param ppnRate - Persentase PPN (default 11%)
 * @param discountAmount - Discount amount (optional, default 0)
 * @returns Total yang harus dibayar
 */
export function calculateTotal(
  baseAmount: number,
  uniqueCode: number,
  ppnRate: number = PPN_RATE,
  discountAmount: number = 0
): number {
  // Calculate base amount after discount (Indonesia standard: discount from base before PPN)
  const baseAmountAfterDiscount = Math.max(0, baseAmount - discountAmount);
  
  // Calculate PPN from base amount after discount
  const ppnAmount = calculatePPN(baseAmountAfterDiscount, ppnRate);
  
  // Total = base_after_discount + ppn + unique_code
  return baseAmountAfterDiscount + ppnAmount + uniqueCode;
}

/**
 * Get plan price by planId (DEPRECATED - Use database query instead)
 * @deprecated This function is deprecated. Fetch plan price from database instead.
 * @param planId - ID paket
 * @returns Harga paket atau 0 jika tidak ditemukan
 */
export function getPlanPrice(planId: string): number {
  // This function is deprecated - always returns 0
  // Use database query: SELECT price FROM subscription_plans WHERE plan_id = $1
  console.warn('getPlanPrice is deprecated. Use database query instead.');
  return 0;
}

/**
 * Generate unique code that doesn't exist in pending transactions
 * @param connection - Database connection
 * @param maxRetries - Maximum retry attempts (default 10)
 * @returns Unique code (100-999)
 */
export async function generateUniqueCodeWithCheck(
  connection: any,
  maxRetries: number = 10
): Promise<number> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateUniqueCode();
    
    // Check if code already exists in pending transactions
    const result = await connection.query(
      `SELECT id FROM transactions 
       WHERE unique_code = $1 
       AND payment_status = 'pending' 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [code]
    );

    if (result.rows.length === 0) {
      return code;
    }
  }

  // If all retries failed, throw error
  throw new Error('Gagal generate kode unik. Silakan coba lagi.');
}

/**
 * Calculate discount amount from voucher
 * @param baseAmount - Base amount sebelum discount
 * @param discountType - 'percentage' atau 'fixed'
 * @param discountValue - Nilai discount (percentage: 10 = 10%, fixed: 50000 = Rp 50.000)
 * @param maxDiscount - Maximum discount amount (optional, untuk percentage type)
 * @returns Discount amount
 */
export function calculateDiscount(
  baseAmount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  maxDiscount?: number | null
): number {
  let discountAmount = 0;
  
  if (discountType === 'percentage') {
    // Percentage discount
    discountAmount = Math.round(baseAmount * (discountValue / 100));
    
    // Apply maximum discount if specified
    if (maxDiscount !== null && maxDiscount !== undefined && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }
  } else {
    // Fixed discount
    discountAmount = discountValue;
  }
  
  // Ensure discount doesn't exceed base amount
  return Math.min(discountAmount, baseAmount);
}

/**
 * Calculate total with voucher discount (Indonesia standard)
 * @param baseAmount - Harga paket sebelum discount
 * @param uniqueCode - Kode unik 3 digit
 * @param discountType - 'percentage' atau 'fixed'
 * @param discountValue - Nilai discount
 * @param ppnRate - Persentase PPN (default 11%)
 * @param maxDiscount - Maximum discount amount (optional)
 * @returns Object dengan breakdown: { discountAmount, baseAmountAfterDiscount, ppnAmount, totalAmount }
 */
export function calculateTotalWithVoucher(
  baseAmount: number,
  uniqueCode: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  ppnRate: number = PPN_RATE,
  maxDiscount?: number | null
): {
  discountAmount: number;
  baseAmountAfterDiscount: number;
  ppnAmount: number;
  totalAmount: number;
} {
  // Calculate discount amount
  const discountAmount = calculateDiscount(baseAmount, discountType, discountValue, maxDiscount);
  
  // Calculate base amount after discount
  const baseAmountAfterDiscount = Math.max(0, baseAmount - discountAmount);
  
  // Calculate PPN from base amount after discount (Indonesia standard)
  const ppnAmount = calculatePPN(baseAmountAfterDiscount, ppnRate);
  
  // Calculate total
  const totalAmount = baseAmountAfterDiscount + ppnAmount + uniqueCode;
  
  return {
    discountAmount,
    baseAmountAfterDiscount,
    ppnAmount,
    totalAmount,
  };
}

