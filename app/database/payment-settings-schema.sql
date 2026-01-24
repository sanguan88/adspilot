-- =====================================================
-- Payment Settings Database Schema
-- =====================================================
-- 
-- Schema untuk payment settings system
-- Hanya satu metode pembayaran yang bisa aktif pada satu waktu
--
-- Created: 2025-01-XX
-- =====================================================

-- =====================================================
-- 1. Payment Settings Table
-- =====================================================
-- Menyimpan setting metode pembayaran yang aktif
-- Hanya ada 1 row (singleton pattern)

CREATE TABLE IF NOT EXISTS payment_settings (
    id SERIAL PRIMARY KEY,
    active_method VARCHAR(20) CHECK (active_method IN ('manual', 'gateway')) NULL,
    confirmation_email VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NULL, -- user_id admin yang update (optional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_payment_settings_active_method ON payment_settings(active_method);

-- Insert default row (null = no method active)
INSERT INTO payment_settings (active_method, confirmation_email) 
VALUES (NULL, 'support@shopadexpert.com')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. Bank Accounts Table
-- =====================================================
-- Menyimpan rekening bank untuk manual transfer

CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0, -- Untuk urutan tampilan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_display_order ON bank_accounts(display_order);

-- =====================================================
-- 3. Payment Gateway Config Table
-- =====================================================
-- Menyimpan konfigurasi payment gateway
-- Hanya ada 1 row (singleton pattern)

CREATE TABLE IF NOT EXISTS payment_gateway_config (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('midtrans', 'xendit', 'doku', 'other')),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    merchant_key VARCHAR(255) NULL, -- Encrypted
    client_key VARCHAR(255) NULL, -- Public key (bisa ditampilkan)
    server_key VARCHAR(255) NULL, -- Encrypted (secret)
    webhook_url VARCHAR(500) NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_payment_gateway_config_provider ON payment_gateway_config(provider);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_config_is_active ON payment_gateway_config(is_active);

-- =====================================================
-- Sample Data (Optional)
-- =====================================================

-- Sample Bank Accounts
INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active, display_order) VALUES
('Bank BCA', '1234567890', 'PT Shopee Ads Expert', true, 1),
('Bank Mandiri', '9876543210', 'PT Shopee Ads Expert', true, 2),
('Bank BRI', '5555666677', 'PT Shopee Ads Expert', true, 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Notes
-- =====================================================
-- 
-- 1. Payment Settings:
--    - active_method: 'manual' | 'gateway' | NULL
--    - NULL berarti tidak ada metode yang aktif (maintenance mode)
--    - Hanya satu metode yang bisa aktif pada satu waktu
--
-- 2. Bank Accounts:
--    - is_active: untuk enable/disable bank account tanpa hapus
--    - display_order: untuk mengatur urutan tampilan
--    - Bisa ada banyak bank account, tapi hanya yang is_active=true yang ditampilkan
--
-- 3. Payment Gateway Config:
--    - Hanya ada 1 config (singleton)
--    - API keys sebaiknya di-encrypt sebelum disimpan
--    - client_key bisa ditampilkan (public)
--    - server_key harus di-encrypt (secret)
--
-- 4. Security:
--    - Semua API keys sebaiknya di-encrypt menggunakan AES atau similar
--    - Jangan expose server_key ke frontend
--    - Validasi webhook dengan signature verification
--
-- =====================================================

