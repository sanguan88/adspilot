/**
 * Subscription Monitor Worker
 * 
 * Memantau subscription yang akan expired dan mengirim notifikasi Telegram.
 * Juga mengupdate status subscription yang sudah expired.
 * 
 * Rekomendasi: Jalankan script ini 1x sehari (misal: jam 09:00 pagi).
 */

import { getDatabaseConnection } from '@/lib/db'
import { sendTelegramMessage } from '@/tele/service'
import { logger } from './logger'

interface ExpiringSubscription {
    user_id: string
    plan_id: string
    end_date: Date
    chatid_tele: string | null
    nama_lengkap: string
    days_remaining: number
}

/**
 * Format tanggal Indonesia (DD MMMM YYYY)
 */
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date)
}

/**
 * Cek dan kirim notifikasi subscription expired
 */
export async function checkExpiringSubscriptions() {
    const connection = await getDatabaseConnection()
    logger.info('Starting subscription check...')

    try {
        // 1. Update status expired untuk yang sudah lewat tanggal
        // end_date adalah hari terakhir aktif. Jadi kalau hari ini > end_date, berarti expired.
        const expiredUpdateResult = await connection.query(
            `UPDATE subscriptions 
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'active' AND end_date < CURRENT_DATE`
        )

        if (expiredUpdateResult.rowCount && expiredUpdateResult.rowCount > 0) {
            logger.info(`Updated ${expiredUpdateResult.rowCount} subscriptions to 'expired' status`)
        }

        // 2. Query subscription yang akan expired (H-3, H-1, H-0)
        // H-0 artinya berakhir hari ini
        const query = `
      SELECT 
        s.user_id, 
        s.plan_id, 
        s.end_date, 
        u.chatid_tele, 
        u.nama_lengkap,
        (s.end_date - CURRENT_DATE) as days_remaining
      FROM subscriptions s
      JOIN data_user u ON s.user_id = u.user_id
      WHERE s.status = 'active'
      AND (
        s.end_date = CURRENT_DATE + INTERVAL '3 days' OR
        s.end_date = CURRENT_DATE + INTERVAL '1 day' OR
        s.end_date = CURRENT_DATE
      )
    `

        const result = await connection.query(query)
        const subscriptions = result.rows as ExpiringSubscription[]

        logger.info(`Found ${subscriptions.length} subscriptions needing notification`)

        for (const sub of subscriptions) {
            if (!sub.chatid_tele) {
                logger.warn(`User ${sub.user_id} (${sub.nama_lengkap}) has no Telegram Chat ID. Skipping notification.`)
                continue
            }

            let message = ''
            const endDateStr = formatDate(new Date(sub.end_date))
            const renewalLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.adspilot.id'}/subscription`

            if (sub.days_remaining === 3) {
                // H-3 Warning
                message = `
⚠️ *Peringatan Subscription*

Halo ${sub.nama_lengkap},
Paket AdsPilot Anda (*${sub.plan_id}*) akan berakhir dalam *3 hari lagi* pada tanggal *${endDateStr}*.

Silakan lakukan perpanjangan agar layanan automation tidak terputus.

[Perpanjang Sekarang](${renewalLink})
`
            } else if (sub.days_remaining === 1) {
                // H-1 Urgent
                message = `
🚨 *URGENT: Berakhir Besok!*

Halo ${sub.nama_lengkap},
Masa aktif paket AdsPilot Anda tinggal *1 hari lagi* (Berakhir: ${endDateStr}).

Segera lakukan pembayaran untuk menghindari penghentian automation rule Anda.

[Perpanjang Sekarang](${renewalLink})
`
            } else if (sub.days_remaining === 0) {
                // H-0 Today
                message = `
🛑 *Paket Berakhir Hari Ini*

Halo ${sub.nama_lengkap},
Paket AdsPilot Anda berakhir hari ini (*${endDateStr}*).

Layanan automation akan dihentikan besok jika tidak diperpanjang.

[Perpanjang Sekarang](${renewalLink})
`
            }

            if (message) {
                try {
                    await sendTelegramMessage({
                        chatId: sub.chatid_tele,
                        message: message.trim(),
                        parseMode: 'Markdown'
                    })
                    logger.info(`Notification sent to user ${sub.user_id} (Days remaining: ${sub.days_remaining})`)
                } catch (error) {
                    logger.error(`Failed to send notification to user ${sub.user_id}`, error)
                }
            }
        }

    } catch (error) {
        logger.error('Error during subscription check', error)
    } finally {
        connection.release()
        logger.info('Subscription check completed')
    }
}

// Allow running directly
if (require.main === module) {
    checkExpiringSubscriptions()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err)
            process.exit(1)
        })
}
