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

    // 1. Check user existence
    // We select user_id and username to personalise email
    const result = await connection.query(
      `SELECT user_id, username, email FROM data_user 
       WHERE email = $1 
       AND status_user IN ('aktif', 'active', 'pending_payment')`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    // 2. If user exists, generate token and send email
    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to DB
      await connection.query(
        `UPDATE data_user 
         SET reset_password_token = $1, reset_password_expires = $2 
         WHERE user_id = $3`,
        [token, expiresAt.toISOString(), user.user_id]
      );

      // Generate Reset Link
      // Assuming NEXT_PUBLIC_APP_URL is set, otherwise fallback to request origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

      // Send Email
      const emailTemplate = EmailService.getResetPasswordTemplate(user.username, resetLink);

      // Fire notification asynchronously (don't wait heavily)
      await EmailService.sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      });

      console.log(`[ForgotPassword] Reset link sent to ${user.email}`);
    } else {
      // Security: Don't reveal if user exists or not, but log it internally
      console.warn(`[ForgotPassword] Request for non-existent/inactive email: ${email}`);
    }

    // 3. Always return success to prevent enumeration
    return NextResponse.json({
      success: true,
      message: 'Jika email terdaftar, link reset password telah dikirim.'
    });

  } catch (error: any) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
