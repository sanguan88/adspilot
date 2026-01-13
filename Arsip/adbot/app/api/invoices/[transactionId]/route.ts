import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { InvoiceDocument, InvoiceData } from '@/components/invoice-template';

// Plan name mapping
const planNameMap: { [key: string]: string } = {
  '1-month': 'Paket 1 Bulan',
  '3-month': 'Paket 3 Bulan',
  '6-month': 'Paket 6 Bulan',
};

// Company info (can be moved to config/env)
const COMPANY_INFO = {
  name: 'Shopee Ads Expert',
  address: 'Indonesia',
  phone: '',
  email: 'support@shopadexpert.com',
};

/**
 * GET - Generate invoice PDF for a transaction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  let connection = null;
  try {
    const { transactionId } = params;

    if (!transactionId || transactionId === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Transaction ID diperlukan' },
        { status: 400 }
      );
    }

    // Authenticate user (required)
    let user;
    try {
      user = requireAuth(request);
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    connection = await getDatabaseConnection();

    // Get transaction data
    const transactionResult = await connection.query(
      `SELECT 
        t.transaction_id, t.user_id, t.plan_id,
        t.base_amount, t.ppn_percentage, t.ppn_amount, t.unique_code, t.total_amount,
        t.payment_method, t.payment_status, t.payment_confirmed_at,
        t.created_at,
        u.username, u.email, u.nama_lengkap
      FROM transactions t
      INNER JOIN data_user u ON t.user_id = u.user_id
      WHERE t.transaction_id = $1`,
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

    // Verify ownership (if user is authenticated)
    if (user && transaction.user_id !== user.userId) {
      // Check if user is admin
      const adminCheck = await connection.query(
        `SELECT role FROM data_user WHERE user_id = $1`,
        [user.userId]
      );
      
      if (adminCheck.rows.length === 0 || 
          !['admin', 'superadmin'].includes(adminCheck.rows[0].role)) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    connection.release();

    // Prepare invoice data
    const invoiceData: InvoiceData = {
      invoiceNumber: `INV-${transaction.transaction_id}`,
      invoiceDate: transaction.created_at,
      transactionId: transaction.transaction_id,
      
      companyName: COMPANY_INFO.name,
      companyAddress: COMPANY_INFO.address,
      companyPhone: COMPANY_INFO.phone,
      companyEmail: COMPANY_INFO.email,
      
      customerName: transaction.nama_lengkap || transaction.username || 'Customer',
      customerEmail: transaction.email,
      
      planName: planNameMap[transaction.plan_id] || transaction.plan_id,
      planId: transaction.plan_id,
      
      baseAmount: parseFloat(transaction.base_amount),
      ppnPercentage: parseFloat(transaction.ppn_percentage),
      ppnAmount: parseFloat(transaction.ppn_amount),
      uniqueCode: transaction.unique_code || 0,
      totalAmount: parseFloat(transaction.total_amount),
      
      paymentStatus: transaction.payment_status,
      paymentMethod: transaction.payment_method,
      paymentDate: transaction.payment_confirmed_at || undefined,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoiceDocument, { invoice: invoiceData })
    );

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${transaction.transaction_id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        // Ignore release error
      }
    }

    console.error('Generate invoice error:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat generate invoice' },
      { status: 500 }
    );
  }
}

