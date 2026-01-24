-- =====================================================
-- Add Voucher Columns to Transactions Table
-- =====================================================
-- 
-- Migration script untuk menambahkan kolom voucher ke transactions table
-- Menyimpan voucher code dan discount amount yang digunakan
--
-- Created: 2025-12-21
-- =====================================================

-- Add voucher_code column (nullable, karena tidak semua transaksi pakai voucher)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50) NULL;

-- Add discount_amount column (nullable, hanya ada jika pakai voucher)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) NULL DEFAULT 0;

-- Add index untuk voucher_code untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_transactions_voucher_code ON transactions(voucher_code);

-- =====================================================
-- Notes
-- =====================================================
--
-- 1. voucher_code:
--    - Menyimpan kode voucher yang digunakan (reference ke vouchers.code)
--    - NULL jika transaksi tidak menggunakan voucher
--    - Bisa digunakan untuk join dengan vouchers table atau voucher_usage table
--
-- 2. discount_amount:
--    - Menyimpan jumlah discount yang diterapkan
--    - NULL atau 0 jika tidak pakai voucher
--    - Digunakan untuk display di invoice/receipt
--
-- 3. Calculation dengan voucher:
--    - base_amount = harga plan (sebelum discount)
--    - discount_amount = jumlah discount (dari voucher)
--    - base_amount_after_discount = base_amount - discount_amount
--    - ppn_amount = base_amount_after_discount × (ppn_percentage / 100)
--    - total_amount = base_amount_after_discount + ppn_amount + unique_code
--
-- =====================================================

