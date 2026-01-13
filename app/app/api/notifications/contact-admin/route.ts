import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { sendTelegramMessage } from '@/tele/service';

/**
 * POST - Send notification to superadmin when user clicks "Hubungi Admin"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, email, nama_lengkap, transactionId, message } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID diperlukan' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    try {
      // Get user info if not provided
      let userInfo: any = null;
      if (!username || !email || !nama_lengkap) {
        const userResult = await connection.query(
          `SELECT user_id, username, email, nama_lengkap 
           FROM data_user 
           WHERE user_id = $1`,
          [userId]
        );
        if (userResult.rows.length > 0) {
          userInfo = userResult.rows[0];
        }
      } else {
        userInfo = { user_id: userId, username, email, nama_lengkap };
      }

      // Get transaction info if transactionId provided
      let transactionInfo: any = null;
      if (transactionId) {
        const transactionResult = await connection.query(
          `SELECT transaction_id, total_amount, unique_code, payment_status
           FROM transactions 
           WHERE transaction_id = $1`,
          [transactionId]
        );
        if (transactionResult.rows.length > 0) {
          transactionInfo = transactionResult.rows[0];
        }
      }

      // Get superadmin users
      const superadminResult = await connection.query(
        `SELECT user_id, chatid_tele, username 
         FROM data_user 
         WHERE role = 'superadmin' 
         AND chatid_tele IS NOT NULL 
         AND chatid_tele != '' 
         AND chatid_tele != 'null'`,
        []
      );

      console.log(`[Contact Admin] Found ${superadminResult.rows.length} superadmin(s) with chatid_tele`);

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
        const escapedTransactionId = transactionInfo ? escapeMarkdown(transactionInfo.transaction_id || '') : '';
        const escapedTotal = transactionInfo ? escapeMarkdown(formatPrice(parseFloat(transactionInfo.total_amount))) : '';
        const escapedUniqueCode = transactionInfo ? escapeMarkdown(String(transactionInfo.unique_code)) : '';
        const escapedStatus = transactionInfo ? escapeMarkdown(transactionInfo.payment_status || '') : '';
        const escapedMessage = message ? escapeMarkdown(message) : '';

        let notificationMessage = `📞 *User Menghubungi Admin*\n\n` +
          `👤 *User:*\n` +
          `• Username: ${escapedUsername}\n` +
          `• Nama: ${escapedNama}\n` +
          `• Email: ${escapedEmail}\n` +
          `• User ID: \`${escapedUserId}\`\n\n`;

        if (transactionInfo) {
          notificationMessage += `💰 *Transaksi:*\n` +
            `• Transaction ID: \`${escapedTransactionId}\`\n` +
            `• Total: ${escapedTotal}\n` +
            `• Kode Unik: ${escapedUniqueCode}\n` +
            `• Status: ${escapedStatus}\n\n`;
        }

        if (escapedMessage) {
          notificationMessage += `💬 *Pesan:*\n${escapedMessage}\n\n`;
        }

        notificationMessage += `📧 Email: ${escapedEmail}`;

        // Send notification to all superadmin users
        const notificationPromises = superadminResult.rows.map(async (admin: any) => {
          try {
            // Clean and validate chatId
            let chatIdRaw = admin.chatid_tele;
            if (chatIdRaw === null || chatIdRaw === undefined) {
              console.warn(`[Contact Admin] Superadmin ${admin.user_id} (${admin.username}) has null/undefined chatid_tele`);
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
              console.warn(`[Contact Admin] Superadmin ${admin.user_id} (${admin.username}) has invalid chatid_tele: "${chatIdRaw}"`);
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

            console.log(`[Contact Admin] Sending Telegram notification to superadmin ${admin.user_id} (${admin.username}) with chatId: ${chatId}`);

            const result = await sendTelegramMessage({
              chatId: chatId,
              message: notificationMessage,
              parseMode: 'Markdown',
              disableWebPagePreview: true,
            });

            if (result.ok) {
              console.log(`[Contact Admin] ✅ Successfully sent Telegram notification to superadmin ${admin.user_id} (${admin.username})`);
              return { success: true, adminId: admin.user_id };
            } else {
              console.error(`[Contact Admin] ❌ Telegram API returned error for superadmin ${admin.user_id} (${admin.username}):`, result.description || 'Unknown error');
              return { success: false, error: result.description || 'Telegram API error', adminId: admin.user_id };
            }
          } catch (error: any) {
            console.error(`[Contact Admin] ❌ Exception sending Telegram notification to superadmin ${admin.user_id} (${admin.username}):`, error.message || error);
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
          console.log(`[Contact Admin] ✅ Sent Telegram notifications to ${successCount} superadmin(s)`);
        }
        if (failCount > 0) {
          console.warn(`[Contact Admin] ❌ Failed to send Telegram notifications to ${failCount} superadmin(s)`);
        }

        connection.release();

        return NextResponse.json({
          success: true,
          message: 'Notifikasi telah dikirim ke admin',
        });
      } else {
        connection.release();
        return NextResponse.json({
          success: false,
          error: 'Tidak ada superadmin yang tersedia untuk menerima notifikasi',
        }, { status: 404 });
      }
    } catch (error: any) {
      connection.release();
      throw error;
    }
  } catch (error: any) {
    console.error('Contact admin notification error:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat mengirim notifikasi' },
      { status: 500 }
    );
  }
}

