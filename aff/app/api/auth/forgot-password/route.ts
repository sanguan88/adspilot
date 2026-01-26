import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { EmailService } from '@/lib/email-service';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    let connection;

    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email wajib diisi' },
                { status: 400 }
            );
        }

        connection = await getDatabaseConnection();

        // 1. Check affiliate existence
        const result = await connection.query(
            `SELECT affiliate_id, name, email FROM affiliates 
       WHERE email = $1 
       AND status = 'active'`,
            [email.trim().toLowerCase()]
        );

        const affiliate = result.rows[0];

        // 2. If affiliate exists, generate token and send email
        if (affiliate) {
            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

            // Save token to DB
            await connection.query(
                `UPDATE affiliates 
         SET reset_password_token = $1, reset_password_expires = $2 
         WHERE affiliate_id = $3`,
                [token, expiresAt.toISOString(), affiliate.affiliate_id]
            );

            // Generate Reset Link
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
            const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

            // Send Email
            const emailTemplate = EmailService.getResetPasswordTemplate(affiliate.name, resetLink);

            await EmailService.sendEmail({
                to: affiliate.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
            });

            console.log(`[ForgotPassword][Affiliate] Reset link sent to ${affiliate.email}`);
        } else {
            // Security: Don't reveal if affiliate exists or not
            console.warn(`[ForgotPassword][Affiliate] Request for non-existent/inactive email: ${email}`);
        }

        // 3. Always return success to prevent enumeration
        return NextResponse.json({
            success: true,
            message: 'Jika email terdaftar, link reset password telah dikirim.'
        });

    } catch (error: any) {
        console.error('[ForgotPassword][Affiliate] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan sistem' },
            { status: 500 }
        );
    } finally {
        if (connection) connection.release();
    }
}
