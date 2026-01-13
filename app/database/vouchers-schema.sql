-- =====================================================
-- Vouchers Database Schema
-- =====================================================
-- 
-- Schema untuk menyimpan voucher/promo code untuk subscription
-- Support untuk percentage discount dan fixed amount discount
--
-- Created: 2025-12-21
-- =====================================================

-- =====================================================
-- 1. Vouchers Table
-- =====================================================
-- Menyimpan data voucher/promo code

CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- Voucher code (custom, uppercase)
    name VARCHAR(255) NOT NULL, -- Nama voucher (untuk admin reference)
    description TEXT NULL, -- Deskripsi voucher
    
    -- Discount type and value
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')), -- 'percentage' atau 'fixed'
    discount_value DECIMAL(15, 2) NOT NULL, -- Nilai discount (percentage: 10.00 = 10%, fixed: 50000 = Rp 50.000)
    
    -- Validity
    start_date TIMESTAMP NULL, -- Tanggal mulai berlaku (NULL = berlaku segera)
    expiry_date TIMESTAMP NOT NULL, -- Tanggal kadaluarsa voucher
    
    -- Status
    is_active BOOLEAN DEFAULT true, -- Aktif/nonaktif (admin bisa deactivate tanpa delete)
    
    -- Usage limits (NULL = unlimited)
    max_usage_per_user INTEGER NULL, -- Max penggunaan per user (NULL = unlimited)
    max_total_usage INTEGER NULL, -- Max total penggunaan voucher (NULL = unlimited)
    
    -- Restrictions
    applicable_plans TEXT[] NULL, -- Array of plan_ids yang bisa pakai voucher (NULL = semua plan)
    minimum_purchase DECIMAL(15, 2) NULL, -- Minimum purchase amount (NULL = tidak ada minimum)
    maximum_discount DECIMAL(15, 2) NULL, -- Maximum discount amount untuk percentage type (NULL = tidak ada limit)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NULL, -- Admin user_id yang membuat voucher
    updated_by VARCHAR(255) NULL, -- Admin user_id yang terakhir update voucher
    notes TEXT NULL -- Catatan admin
);

-- =====================================================
-- 2. Voucher Usage Table
-- =====================================================
-- Tracking penggunaan voucher per transaction

CREATE TABLE IF NOT EXISTS voucher_usage (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER NOT NULL, -- Reference ke vouchers.id
    voucher_code VARCHAR(50) NOT NULL, -- Snapshot voucher code (untuk referensi cepat)
    transaction_id VARCHAR(50) NOT NULL, -- Reference ke transactions.transaction_id
    user_id VARCHAR(255) NOT NULL, -- Reference ke data_user.user_id
    
    -- Discount applied
    discount_type VARCHAR(20) NOT NULL, -- Snapshot: 'percentage' atau 'fixed'
    discount_value DECIMAL(15, 2) NOT NULL, -- Snapshot: nilai discount saat digunakan
    discount_amount DECIMAL(15, 2) NOT NULL, -- Jumlah discount yang diterapkan (calculated)
    
    -- Transaction snapshot (untuk audit)
    plan_id VARCHAR(50) NOT NULL, -- Plan yang dibeli
    base_amount DECIMAL(15, 2) NOT NULL, -- Base amount sebelum discount
    total_amount_before_discount DECIMAL(15, 2) NOT NULL, -- Total sebelum discount (base + ppn + unique_code)
    total_amount_after_discount DECIMAL(15, 2) NOT NULL, -- Total setelah discount
    
    -- Metadata
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Waktu voucher digunakan
);

-- =====================================================
-- 3. Indexes
-- =====================================================

-- Indexes untuk vouchers table
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_is_active ON vouchers(is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_expiry_date ON vouchers(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_start_date ON vouchers(start_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_at ON vouchers(created_at);

-- Indexes untuk voucher_usage table
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher_id ON voucher_usage(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher_code ON voucher_usage(voucher_code);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_transaction_id ON voucher_usage(transaction_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_user_id ON voucher_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_used_at ON voucher_usage(used_at);

-- =====================================================
-- 4. Foreign Key Constraints (Optional)
-- =====================================================

-- Foreign key untuk voucher_usage.voucher_id
-- ALTER TABLE voucher_usage ADD CONSTRAINT fk_voucher_usage_voucher_id
--     FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE RESTRICT;

-- Foreign key untuk voucher_usage.transaction_id (jika ingin strict)
-- ALTER TABLE voucher_usage ADD CONSTRAINT fk_voucher_usage_transaction_id
--     FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE RESTRICT;

-- =====================================================
-- Notes
-- =====================================================
--
-- 1. Voucher Code:
--    - Harus unique
--    - Case-insensitive (disimpan uppercase untuk konsistensi)
--    - Custom code (admin input)
--
-- 2. Discount Type:
--    - 'percentage': discount_value = persentase (10.00 = 10%)
--    - 'fixed': discount_value = jumlah tetap (50000 = Rp 50.000)
--
-- 3. Discount Calculation (Indonesia Standard):
--    - Discount dihitung dari base_amount (sebelum PPN)
--    - base_amount_after_discount = base_amount - discount_amount
--    - ppn_amount = base_amount_after_discount × (ppn_percentage / 100)
--    - total_amount = base_amount_after_discount + ppn_amount + unique_code
--
-- 4. Usage Limits:
--    - max_usage_per_user: NULL = unlimited per user
--    - max_total_usage: NULL = unlimited total usage
--    - Untuk unlimited usage, kedua field di-set NULL
--
-- 5. Applicable Plans:
--    - TEXT[] array: ['1-month', '3-month', '6-month']
--    - NULL = berlaku untuk semua plan
--
-- 6. Maximum Discount (untuk percentage type):
--    - Contoh: discount_value = 50% (50.00), maximum_discount = 200000
--    - Jika base_amount = 1000000, discount seharusnya = 500000
--    - Tapi karena max_discount = 200000, discount yang diterapkan = 200000
--
-- 7. Voucher Usage Tracking:
--    - Setiap penggunaan voucher dicatat di voucher_usage table
--    - Menyimpan snapshot data untuk audit trail
--    - Bisa digunakan untuk analytics dan reporting
--
-- =====================================================

