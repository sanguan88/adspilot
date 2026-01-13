import { format } from 'date-fns'

export interface EmailOptions {
    to: string
    subject: string
    text?: string
    html?: string
}

/**
 * Admin Email Service
 * Handles system notifications sent by Admin actions.
 * Currently log-only.
 */
export class EmailService {
    // SMTP Config Placeholder
    private static smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || '"AdsPilot Admin" <admin@adspilot.id>',
    }

    static async sendEmail(options: EmailOptions): Promise<boolean> {
        const { to, subject, text } = options

        // Authorization Check for SMTP usage would go here

        // Mock Log
        console.log('=================================================')
        console.log(`📧 [ADMIN EMAIL SENT]`)
        console.log(`To: ${to}`)
        console.log(`Subject: ${subject}`)
        console.log(`Time: ${new Date().toISOString()}`)
        console.log('-------------------------------------------------')
        if (text) console.log(`[Body]:\n${text}\n`)
        console.log('=================================================')

        return true
    }

    // --- Admin Specific Templates ---

    /**
     * Account Approval Email
     */
    static getAccountApprovedTemplate(username: string, loginUrl: string = 'https://app.adspilot.id/auth/login') {
        return {
            subject: 'Akun AdsPilot Anda Telah Disetujui! ✅',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Selamat, ${username}!</h1>
          <p>Akun Anda telah ditinjau dan disetujui oleh tim Admin kami.</p>
          <p>Sekarang Anda memiliki akses penuh ke fitur AdsPilot sesuai paket Anda.</p>
          <div style="margin: 20px 0;">
            <a href="${loginUrl}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Masuk Sekarang</a>
          </div>
        </div>
      `,
            text: `Selamat ${username}, akun Anda telah disetujui Admin.\nSilakan login di: ${loginUrl}`
        }
    }

    /**
     * Subscription Activation Email
     */
    static getSubscriptionActivatedTemplate(username: string, planName: string, expiryDate: Date) {
        const formattedDate = format(expiryDate, 'dd MMMM yyyy')
        return {
            subject: `Paket ${planName} Aktif! 🚀`,
            html: `
        <div>
          <h1>Paket Langganan Aktif</h1>
          <p>Halo ${username},</p>
          <p>Admin telah mengaktifkan paket <strong>${planName}</strong> untuk akun Anda.</p>
          <p>Masa aktif hingga: <strong>${formattedDate}</strong></p>
          <p>Selamat menikmati fitur premium AdsPilot!</p>
        </div>
      `,
            text: `Halo ${username}, paket ${planName} Anda telah diaktifkan oleh Admin. Berlaku hingga ${formattedDate}.`
        }
    }
}
