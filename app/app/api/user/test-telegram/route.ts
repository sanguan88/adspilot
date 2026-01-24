import { NextRequest, NextResponse } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getTelegramStatus } from '@/tele/status'
import { sendTelegramMessage } from '@/tele/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const user = await requireActiveStatus(request)

        const statusResult = await getTelegramStatus(user.userId)

        if (!statusResult.success || !statusResult.data?.hasTelegram || !statusResult.data?.chatid_tele) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Telegram belum terhubung. Silakan hubungkan Telegram terlebih dahulu.',
                },
                { status: 400 }
            )
        }

        const chatId = statusResult.data.chatid_tele
        const message = `🧪 *Test Notifikasi AdsPilot*\n\nHalo ${user.username || 'User'}!\n\nJika Anda menerima pesan ini, berarti Bot Notifikasi AdsPilot sudah berfungsi dengan benar untuk akun Anda.\n\n*Chat ID:* \`${chatId}\`\n*Waktu:* ${new Date().toLocaleString('id-ID')}`

        const sendResult = await sendTelegramMessage({
            chatId,
            message,
            parseMode: 'Markdown',
        })

        if (!sendResult.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: sendResult.description || 'Gagal mengirim pesan test ke Telegram.',
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Notifikasi test berhasil dikirim!',
        })
    } catch (error: any) {
        console.error('[Test Telegram API] Exception:', error?.message || error)

        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Terjadi kesalahan saat mencoba mengirim notifikasi test.',
            },
            { status: 500 }
        )
    }
}
