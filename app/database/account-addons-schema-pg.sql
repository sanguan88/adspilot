-- =====================================================
-- Account Addons Database Schema (PostgreSQL)
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
    user_id VARCHAR(255) NOT NULL,
    
    -- Addon details
    addon_type VARCHAR(50) DEFAULT 'extra_accounts',
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    
    -- Pricing (snapshot saat pembelian)
    price_per_unit DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    
    -- Duration (mengikuti subscription aktif)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remaining_days INTEGER NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    
    -- Transaction reference
    transaction_id VARCHAR(50) NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancelled_by VARCHAR(255) NULL,
    cancellation_reason TEXT NULL
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
