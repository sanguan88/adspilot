import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { getDatabaseConnection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors';
import { randomUUID } from 'crypto';
import { 
  generateUniqueCodeWithCheck, 
  calculatePPN, 
  calculateTotal,
  calculateDiscount,
  PPN_RATE 
} from '@/lib/payment-calculator';

// Validasi email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null;
  
  try {
    connection = await getDatabaseConnection();
    const body = await request.json();
    const { username, email, nama_lengkap, password, planId, voucherCode } = body;

    // Validasi input
    if (!username || !email || !nama_lengkap || !password) {
      return NextResponse.json(
        { success: false, error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Validasi format
    if (username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username minimal 3 karakter' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (nama_lengkap.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap minimal 2 karakter' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    // Connection already established above
    
    try {
      // Cek apakah username sudah ada
      const usernameCheck = await connection.query(
        'SELECT username FROM data_user WHERE username = $1',
        [username.trim().toLowerCase()]
      );

      if (usernameCheck.rows.length > 0) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Username sudah digunakan' },
          { status: 400 }
        );
      }

      // Cek apakah email sudah ada
      const emailCheck = await connection.query(
        'SELECT email FROM data_user WHERE email = $1',
        [email.trim().toLowerCase()]
      );

      if (emailCheck.rows.length > 0) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Email sudah terdaftar' },
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate user_id (UUID)
      const userId = randomUUID();

      // Determine user status: pending_payment if planId provided, otherwise aktif
      const userStatus = planId ? 'pending_payment' : 'aktif';

      // Insert user baru dengan role default 'user' dan status berdasarkan planId
      const result = await connection.query(
        `INSERT INTO data_user (
          user_id, username, email, password, nama_lengkap, 
          role, status_user, created_at, update_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING no, user_id, username, email, nama_lengkap, role, status_user`,
        [
          userId,
          username.trim().toLowerCase(),
          email.trim().toLowerCase(),
          hashedPassword,
          nama_lengkap.trim(),
          'user', // Default role
          userStatus, // pending_payment if planId, otherwise aktif
        ]
      );

      const newUser = result.rows[0];

      // Create transaction if planId is provided
      let transactionData = null;
      if (planId) {
        try {
          // Fetch plan price from database
          const planResult = await connection.query(
            'SELECT price FROM subscription_plans WHERE plan_id = $1 AND is_active = true',
            [planId]
          );
          
          if (planResult.rows.length === 0) {
            connection.release();
            return NextResponse.json(
              { success: false, error: 'Plan tidak ditemukan atau tidak aktif' },
              { status: 400 }
            );
          }
          
          const baseAmount = parseFloat(planResult.rows[0].price);
          
          if (baseAmount > 0) {
            // Generate unique code
            const uniqueCode = await generateUniqueCodeWithCheck(connection);
            
            // Handle voucher if provided, or use default voucher
            let appliedVoucherCode = null;
            let discountAmount = 0;
            let voucherId = null;
            let voucherResult: any = null;
            
            // If no voucher code provided, check for default voucher
            let voucherCodeToUse = voucherCode;
            if (!voucherCodeToUse) {
              const defaultVoucherResult = await connection.query(
                `SELECT default_voucher_id 
                 FROM payment_settings 
                 WHERE default_voucher_enabled = true 
                 AND default_voucher_id IS NOT NULL
                 ORDER BY id DESC LIMIT 1`
              );
              
              if (defaultVoucherResult.rows.length > 0 && defaultVoucherResult.rows[0].default_voucher_id) {
                const defaultVoucherId = defaultVoucherResult.rows[0].default_voucher_id;
                const voucherCodeResult = await connection.query(
                  `SELECT code FROM vouchers 
                   WHERE id = $1 AND is_active = true 
                   AND (expiry_date IS NULL OR expiry_date > NOW())`,
                  [defaultVoucherId]
                );
                
                if (voucherCodeResult.rows.length > 0) {
                  voucherCodeToUse = voucherCodeResult.rows[0].code;
                }
              }
            }
            
            if (voucherCodeToUse) {
              // Validate voucher
              voucherResult = await connection.query(
                `SELECT 
                  id, code, discount_type, discount_value,
                  start_date, expiry_date, is_active,
                  applicable_plans, minimum_purchase, maximum_discount
                FROM vouchers
                WHERE UPPER(code) = UPPER($1)`,
                [voucherCodeToUse.trim()]
              );
              
              if (voucherResult.rows.length > 0) {
                const voucher = voucherResult.rows[0];
                const now = new Date();
                
                // Validate voucher
                if (!voucher.is_active) {
                  throw new Error('Voucher tidak aktif');
                }
                
                if (voucher.expiry_date && new Date(voucher.expiry_date) < now) {
                  throw new Error('Voucher sudah kadaluarsa');
                }
                
                if (voucher.start_date && new Date(voucher.start_date) > now) {
                  throw new Error('Voucher belum berlaku');
                }
                
                if (voucher.applicable_plans && voucher.applicable_plans.length > 0) {
                  if (!voucher.applicable_plans.includes(planId)) {
                    throw new Error(`Voucher tidak berlaku untuk plan ${planId}`);
                  }
                }
                
                if (voucher.minimum_purchase && baseAmount < parseFloat(voucher.minimum_purchase)) {
                  throw new Error(`Minimum purchase untuk voucher ini adalah Rp ${parseFloat(voucher.minimum_purchase).toLocaleString('id-ID')}`);
                }
                
                // Calculate discount
                discountAmount = calculateDiscount(
                  baseAmount,
                  voucher.discount_type,
                  parseFloat(voucher.discount_value),
                  voucher.maximum_discount ? parseFloat(voucher.maximum_discount) : null
                );
                
                appliedVoucherCode = voucher.code;
                voucherId = voucher.id;
              } else {
                throw new Error('Voucher code tidak ditemukan');
              }
            }
            
            // Calculate amounts with voucher discount
            const baseAmountAfterDiscount = Math.max(0, baseAmount - discountAmount);
            const ppnAmount = calculatePPN(baseAmountAfterDiscount, PPN_RATE);
            const totalAmount = baseAmountAfterDiscount + ppnAmount + uniqueCode;
            
            // Generate transaction ID
            const transactionId = `TXN-${Date.now()}-${randomUUID().substring(0, 8).toUpperCase()}`;
            
            // Calculate expires_at (default: 7 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
            
            // Insert transaction
            const transactionResult = await connection.query(
              `INSERT INTO transactions (
                transaction_id, user_id, plan_id,
                base_amount, ppn_percentage, ppn_amount, unique_code, total_amount,
                voucher_code, discount_amount,
                payment_method, payment_status,
                expires_at,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
              RETURNING id, transaction_id, base_amount, ppn_amount, unique_code, total_amount, voucher_code, discount_amount, payment_status`,
              [
                transactionId,
                newUser.user_id,
                planId,
                baseAmount,
                PPN_RATE,
                ppnAmount,
                uniqueCode,
                totalAmount,
                appliedVoucherCode,
                discountAmount > 0 ? discountAmount : null,
                'manual', // Default payment method
                'pending', // Default status
                expiresAt.toISOString(), // Expires at (7 days from now)
              ]
            );
            
            // Record voucher usage if voucher was used
            if (voucherId && appliedVoucherCode && voucherResult && voucherResult.rows.length > 0) {
              const voucher = voucherResult.rows[0];
              const totalBeforeDiscount = baseAmount + calculatePPN(baseAmount, PPN_RATE) + uniqueCode;
              
              await connection.query(
                `INSERT INTO voucher_usage (
                  voucher_id, voucher_code, transaction_id, user_id,
                  discount_type, discount_value, discount_amount,
                  plan_id, base_amount, total_amount_before_discount, total_amount_after_discount,
                  used_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
                [
                  voucherId,
                  appliedVoucherCode,
                  transactionId,
                  newUser.user_id,
                  voucher.discount_type,
                  voucher.discount_value,
                  discountAmount,
                  planId,
                  baseAmount,
                  totalBeforeDiscount, // Total before discount
                  totalAmount, // Total after discount
                ]
              );
            }

            transactionData = {
              transactionId: transactionResult.rows[0].transaction_id,
              baseAmount: parseFloat(transactionResult.rows[0].base_amount),
              ppnAmount: parseFloat(transactionResult.rows[0].ppn_amount),
              uniqueCode: transactionResult.rows[0].unique_code,
              totalAmount: parseFloat(transactionResult.rows[0].total_amount),
              paymentStatus: transactionResult.rows[0].payment_status,
            };
          }
        } catch (transactionError: any) {
          // Log error but don't fail registration
          console.error('Error creating transaction:', transactionError);
          // Continue without transaction data
        }
      }

      connection.release();

      return NextResponse.json({
        success: true,
        message: 'Registrasi berhasil',
        data: {
          userId: newUser.user_id, // Use user_id (UUID) instead of no
          username: newUser.username,
          email: newUser.email,
          nama_lengkap: newUser.nama_lengkap,
          planId: planId || null, // Include planId in response
          transaction: transactionData, // Include transaction data
        },
      });
    } catch (error: any) {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          // Ignore release error
        }
      }

      // Handle unique constraint violation
      if (error.code === '23505') {
        const constraint = error.constraint;
        if (constraint?.includes('username')) {
          return NextResponse.json(
            { success: false, error: 'Username sudah digunakan' },
            { status: 400 }
          );
        }
        if (constraint?.includes('email')) {
          return NextResponse.json(
            { success: false, error: 'Email sudah terdaftar' },
            { status: 400 }
          );
        }
      }

      const sanitized = sanitizeErrorForLogging(error);
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [Register] Error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      return NextResponse.json(
        {
          success: false,
          error: process.env.NODE_ENV === 'development' 
            ? `Error: ${error.message || 'Terjadi kesalahan saat registrasi'}`
            : 'Terjadi kesalahan saat registrasi. Silakan coba lagi.',
        },
        { status: 500 }
      );
    }
  } catch (outerError: any) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        // Ignore release error
      }
    }

    if (isDatabaseConnectionError(outerError)) {
      const sanitized = sanitizeErrorForLogging(outerError);
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      return NextResponse.json(
        {
          success: false,
          error: getGenericDatabaseErrorMessage(),
        },
        { status: 503 }
      );
    }

    const sanitized = sanitizeErrorForLogging(outerError);
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Register error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat registrasi. Silakan coba lagi.',
      },
      { status: 500 }
    );
  }
}

