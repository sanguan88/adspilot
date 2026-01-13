import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env and .env.local
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });
// .env.local overrides .env
dotenv.config({ path: envLocalPath, override: true });

async function main() {
    console.log('📧 Starting Email Test...');
    console.log('------------------------');

    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true' || true,
        user: process.env.SMTP_USER,
        fromDate: new Date().toISOString()
    };

    console.log('Configuration detected:');
    console.log(`Host: ${config.host}`);
    console.log(`Port: ${config.port}`);
    console.log(`User: ${config.user}`);
    console.log(`Pass: ${process.env.SMTP_PASS ? '******** (Set)' : 'MISSING ❌'}`);
    console.log('------------------------');

    if (!config.user || !process.env.SMTP_PASS) {
        console.error('❌ ERROR: SMTP credentials missing in .env file.');
        console.error('Please set SMTP_USER and SMTP_PASS.');
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: process.env.SMTP_PASS,
        },
    });

    console.log('🔄 Attempting to send email...');

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"AdsPilot Test" <${config.user}>`,
            to: config.user, // Send to self
            subject: 'AdsPilot SMTP Test 🚀',
            text: `This is a test email from your AdsPilot application.\n\nSent at: ${config.fromDate}\n\nIf you receive this, your SMTP configuration is correct! ✅`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0f172a;">AdsPilot SMTP Test 🚀</h2>
                    <p>Selamat! Konfigurasi email Anda sudah benar.</p>
                    <p><strong>Waktu kirim:</strong> ${config.fromDate}</p>
                    <hr/>
                    <p style="color: #64748b; font-size: 12px;">Dikirim dari script test-email.ts</p>
                </div>
            `
        });

        console.log('✅ SUCCESS! Email sent.');
        console.log(`Message ID: ${info.messageId}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        console.log('Check your inbox (and spam folder) for the test email.');

    } catch (error: any) {
        console.error('❌ FAILED to send email.');
        console.error('Error details:', error.message);
        if (error.code === 'EAUTH') {
            console.error('Hint: Check your App Password or Username.');
        }
    }
}

main().catch(console.error);
