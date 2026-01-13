-- =====================================================
-- Transactions Database Schema
-- =====================================================
-- 
-- Schema untuk menyimpan transaksi pembayaran user
-- Termasuk kode unik dan perhitungan PPN
--
-- Created: 2025-01-XX
-- =====================================================

-- =====================================================
-- 1. Transactions Table
-- =====================================================
-- Menyimpan transaksi pembayaran dari user

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL, -- Unique transaction ID (UUID atau custom)
    user_id VARCHAR(255) NOT NULL, -- Reference ke data_user.user_id
    plan_id VARCHAR(50) NOT NULL, -- ID paket (1-month, 3-month, 6-month)
    
    -- Pricing breakdown
    base_amount DECIMAL(15, 2) NOT NULL, -- Harga paket sebelum PPN
    ppn_percentage DECIMAL(5, 2) DEFAULT 11.00, -- Persentase PPN (default 11%)
    ppn_amount DECIMAL(15, 2) NOT NULL, -- Jumlah PPN
    unique_code INTEGER NOT NULL, -- Kode unik 3 digit (100-999)
    total_amount DECIMAL(15, 2) NOT NULL, -- Total yang harus dibayar (base + ppn + unique_code)
    
    -- Payment info
    payment_method VARCHAR(20) DEFAULT 'manual', -- 'manual' atau 'gateway'
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'rejected', 'expired', 'cancelled'
    bank_account_id INTEGER NULL, -- Reference ke bank_accounts.id (jika manual transfer)
    
    -- Payment confirmation
    payment_proof_url VARCHAR(500) NULL, -- URL bukti transfer (jika ada)
    payment_confirmed_at TIMESTAMP NULL, -- Waktu konfirmasi pembayaran
    payment_confirmed_by INTEGER NULL, -- Admin yang konfirmasi (user_id admin)
    payment_notes TEXT NULL, -- Catatan admin saat konfirmasi
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL -- Waktu kadaluarsa transaksi (opsional)
);

-- Indexes untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_unique_code ON transactions(unique_code);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Foreign key constraints (optional, jika ingin strict referential integrity)
-- ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user_id 
--     FOREIGN KEY (user_id) REFERENCES data_user(user_id) ON DELETE CASCADE;
-- ALTER TABLE transactions ADD CONSTRAINT fk_transactions_bank_account_id 
--     FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- =====================================================
-- 2. Helper Function untuk Generate Unique Code
-- =====================================================
-- Function untuk generate kode unik yang belum digunakan
-- (Akan di-handle di application code, bukan di database)

-- =====================================================
-- Notes
-- =====================================================
-- 
-- 1. Transaction ID:
--    - Unique identifier untuk setiap transaksi
--    - Bisa menggunakan UUID atau format custom
--
-- 2. Unique Code:
--    - 3 digit angka (100-999)
--    - Digunakan untuk memudahkan identifikasi pembayaran
--    - Harus unik untuk transaksi yang masih pending
--    - Ditambahkan ke total_amount
--
-- 3. PPN Calculation:
--    - PPN = base_amount × (ppn_percentage / 100)
--    - Total = base_amount + ppn_amount + unique_code
--    - Contoh: base=349000, ppn=11%, unique=123
--      ppn_amount = 349000 × 0.11 = 38390
--      total = 349000 + 38390 + 123 = 387513
--
-- 4. Payment Status:
--    - pending: Menunggu pembayaran
--    - paid: Sudah dibayar dan dikonfirmasi
--    - rejected: Pembayaran ditolak (invalid/tidak sesuai)
--    - expired: Transaksi kadaluarsa
--    - cancelled: Transaksi dibatalkan (user request)
--
-- 5. Payment Method:
--    - manual: Transfer bank manual
--    - gateway: Payment gateway (Midtrans, Xendit, dll)
--
-- 6. Expires At:
--    - Opsional, untuk set waktu kadaluarsa transaksi
--    - Default bisa 24 jam atau 7 hari dari created_at
--
-- =====================================================

