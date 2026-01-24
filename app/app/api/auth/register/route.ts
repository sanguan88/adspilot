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
import { sendTelegramMessage } from '@/tele/service';

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
    const { username, email, nama_lengkap, no_whatsapp, password, planId, voucherCode } = body;

    // Validasi input
    if (!username || !email || !nama_lengkap || !no_whatsapp || !password) {
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

    // Validasi format WhatsApp
    const whatsappRegex = /^(\+62|62|0)?[0-9]{9,12}$/
    const cleanWhatsapp = no_whatsapp.trim().replace(/[\s-]/g, '')
    if (!whatsappRegex.test(cleanWhatsapp)) {
      return NextResponse.json(
        { success: false, error: 'Format No WhatsApp tidak valid. Gunakan format: 081234567890 atau +6281234567890' },
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

      // Read referral code from cookie
      const cookies = request.cookies;
      const referralCode = cookies.get('referral_code')?.value || null;

      // Insert user baru dengan role default 'user' dan status berdasarkan planId
      const result = await connection.query(
        `INSERT INTO data_user (
          user_id, username, email, password, nama_lengkap, no_whatsapp,
          role, status_user, referred_by_affiliate, referral_date, created_at, update_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING no, user_id, username, email, nama_lengkap, role, status_user`,
        [
          userId,
          username.trim().toLowerCase(),
          email.trim().toLowerCase(),
          hashedPassword,
          nama_lengkap.trim(),
          cleanWhatsapp, // No WhatsApp (cleaned)
          'user', // Default role
          userStatus, // pending_payment if planId, otherwise aktif
          referralCode, // referral code from cookie
          referralCode ? new Date() : null, // referral date
        ]
      );

      const newUser = result.rows[0];

      // If referral exists, create record in affiliate_referrals
      if (referralCode) {
        try {
          // Normalize code to handle variations (e.g. ADSPILOT_IG -> ADSPILOT)
          // If the code contains an underscore, we assume the part before it is the affiliate code
          const baseReferralCode = referralCode.includes('_') ? referralCode.split('_')[0] : referralCode;

          const affiliateResult = await connection.query(
            'SELECT affiliate_id FROM affiliates WHERE UPPER(affiliate_code) = UPPER($1)',
            [baseReferralCode]
          );

          if (affiliateResult.rows.length > 0) {
            const affiliateId = affiliateResult.rows[0].affiliate_id;
            await connection.query(
              `INSERT INTO affiliate_referrals (
                affiliate_id, user_id, referral_code, signup_date, status
              ) VALUES ($1, $2, $3, NOW(), 'converted')`,
              [affiliateId, newUser.user_id, referralCode]
            );
          }
        } catch (affError) {
          console.error('Error creating affiliate referral record:', affError);
          // Don't fail registration if this fails
        }
      }

      // Create transaction if planId is provided
      let transactionData = null;
      if (planId) {
        try {
          // Fetch plan price from database
          const planResult = await connection.query(
            'SELECT price, original_price FROM subscription_plans WHERE plan_id = $1 AND is_active = true',
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
          const originalPrice = planResult.rows[0].original_price ? parseFloat(planResult.rows[0].original_price) : 0;

          // Use the higher of price or original_price for voucher validation (to match frontend logic)
          // This ensures that if a voucher has a minimum purchase based on the original price, it still passes validation
          const baseAmountForValidation = Math.max(baseAmount, originalPrice);

          console.log(`[Register] Validation Base: Price=${baseAmount}, Orig=${originalPrice}, Used=${baseAmountForValidation}`);

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

            // Track affiliate from voucher (for commission)
            let voucherAffiliateId: string | null = null;

            if (voucherCodeToUse) {
              // PRIORITY 1: Check if this is an affiliate voucher
              const affiliateVoucherResult = await connection.query(
                `SELECT 
                  av.id, av.voucher_code as code, av.discount_type, av.discount_value,
                  av.is_active, av.affiliate_id
                FROM affiliate_vouchers av
                WHERE UPPER(av.voucher_code) = UPPER($1)`,
                [voucherCodeToUse.trim()]
              );

              if (affiliateVoucherResult.rows.length > 0) {
                // Found affiliate voucher
                const affVoucher = affiliateVoucherResult.rows[0];

                if (!affVoucher.is_active) {
                  throw new Error('Voucher affiliate tidak aktif');
                }

                // Calculate discount for affiliate voucher
                discountAmount = calculateDiscount(
                  baseAmount,
                  affVoucher.discount_type,
                  parseFloat(affVoucher.discount_value),
                  null // No maximum discount for affiliate vouchers
                );

                appliedVoucherCode = affVoucher.code;
                voucherAffiliateId = affVoucher.affiliate_id;

                // Update usage count
                await connection.query(
                  `UPDATE affiliate_vouchers SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
                  [affVoucher.id]
                );

                console.log(`[Register] Applied affiliate voucher: ${affVoucher.code} (Affiliate: ${voucherAffiliateId})`);
              } else {
                // PRIORITY 2: Check regular vouchers table
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

                  if (voucher.minimum_purchase && baseAmountForValidation < parseFloat(voucher.minimum_purchase)) {
                    console.log(`[Register] Voucher Min Purchase Fail: Min=${voucher.minimum_purchase}, ValBase=${baseAmountForValidation}`);
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

            // Insert transaction (Ensure 14 parameters match VALUES list)
            // Insert transaction (Using 11 parameters matching schema akin to addon route)
            const transactionResult = await connection.query(
              `INSERT INTO transactions (
                transaction_id, user_id, plan_id,
                base_amount, ppn_amount, unique_code, total_amount,
                payment_method, payment_status,
                voucher_code, discount_amount,
                created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
              RETURNING id, transaction_id, base_amount, ppn_amount, unique_code, total_amount, voucher_code, discount_amount, payment_status`,
              [
                transactionId,
                newUser.user_id,
                planId,
                baseAmount,
                ppnAmount,
                uniqueCode,
                totalAmount,
                'manual', // Default payment method
                'pending', // Default status
                appliedVoucherCode,
                discountAmount > 0 ? discountAmount : null
              ]
            );

            // Record voucher usage if voucher was used
            if (voucherId && appliedVoucherCode && voucherResult && voucherResult.rows.length > 0) {
              const voucher = voucherResult.rows[0];
              const safeBase = Number(baseAmount) || 0;
              const safePPN = Number(calculatePPN(safeBase, PPN_RATE)) || 0;
              const safeUnique = Number(uniqueCode) || 0;
              const totalBeforeDiscount = safeBase + safePPN + safeUnique;

              try {
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
                    totalBeforeDiscount, // Param 10
                    totalAmount // Param 11
                  ]
                );
              } catch (vuError) {
                console.error('[Register] Error inserting voucher usage:', vuError);
              }
            }

            // NEW: Ensure affiliate referral record exists if affiliate voucher was used
            // This handles cases where user uses a voucher but doesn't have the referral cookie
            if (voucherAffiliateId) {
              try {
                // Check if referral record already exists
                const existingReferral = await connection.query(
                  'SELECT referral_id FROM affiliate_referrals WHERE user_id = $1 AND affiliate_id = $2',
                  [newUser.user_id, voucherAffiliateId]
                );

                if (existingReferral.rows.length === 0) {
                  console.log(`[Register] Creating missing referral record for voucher usage. Affiliate: ${voucherAffiliateId}`);

                  // Create referral record
                  await connection.query(
                    `INSERT INTO affiliate_referrals (
                      affiliate_id, user_id, referral_code, signup_date, status
                    ) VALUES ($1, $2, $3, NOW(), 'converted')`,
                    [voucherAffiliateId, newUser.user_id, appliedVoucherCode]
                  );

                  // Update data_user table if referred_by_affiliate is NULL
                  await connection.query(
                    `UPDATE data_user SET referred_by_affiliate = $1, referral_date = NOW() 
                     WHERE user_id = $2 AND referred_by_affiliate IS NULL`,
                    [appliedVoucherCode, newUser.user_id]
                  );
                }
              } catch (referralError) {
                console.error('[Register] Error creating voucher referral record:', referralError);
                // Don't fail the registration
              }
            }

            console.log('[Register] Transaction Insert Result Rows:', JSON.stringify(transactionResult.rows));

            // Force assignment from input variables if DB return is empty (PostgreSQL quirk)
            const txnRow = transactionResult.rows && transactionResult.rows.length > 0 ? transactionResult.rows[0] : {};

            transactionData = {
              transactionId: txnRow.transaction_id || txnRow.transactionId || transactionId,
              baseAmount: txnRow.base_amount || baseAmount,
              ppnAmount: txnRow.ppn_amount || ppnAmount,
              totalAmount: txnRow.total_amount || totalAmount,
              uniqueCode: txnRow.unique_code || uniqueCode,
              voucherCode: txnRow.voucher_code || appliedVoucherCode,
              discountAmount: txnRow.discount_amount || discountAmount,
            };

            console.log('[Register] Final Transaction Data:', transactionData);
          }
        } catch (transactionError: any) {
          // Log error but don't fail registration
          console.error('Error creating transaction:', transactionError);
          // Continue without transaction data
        }
      }

      // Send Telegram notification to superadmin users
      try {
        const superadminResult = await connection.query(
          `SELECT user_id, chatid_tele, username 
           FROM data_user 
           WHERE role = 'superadmin' 
           AND chatid_tele IS NOT NULL 
           AND chatid_tele != '' 
           AND chatid_tele != 'null'`,
          []
        );

        console.log(`[Register] Found ${superadminResult.rows.length} superadmin(s) with chatid_tele`);

        if (superadminResult.rows.length > 0) {
          // Get plan name if planId exists
          let planName = 'Tidak ada plan';
          if (planId) {
            try {
              const planNameResult = await connection.query(
                'SELECT name FROM subscription_plans WHERE plan_id = $1',
                [planId]
              );
              if (planNameResult.rows.length > 0) {
                planName = planNameResult.rows[0].name;
              } else {
                planName = planId;
              }
            } catch (e) {
              planName = planId || 'Tidak ada plan';
            }
          }

          // Import escapeMarkdown
          const { escapeMarkdown } = await import('@/tele/utils');

          const totalAmount = transactionData?.totalAmount
            ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transactionData.totalAmount)
            : 'Tidak ada transaksi';

          // Escape all user input to prevent Markdown parsing errors
          const escapedUsername = escapeMarkdown(newUser.username || '');
          const escapedNama = escapeMarkdown(newUser.nama_lengkap || '');
          const escapedEmail = escapeMarkdown(newUser.email || '');
          const escapedWhatsapp = escapeMarkdown(cleanWhatsapp || '');
          const escapedPlanName = escapeMarkdown(planName || '');
          const escapedTotal = escapeMarkdown(totalAmount);
          const escapedStatus = escapeMarkdown(newUser.status_user || '');
          const escapedUserId = escapeMarkdown(newUser.user_id || '');

          const message = `🔔 *Registrasi Baru*\n\n` +
            `👤 *User Baru:*\n` +
            `• Username: ${escapedUsername}\n` +
            `• Nama: ${escapedNama}\n` +
            `• Email: ${escapedEmail}\n` +
            `• WhatsApp: ${escapedWhatsapp}\n` +
            `• Plan: ${escapedPlanName}\n` +
            `• Total: ${escapedTotal}\n` +
            `• Status: ${escapedStatus}\n\n` +
            `🆔 User ID: \`${escapedUserId}\``;

          // Send notification to all superadmin users
          const notificationPromises = superadminResult.rows.map(async (admin: any) => {
            try {
              // Clean and validate chatId
              let chatIdRaw = admin.chatid_tele;
              if (chatIdRaw === null || chatIdRaw === undefined) {
                console.warn(`[Register] Superadmin ${admin.user_id} (${admin.username}) has null/undefined chatid_tele`);
                return { success: false, error: 'chatid_tele is null/undefined', adminId: admin.user_id };
              }

              // Convert to string and clean
              let chatIdStr = String(chatIdRaw).trim();

              // Remove any non-digit characters except minus sign at start (for negative chat IDs)
              if (chatIdStr.startsWith('-')) {
                chatIdStr = '-' + chatIdStr.substring(1).replace(/\D/g, '');
              } else {
                chatIdStr = chatIdStr.replace(/\D/g, '');
              }

              if (!chatIdStr || chatIdStr === '' || chatIdStr === 'null' || chatIdStr === 'undefined') {
                console.warn(`[Register] Superadmin ${admin.user_id} (${admin.username}) has invalid chatid_tele: "${chatIdRaw}"`);
                return { success: false, error: 'Invalid chatid_tele format', adminId: admin.user_id, rawChatId: chatIdRaw };
              }

              // Convert to number if it's a valid numeric string, otherwise keep as string
              let chatId: string | number;
              const chatIdNum = parseInt(chatIdStr, 10);
              if (!isNaN(chatIdNum) && String(chatIdNum) === chatIdStr) {
                chatId = chatIdNum;
              } else {
                chatId = chatIdStr;
              }

              console.log(`[Register] Sending Telegram notification to superadmin ${admin.user_id} (${admin.username}) with chatId: ${chatId} (type: ${typeof chatId})`);

              const result = await sendTelegramMessage({
                chatId: chatId,
                message: message,
                parseMode: 'Markdown',
                disableWebPagePreview: true,
              });

              if (result.ok) {
                console.log(`[Register] ✅ Successfully sent Telegram notification to superadmin ${admin.user_id} (${admin.username})`);
                return { success: true, adminId: admin.user_id };
              } else {
                console.error(`[Register] ❌ Telegram API returned error for superadmin ${admin.user_id} (${admin.username}):`, result.description || 'Unknown error');
                return { success: false, error: result.description || 'Telegram API error', adminId: admin.user_id };
              }
            } catch (error: any) {
              console.error(`[Register] ❌ Exception sending Telegram notification to superadmin ${admin.user_id} (${admin.username}):`, error.message || error);
              return { success: false, error: error.message || 'Unknown error', adminId: admin.user_id };
            }
          });

          // Wait for all notifications and log results
          const results = await Promise.allSettled(notificationPromises);
          const successCount = results.filter(r =>
            r.status === 'fulfilled' && r.value && r.value.success === true
          ).length;
          const failCount = results.length - successCount;

          if (successCount > 0) {
            console.log(`[Register] ✅ Sent Telegram notifications to ${successCount} superadmin(s)`);
          }
          if (failCount > 0) {
            console.warn(`[Register] ❌ Failed to send Telegram notifications to ${failCount} superadmin(s)`);
            results.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value && !result.value.success) {
                const admin = superadminResult.rows[index];
                console.warn(`[Register] Failed for superadmin ${admin.user_id} (${admin.username}): ${result.value.error}`);
              } else if (result.status === 'rejected') {
                const admin = superadminResult.rows[index];
                console.error(`[Register] Promise rejected for superadmin ${admin.user_id} (${admin.username}):`, result.reason);
              }
            });
          }
        }
      } catch (telegramError: any) {
        // Log error but don't fail registration
        console.error('[Register] ❌ Error in Telegram notification process:', telegramError.message || telegramError);
        console.error('[Register] Error stack:', telegramError.stack);
      }

      connection.release();

      // Send Welcome Email (Async - don't block response)
      try {
        console.log(`[Register] 📧 Attempting to send welcome email to: ${newUser.email}`);

        // Debug Env Vars (safe check)
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          console.error('[Register] ❌ SMTP Credentials missing in environment variables!');
        }

        const { EmailService } = await import('@/lib/email-service');
        const emailTemplate = EmailService.getWelcomeTemplate(newUser.username);

        // Fire and forget (or await if critical)
        await EmailService.sendEmail({
          to: newUser.email,
          subject: emailTemplate.subject,
          text: emailTemplate.text,
          html: emailTemplate.html
        });

        console.log(`[Register] ✅ Welcome email execution finished for ${newUser.email}`);
      } catch (emailError: any) {
        console.error('[Register] ❌ Failed to send welcome email:', emailError?.message || emailError);
        console.error('[Register] Stack:', emailError?.stack);
        // Don't fail registration just because email failed
      }

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

