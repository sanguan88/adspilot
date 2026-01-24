import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { getDatabaseConnection } from '@/lib/db';
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors';
import { randomBytes } from 'crypto';
import { sendTelegramMessage } from '@/tele/service';

// Validasi email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate reset token
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null;
  
  try {
    const body = await request.json();
    const { email } = body;

    // Validasi input
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email harus diisi' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Get database connection
    try {
      connection = await getDatabaseConnection();
    } catch (dbError) {
      if (isDatabaseConnectionError(dbError)) {
        const sanitized = sanitizeErrorForLogging(dbError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [Forgot Password] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
        return NextResponse.json(
          {
            success: false,
            error: getGenericDatabaseErrorMessage(),
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    try {
      // Cek apakah email terdaftar dan ambil chatid_tele
      const userResult = await connection.query(
        'SELECT no, username, email, nama_lengkap, chatid_tele FROM data_user WHERE email = $1 AND status_user = $2',
        [email.trim().toLowerCase(), 'aktif']
      );

      // Untuk keamanan, selalu return success meskipun email tidak ditemukan
      // Ini mencegah user enumeration attack
      if (userResult.rows.length === 0) {
        connection.release();
        // Return success untuk mencegah user enumeration
        return NextResponse.json({
          success: true,
          message: 'Jika email terdaftar dan sudah terhubung dengan Telegram, link reset password akan dikirim ke Telegram Anda.',
        });
      }

      const user = userResult.rows[0];

      // Cek apakah user sudah setup Telegram
      if (!user.chatid_tele || user.chatid_tele.trim() === '') {
        connection.release();
        // Return success meskipun tidak ada Telegram untuk mencegah user enumeration
        return NextResponse.json({
          success: true,
          message: 'Jika email terdaftar dan sudah terhubung dengan Telegram, link reset password akan dikirim ke Telegram Anda.',
        });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token berlaku 1 jam

      // Simpan reset token ke database
      try {
        await connection.query(
          `UPDATE data_user 
           SET password_reset_token = $1, password_reset_expires = $2 
           WHERE no = $3`,
          [resetToken, expiresAt, user.no]
        );
      } catch (updateError: any) {
        // Jika kolom tidak ada, return error
        if (updateError.code === '42703') { // column does not exist
          connection.release();
          return NextResponse.json(
            { success: false, error: 'Fitur reset password belum dikonfigurasi dengan benar' },
            { status: 500 }
          );
        }
        throw updateError;
      }

      // Dapatkan base URL dari request
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

      // Kirim link reset password ke Telegram
      try {
        const telegramMessage = `🔐 *Reset Password*\n\n` +
          `Halo ${user.nama_lengkap || user.username},\n\n` +
          `Anda telah meminta reset password untuk akun Anda.\n\n` +
          `Klik link berikut untuk reset password Anda:\n` +
          `${resetLink}\n\n` +
          `⚠️ *Penting:*\n` +
          `• Link ini hanya berlaku selama 1 jam\n` +
          `• Jika Anda tidak meminta reset password, abaikan pesan ini\n` +
          `• Jangan bagikan link ini kepada siapapun`;

        await sendTelegramMessage({
          chatId: user.chatid_tele,
          message: telegramMessage,
          parseMode: 'Markdown',
          disableWebPagePreview: false, // Enable preview untuk link
        });
      } catch (telegramError: any) {
        // Log error tapi tetap return success untuk keamanan
        const sanitized = sanitizeErrorForLogging(telegramError);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [Forgot Password] Telegram error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
        
        // Tetap return success untuk mencegah user enumeration
        connection.release();
        return NextResponse.json({
          success: true,
          message: 'Jika email terdaftar dan sudah terhubung dengan Telegram, link reset password akan dikirim ke Telegram Anda.',
        });
      }

      connection.release();

      // Log di development untuk debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Forgot Password] Reset token for ${email}: ${resetToken}`);
        console.log(`[Forgot Password] Reset link: ${resetLink}`);
        console.log(`[Forgot Password] Telegram chat ID: ${user.chatid_tele}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar dan sudah terhubung dengan Telegram, link reset password akan dikirim ke Telegram Anda.',
        // Di development, kita bisa return token untuk testing
        ...(process.env.NODE_ENV === 'development' && {
          resetToken, // Hanya di development
          resetLink,
        }),
      });
    } catch (error: any) {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          // Ignore release error
        }
      }

      const sanitized = sanitizeErrorForLogging(error);
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [Forgot Password] Error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`);
      
      // Return success untuk mencegah user enumeration
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar dan sudah terhubung dengan Telegram, link reset password akan dikirim ke Telegram Anda.',
      });
    }
  } catch (error) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        // Ignore release error
      }
    }

    if (isDatabaseConnectionError(error)) {
      const sanitized = sanitizeErrorForLogging(error);
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

    // Return success untuk mencegah user enumeration
    return NextResponse.json({
      success: true,
      message: 'Jika email terdaftar dan sudah terhubung dengan Telegram, link reset password akan dikirim ke Telegram Anda.',
    });
  }
}

