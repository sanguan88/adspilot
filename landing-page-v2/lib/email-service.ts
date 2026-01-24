import { format } from 'date-fns'

export interface EmailOptions {
    to: string
    subject: string
    text?: string
    html?: string
}

import nodemailer from 'nodemailer'

/**
 * Email Service
 * Implements real email sending via SMTP (Nodemailer).
 */
export class EmailService {
    private static isProduction = process.env.NODE_ENV === 'production'

    // SMTP Configuration
    private static smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'), // 465 for SSL, 587 for TLS
        secure: process.env.SMTP_SECURE === 'true' || true, // Default true for 465
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || '"AdsPilot" <adspilot.id@gmail.com>',
    }

    /**
     * Send an email
     */
    static async sendEmail(options: EmailOptions): Promise<boolean> {
        const { to, subject, text, html } = options

        // Check if we have SMTP config
        if (!this.smtpConfig.user || !this.smtpConfig.pass) {
            console.warn('[EmailService] SMTP credentials missing in .env. Falling back to log.')
            this.logEmail(options)
            return false
        }

        try {
            const transporter = nodemailer.createTransport({
                host: this.smtpConfig.host,
                port: this.smtpConfig.port,
                secure: this.smtpConfig.secure,
                auth: {
                    user: this.smtpConfig.user,
                    pass: this.smtpConfig.pass,
                },
            })

            const info = await transporter.sendMail({
                from: this.smtpConfig.from,
                to,
                subject,
                text,
                html,
            })

            console.log(`[EmailService] Email sent: ${info.messageId}`)
            return true

        } catch (error) {
            console.error('[EmailService] Failed to send email:', error)
            return false
        }
    }

    private static logEmail(options: EmailOptions) {
        // Mock Send - Log to console
        console.log('=================================================')
        console.log(`📧 [MOCK EMAIL SENT]`)
        console.log(`To: ${options.to}`)
        console.log(`From: ${this.smtpConfig.from}`)
        console.log(`Subject: ${options.subject}`)
        console.log(`Timestamp: ${new Date().toISOString()}`)
        console.log('-------------------------------------------------')
        if (options.text) console.log(`[Text Body]:\n${options.text}\n`)
        console.log('=================================================')
    }

    /**
     * Welcome Email Template
     */
    static getWelcomeTemplate(username: string, loginUrl: string = 'https://app.adspilot.id/auth/login') {
        const primaryColor = '#0F172A' // Slate 900
        const accentColor = '#10B981'  // Emerald 500

        return {
            subject: 'Selamat Datang di Keluarga AdsPilot! 🚀',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            .btn {
              display: inline-block;
              padding: 12px 24px;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              text-align: center;
              transition: all 0.3s ease;
            }
            .btn:hover {
              opacity: 0.9;
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">AdsPilot</h1>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 30px; color: #334155; line-height: 1.6;">
              <h2 style="color: ${primaryColor}; margin-top: 0;">Halo, ${username}! 👋</h2>
              
              <p>Selamat datang di <strong>AdsPilot</strong>. Kami sangat senang Anda telah bergabung dengan komunitas kami.</p>
              
              <p>Akun Anda kini telah aktif! AdsPilot siap membantu Anda mengotomatiskan dan mengoptimalkan iklan Shopee Anda agar lebih efisien dan menguntungkan.</p>
              
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid ${accentColor};">
                <p style="margin: 0; font-size: 14px; color: #64748b;">Username Anda:</p>
                <p style="margin: 5px 0 0; font-weight: bold; color: ${primaryColor}; font-size: 18px;">${username}</p>
              </div>

              <p>Siap untuk memulai? Klik tombol di bawah ini untuk mengakses dashboard Anda:</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${loginUrl}" class="btn" style="background-color: ${primaryColor};">Masuk ke Dashboard</a>
              </div>
              
              <p style="font-size: 14px;">Jika Anda memiliki pertanyaan atau butuh bantuan, jangan ragu untuk membalas email ini atau menghubungi tim support kami melalui Telegram.</p>
              
              <p style="margin-top: 30px;">Salam Sukses,<br><strong>Tim AdsPilot</strong></p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} AdsPilot. All rights reserved.</p>
              <p style="margin: 5px 0;">Anda menerima email ini karena telah mendaftar di AdsPilot.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `Halo ${username}!\n\nSelamat datang di AdsPilot. Kami sangat senang Anda bergabung.\n\nAkun Anda: ${username}\n\nSilakan login ke dashboard melalu link berikut:\n${loginUrl}\n\nSalam Sukses,\nTim AdsPilot`
        }
    }

    /**
     * Payment Confirmation Template
     */
    static getPaymentSuccessTemplate(username: string, planName: string, amount: number, invoiceId: string) {
        const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

        return {
            subject: `Pembayaran Berhasil - ${invoiceId} ✅`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Pembayaran Diterima!</h1>
          <p>Halo ${username},</p>
          <p>Terima kasih! Pembayaran Anda untuk berlangganan <strong>${planName}</strong> telah kami terima.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Invoice ID:</strong> ${invoiceId}</p>
            <p style="margin: 5px 0;"><strong>Paket:</strong> ${planName}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> ${formattedAmount}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> LUNAS</p>
          </div>

          <p>Layanan Anda sudah aktif dan siap digunakan.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">Simpan email ini sebagai bukti pembayaran Anda.</p>
        </div>
      `,
            text: `Pembayaran Diterima!\n\nHalo ${username},\nPembayaran untuk ${planName} sebesar ${formattedAmount} telah berhasil.\nInvoice: ${invoiceId}\n\nTerima kasih atas kepercayaan Anda.`
        }
    }

    /**
     * Reset Password Template
     */
    static getResetPasswordTemplate(username: string, resetLink: string) {
        return {
            subject: 'Reset Password AdsPilot 🔐',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Permintaan Reset Password</h1>
          <p>Halo ${username},</p>
          <p>Kami menerima permintaan untuk mereset password akun AdsPilot Anda.</p>
          <p>Klik tombol di bawah ini untuk membuat password baru (link berlaku selama 1 jam):</p>
          
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password Saya</a>
          </div>

          <p>Jika tombol tidak berfungsi, salin link berikut:</p>
          <p>${resetLink}</p>
          
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">Email ini dikirim otomatis oleh sistem AdsPilot.</p>
        </div>
      `,
            text: `Reset Password AdsPilot\n\nHalo ${username},\n\nKlik link berikut untuk reset password Anda:\n${resetLink}\n\nLink berlaku 1 jam. Jika bukan Anda, abaikan email ini.`
        }
    }
}
