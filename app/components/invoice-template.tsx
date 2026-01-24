import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Invoice data interface
export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  transactionId: string;

  // Company info
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;

  // Customer info
  customerName: string;
  customerEmail: string;

  // Plan info
  planName: string;
  planId: string;

  // Payment breakdown
  baseAmount: number;
  ppnPercentage: number;
  ppnAmount: number;
  uniqueCode: number;
  totalAmount: number;

  // Payment status
  paymentStatus: string;
  paymentMethod: string;
  paymentDate?: string;
}

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'right',
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 120,
    fontSize: 9,
    color: '#666',
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: '#1a1a1a',
    fontWeight: 'normal',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderBottom: '1px solid #e0e0e0',
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e0e0e0',
  },
  tableCell: {
    fontSize: 9,
    color: '#1a1a1a',
  },
  tableCellRight: {
    fontSize: 9,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  colDescription: {
    width: '50%',
  },
  colAmount: {
    width: '25%',
  },
  colTotal: {
    width: '25%',
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: '2px solid #1a1a1a',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: '#666',
  },
  totalValue: {
    fontSize: 10,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #e0e0e0',
    paddingHorizontal: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #e0e0e0',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
  },
});

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// Invoice Document Component
export const InvoiceDocument: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{invoice.companyName}</Text>
          {invoice.companyAddress && (
            <Text style={styles.companyInfo}>{invoice.companyAddress}</Text>
          )}
          {invoice.companyPhone && (
            <Text style={styles.companyInfo}>Telp: {invoice.companyPhone}</Text>
          )}
          {invoice.companyEmail && (
            <Text style={styles.companyInfo}>Email: {invoice.companyEmail}</Text>
          )}
        </View>

        {/* Invoice Title */}
        <Text style={styles.invoiceTitle}>INVOICE</Text>

        {/* Invoice Info Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>No. Invoice:</Text>
            <Text style={styles.value}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tanggal Invoice:</Text>
            <Text style={styles.value}>{formatDate(invoice.invoiceDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Transaction ID:</Text>
            <Text style={styles.value}>{invoice.transactionId}</Text>
          </View>
        </View>

        {/* Customer Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama:</Text>
            <Text style={styles.value}>{invoice.customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{invoice.customerEmail}</Text>
          </View>
        </View>

        {/* Payment Status */}
        {invoice.paymentStatus && (
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>
                {invoice.paymentStatus === 'paid' ? 'LUNAS' :
                  invoice.paymentStatus === 'pending' ? 'MENUNGGU PEMBAYARAN' :
                    invoice.paymentStatus === 'waiting_verification' ? 'MENUNGGU VERIFIKASI' :
                      invoice.paymentStatus.toUpperCase()}
              </Text>
            </View>
            {invoice.paymentDate && (
              <View style={styles.row}>
                <Text style={styles.label}>Tanggal Pembayaran:</Text>
                <Text style={styles.value}>{formatDate(invoice.paymentDate)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Metode Pembayaran:</Text>
              <Text style={styles.value}>
                {invoice.paymentMethod === 'manual' ? 'Transfer Bank Manual' :
                  invoice.paymentMethod === 'gateway' ? 'Payment Gateway' :
                    invoice.paymentMethod.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Deskripsi</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Jumlah</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colDescription]}>
              {invoice.planName}
            </Text>
            <Text style={[styles.tableCellRight, styles.colAmount]}>1</Text>
            <Text style={[styles.tableCellRight, styles.colTotal]}>
              {formatCurrency(invoice.baseAmount)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colDescription]}>
              PPN ({invoice.ppnPercentage}%)
            </Text>
            <Text style={[styles.tableCellRight, styles.colAmount]}>-</Text>
            <Text style={[styles.tableCellRight, styles.colTotal]}>
              {formatCurrency(invoice.ppnAmount)}
            </Text>
          </View>
          {invoice.uniqueCode > 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDescription]}>
                Kode Unik
              </Text>
              <Text style={[styles.tableCellRight, styles.colAmount]}>-</Text>
              <Text style={[styles.tableCellRight, styles.colTotal]}>
                {formatCurrency(invoice.uniqueCode)}
              </Text>
            </View>
          )}
        </View>

        {/* Total Section */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.baseAmount)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>PPN ({invoice.ppnPercentage}%):</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.ppnAmount)}
            </Text>
          </View>
          {invoice.uniqueCode > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Kode Unik:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.uniqueCode)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Pembayaran:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(invoice.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Terima kasih atas kepercayaan Anda menggunakan {invoice.companyName}</Text>
          <Text style={{ marginTop: 4 }}>
            Invoice ini adalah dokumen resmi dan sah sebagai bukti pembayaran
          </Text>
        </View>
      </Page>
    </Document>
  );
};

