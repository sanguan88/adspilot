-- =====================================================
-- Subscriptions Database Schema
-- =====================================================
-- 
-- Schema untuk menyimpan subscription user
-- Subscription dibuat dari transaction yang sudah paid
--
-- Created: 2025-01-XX
-- =====================================================

-- =====================================================
-- 1. Subscriptions Table
-- =====================================================
-- Menyimpan status langganan aktif user
-- 1 user hanya punya 1 subscription aktif pada satu waktu

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Reference ke data_user.user_id
    plan_id VARCHAR(50) NOT NULL, -- ID paket (1-month, 3-month, 6-month)
    transaction_id VARCHAR(50) NOT NULL, -- Reference ke transactions.transaction_id (transaction yang paid)
    
    -- Subscription status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    
    -- Subscription period
    start_date DATE NOT NULL, -- Tanggal mulai subscription
    end_date DATE NOT NULL, -- Tanggal berakhir subscription
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'quarterly', 'semi-annual', 'annual'
    
    -- Pricing (snapshot dari transaction)
    base_amount DECIMAL(15, 2) NOT NULL, -- Harga paket saat subscribe
    ppn_amount DECIMAL(15, 2) NOT NULL, -- PPN saat subscribe
    total_amount DECIMAL(15, 2) NOT NULL, -- Total pembayaran saat subscribe
    
    -- Auto-renewal
    auto_renew BOOLEAN DEFAULT false, -- Apakah auto-renew saat expired
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL, -- Waktu cancellation (jika cancelled)
    cancelled_by VARCHAR(255) NULL, -- User yang cancel (user_id atau 'system')
    cancellation_reason TEXT NULL -- Alasan cancellation
);

-- Indexes untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_transaction_id ON subscriptions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- Unique constraint: 1 user hanya punya 1 active subscription
-- (Bisa di-enforce di application level atau dengan partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active 
ON subscriptions(user_id) 
WHERE status = 'active';

-- Foreign key constraints (optional, jika ingin strict referential integrity)
-- ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user_id 
--     FOREIGN KEY (user_id) REFERENCES data_user(user_id) ON DELETE CASCADE;
-- ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_transaction_id 
--     FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE RESTRICT;

-- =====================================================
-- Notes
-- =====================================================
-- 
-- 1. Subscription Lifecycle:
--    - active: Subscription aktif, user bisa akses aplikasi
--    - expired: Subscription sudah kadaluarsa (end_date < today)
--    - cancelled: Subscription dibatalkan (manual atau auto)
--    - suspended: Subscription ditangguhkan (sementara)
--
-- 2. Subscription Creation:
--    - Dibuat otomatis saat transaction status jadi 'paid'
--    - start_date = payment_confirmed_at (dari transaction)
--    - end_date = start_date + durasi plan
--    - Jika user sudah punya subscription aktif, update yang lama jadi expired
--
-- 3. Plan Duration:
--    - 1-month: end_date = start_date + 1 month
--    - 3-month: end_date = start_date + 3 months
--    - 6-month: end_date = start_date + 6 months
--
-- 4. Auto-Renewal:
--    - Jika auto_renew = true, sistem bisa auto-create transaction baru saat expired
--    - (Untuk future implementation)
--
-- 5. Multiple Subscriptions:
--    - User bisa punya banyak subscription (history)
--    - Tapi hanya 1 yang status = 'active'
--    - Subscription lama otomatis jadi 'expired' saat ada yang baru
--
-- 6. Transaction Reference:
--    - transaction_id reference ke transactions.transaction_id
--    - Untuk tracking dari transaction mana subscription ini dibuat
--    - Bisa digunakan untuk invoice/receipt
--
-- =====================================================

