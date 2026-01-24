-- =====================================================
-- Account Addons Database Schema
-- =====================================================
-- 
-- Schema untuk menyimpan addon toko tambahan yang dibeli user
-- Addon mengikuti durasi subscription aktif (pro-rata)
--
-- Created: 2026-01-15
-- =====================================================

-- =====================================================
-- 1. Account Addons Table
-- =====================================================
-- Menyimpan addon yang dibeli user (extra accounts/stores)

CREATE TABLE IF NOT EXISTS account_addons (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Reference ke data_user.user_id
    
    -- Addon details
    addon_type VARCHAR(50) DEFAULT 'extra_accounts', -- Type of addon
    quantity INTEGER DEFAULT 1, -- Jumlah toko tambahan
    
    -- Pricing (snapshot saat pembelian)
    price_per_unit DECIMAL(15, 2) NOT NULL, -- Harga per toko per bulan (Rp 99.000)
    total_price DECIMAL(15, 2) NOT NULL, -- Total harga setelah pro-rata
    
    -- Duration (mengikuti subscription aktif)
    start_date DATE NOT NULL, -- Tanggal mulai addon
    end_date DATE NOT NULL, -- Tanggal berakhir addon (sama dengan subscription end_date)
    remaining_days INTEGER NOT NULL, -- Sisa hari subscription saat beli (untuk tracking)
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    
    -- Transaction reference
    transaction_id VARCHAR(50) NULL, -- Reference ke transactions.transaction_id
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP NULL, -- Waktu addon expired
    cancelled_at TIMESTAMP NULL, -- Waktu cancellation (jika cancelled)
    cancelled_by VARCHAR(255) NULL, -- User yang cancel (user_id atau 'system')
    cancellation_reason TEXT NULL -- Alasan cancellation
);

-- Indexes untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_account_addons_user_id ON account_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_account_addons_status ON account_addons(status);
CREATE INDEX IF NOT EXISTS idx_account_addons_end_date ON account_addons(end_date);
CREATE INDEX IF NOT EXISTS idx_account_addons_transaction_id ON account_addons(transaction_id);

-- Composite index untuk query active addons per user
CREATE INDEX IF NOT EXISTS idx_account_addons_user_status 
ON account_addons(user_id, status) 
WHERE status = 'active';

-- =====================================================
-- Notes
-- =====================================================
-- 
-- 1. Addon Lifecycle:
--    - active: Addon aktif, user bisa gunakan toko tambahan
--    - expired: Addon sudah kadaluarsa (end_date < today)
--    - cancelled: Addon dibatalkan (manual atau auto)
--
-- 2. Addon Creation:
--    - Dibuat saat user checkout addon
--    - start_date = payment_confirmed_at
--    - end_date = subscription.end_date (mengikuti subscription aktif)
--    - total_price = (remaining_days / 30) × price_per_unit × quantity
--
-- 3. Pro-rata Calculation:
--    - remaining_days = jumlah hari dari start_date sampai subscription.end_date
--    - Contoh: 30 hari tersisa = Rp 99.000, 15 hari = Rp 49.500
--
-- 4. Addon Expiry:
--    - Addon expired bersamaan dengan subscription
--    - Worker akan auto-update status jadi 'expired'
--    - Toko tambahan otomatis non-aktif
--
-- 5. Renewal:
--    - Saat renewal, addon bisa diperpanjang (opt-out)
--    - Jika user pilih perpanjang, create new addon record
--    - Addon lama tetap ada untuk history
--
-- =====================================================
