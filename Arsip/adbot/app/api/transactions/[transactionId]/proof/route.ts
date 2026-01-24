import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

      // Only allow upload if payment status is pending or waiting_verification (allow re-upload)
      if (!['pending', 'waiting_verification'].includes(transaction.payment_status)) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Bukti pembayaran hanya bisa diupload untuk transaksi dengan status pending atau waiting_verification' },
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

      // Generate public URL
      const publicUrl = `/uploads/payment-proofs/${filename}`;

      // Update transaction with proof URL and change status to waiting_verification
      await connection.query(
        `UPDATE transactions 
         SET payment_proof_url = $1,
             payment_status = 'waiting_verification',
             updated_at = NOW()
         WHERE transaction_id = $2`,
        [publicUrl, transactionId]
      );

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

