import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { sendTelegramPhoto, sendTelegramMessage } from '@/tele/service';

/**
 * POST - Upload payment proof for a transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params;

    // Authenticate user (must be before formData parsing)
    let user;
    try {
      user = requireAuth(request);
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: 'Anda harus login terlebih dahulu' },
        { status: 401 }
      );
    }

    if (!transactionId || transactionId === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Transaction ID diperlukan' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File bukti pembayaran diperlukan' },
        { status: 400 }
      );
    }

    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File harus berupa gambar (JPG, PNG, atau WEBP)' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file maksimal 5MB' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    try {
      // Verify transaction exists and belongs to user
      const transactionResult = await connection.query(
        `SELECT id, user_id, payment_status, payment_proof_url
         FROM transactions 
         WHERE transaction_id = $1`,
        [transactionId]
      );

      if (transactionResult.rows.length === 0) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Transaksi tidak ditemukan' },
          { status: 404 }
        );
      }

      const transaction = transactionResult.rows[0];

      // Verify transaction belongs to user
      if (transaction.user_id !== user.userId) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Only allow upload if payment status is pending or waiting_confirmation (allow re-upload)
      if (!['pending', 'waiting_confirmation'].includes(transaction.payment_status)) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Bukti pembayaran hanya bisa diupload untuk transaksi dengan status pending atau waiting_confirmation' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filename = `proof-${transactionId}-${timestamp}-${randomString}.${fileExtension}`;

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'payment-proofs');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Save file
      const filePath = join(uploadsDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Generate public URL - use API route for better compatibility
      const publicUrl = `/api/uploads/payment-proofs/${filename}`;

      // Update transaction with proof URL and change status to waiting_confirmation
      await connection.query(
        `UPDATE transactions 
         SET payment_proof_url = $1,
             payment_status = 'waiting_confirmation',
             updated_at = NOW()
         WHERE transaction_id = $2`,
        [publicUrl, transactionId]
      );

      // Get user info for notification
      const userResult = await connection.query(
        `SELECT user_id, username, email, nama_lengkap 
         FROM data_user 
         WHERE user_id = $1`,
        [transaction.user_id]
      );

      const userInfo = userResult.rows[0];

      // Get transaction details for notification
      const transactionDetailResult = await connection.query(
        `SELECT transaction_id, total_amount, unique_code, base_amount, ppn_amount
         FROM transactions 
         WHERE transaction_id = $1`,
        [transactionId]
      );

      const transactionDetail = transactionDetailResult.rows[0];

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

        console.log(`[Payment Proof] Found ${superadminResult.rows.length} superadmin(s) with chatid_tele`);

        if (superadminResult.rows.length > 0 && userInfo) {
          const { escapeMarkdown } = await import('@/tele/utils');

          const formatPrice = (price: number) => {
            return new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(price);
          };

          // Escape all user input to prevent Markdown parsing errors
          const escapedUsername = escapeMarkdown(userInfo.username || '');
          const escapedNama = escapeMarkdown(userInfo.nama_lengkap || '');
          const escapedEmail = escapeMarkdown(userInfo.email || '');
          const escapedUserId = escapeMarkdown(userInfo.user_id || '');
          const escapedTransactionId = escapeMarkdown(transactionId || '');
          const escapedTotal = escapeMarkdown(formatPrice(parseFloat(transactionDetail.total_amount)));
          const escapedUniqueCode = escapeMarkdown(String(transactionDetail.unique_code));

          const caption = `📸 *Bukti Pembayaran Diupload*\n\n` +
            `👤 *User:*\n` +
            `• Username: ${escapedUsername}\n` +
            `• Nama: ${escapedNama}\n` +
            `• Email: ${escapedEmail}\n` +
            `• User ID: \`${escapedUserId}\`\n\n` +
            `💰 *Transaksi:*\n` +
            `• Transaction ID: \`${escapedTransactionId}\`\n` +
            `• Total: ${escapedTotal}\n` +
            `• Kode Unik: ${escapedUniqueCode}\n\n` +
            `📋 Status: *Menunggu Verifikasi*`;

          // Get full URL for the photo
          // Convert /uploads/... to /api/uploads/... for better compatibility
          let apiUrl = publicUrl;
          if (publicUrl.startsWith('/uploads/payment-proofs/')) {
            apiUrl = publicUrl.replace('/uploads/payment-proofs/', '/api/uploads/payment-proofs/');
          }

          let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
          if (!baseUrl) {
            // Try to get from VERCEL_URL or construct from request
            if (process.env.VERCEL_URL) {
              baseUrl = `https://${process.env.VERCEL_URL}`;
            } else {
              // Use default production URL
              baseUrl = 'https://app.adspilot.id';
            }
          }

          // Construct photo URL using API route
          const photoUrl = `${baseUrl}${apiUrl}`;

          console.log(`[Payment Proof] Photo URL: ${photoUrl}`);

          // Send notification with photo to all superadmin users
          const notificationPromises = superadminResult.rows.map(async (admin: any) => {
            try {
              // Clean and validate chatId
              let chatIdRaw = admin.chatid_tele;
              if (chatIdRaw === null || chatIdRaw === undefined) {
                console.warn(`[Payment Proof] Superadmin ${admin.user_id} (${admin.username}) has null/undefined chatid_tele`);
                return { success: false, error: 'chatid_tele is null/undefined', adminId: admin.user_id };
              }

              // Convert to string and clean
              let chatIdStr = String(chatIdRaw).trim();

              // Remove any non-digit characters except minus sign at start
              if (chatIdStr.startsWith('-')) {
                chatIdStr = '-' + chatIdStr.substring(1).replace(/\D/g, '');
              } else {
                chatIdStr = chatIdStr.replace(/\D/g, '');
              }

              if (!chatIdStr || chatIdStr === '' || chatIdStr === 'null' || chatIdStr === 'undefined') {
                console.warn(`[Payment Proof] Superadmin ${admin.user_id} (${admin.username}) has invalid chatid_tele: "${chatIdRaw}"`);
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

              console.log(`[Payment Proof] Sending Telegram notification to superadmin ${admin.user_id} (${admin.username}) with chatId: ${chatId}`);

              let result;
              let photoSent = false;

              // Try to send photo first
              try {
                result = await sendTelegramPhoto(
                  chatId,
                  photoUrl,
                  caption,
                  'Markdown'
                );

                if (result.ok) {
                  photoSent = true;
                  console.log(`[Payment Proof] ✅ Photo sent successfully`);
                } else {
                  throw new Error(result.description || 'Telegram API error');
                }
              } catch (photoError: any) {
                console.warn(`[Payment Proof] Failed to send photo (${photoError.message}), sending text with image link instead`);

                // Add image link to caption if photo fails
                const captionWithLink = caption + `\n\n📎 *Link Bukti Pembayaran:*\n${photoUrl}`;

                // Fallback to text message with image link
                const { sendTelegramMessage } = await import('@/tele/service');
                result = await sendTelegramMessage({
                  chatId: chatId,
                  message: captionWithLink,
                  parseMode: 'Markdown',
                  disableWebPagePreview: false, // Enable preview so link shows nicely
                });
              }

              if (result.ok) {
                console.log(`[Payment Proof] ✅ Successfully sent Telegram notification with photo to superadmin ${admin.user_id} (${admin.username})`);
                return { success: true, adminId: admin.user_id };
              } else {
                console.error(`[Payment Proof] ❌ Telegram API returned error for superadmin ${admin.user_id} (${admin.username}):`, result.description || 'Unknown error');
                return { success: false, error: result.description || 'Telegram API error', adminId: admin.user_id };
              }
            } catch (error: any) {
              console.error(`[Payment Proof] ❌ Exception sending Telegram notification to superadmin ${admin.user_id} (${admin.username}):`, error.message || error);
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
            console.log(`[Payment Proof] ✅ Sent Telegram notifications with photo to ${successCount} superadmin(s)`);
          }
          if (failCount > 0) {
            console.warn(`[Payment Proof] ❌ Failed to send Telegram notifications to ${failCount} superadmin(s)`);
          }
        }
      } catch (telegramError: any) {
        // Log error but don't fail upload
        console.error('[Payment Proof] ❌ Error in Telegram notification process:', telegramError.message || telegramError);
      }

      connection.release();

      return NextResponse.json({
        success: true,
        message: 'Bukti pembayaran berhasil diupload',
        data: {
          proofUrl: publicUrl,
        },
      });
    } catch (error: any) {
      connection.release();
      throw error;
    }
  } catch (error: any) {
    console.error('Upload payment proof error:', error);

    // Handle authentication error specifically
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: 'Anda harus login terlebih dahulu' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat upload bukti pembayaran' },
      { status: 500 }
    );
  }
}

