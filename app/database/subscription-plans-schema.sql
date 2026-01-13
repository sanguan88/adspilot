-- =====================================================
-- Subscription Plans Database Schema
-- =====================================================
-- 
-- Schema untuk menyimpan subscription plan definitions
-- Plans digunakan untuk checkout, landing page, dan admin panel
--
-- Created: 2025-12-21
-- =====================================================

-- =====================================================
-- 1. Subscription Plans Table
-- =====================================================
-- Menyimpan definisi subscription plans

CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_id VARCHAR(50) UNIQUE NOT NULL, -- Unique plan ID (e.g., "1-month", "3-month", "6-month", "free", "basic", etc.)
    name VARCHAR(100) NOT NULL, -- Display name (e.g., "Paket 1 Bulan", "Basic Plan")
    description TEXT NULL, -- Plan description
    
    -- Pricing
    price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Base price (harga sebelum diskon)
    original_price DECIMAL(15, 2) NULL, -- Original price (untuk display strikethrough, optional)
    discount_percentage DECIMAL(5, 2) NULL, -- Discount percentage (optional, untuk display)
    
    -- Billing
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', '3-month', '6-month', 'yearly', etc.
    duration_months INTEGER NOT NULL DEFAULT 1, -- Duration in months
    
    -- Features/Limits
    max_accounts INTEGER DEFAULT -1, -- Maximum accounts/stores (-1 = unlimited)
    max_automation_rules INTEGER DEFAULT -1, -- Maximum active automation rules (-1 = unlimited)
    max_campaigns INTEGER DEFAULT -1, -- Maximum campaigns (-1 = unlimited)
    support_level VARCHAR(50) DEFAULT 'community', -- 'community', 'email', 'priority', 'dedicated'
    
    -- Features list (JSON array for display)
    features JSONB NULL, -- Array of feature strings for display
    
    -- Status
    is_active BOOLEAN DEFAULT true, -- Is plan active/available for purchase
    
    -- Display order
    display_order INTEGER DEFAULT 0, -- Order for display (lower = first)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NULL, -- Admin user_id who created
    updated_by VARCHAR(255) NULL -- Admin user_id who last updated
);

-- Indexes untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_id ON subscription_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order ON subscription_plans(display_order);

-- Insert default plans (matching checkout page)
INSERT INTO subscription_plans (
    plan_id, name, description, price, original_price, discount_percentage,
    billing_cycle, duration_months,
    max_accounts, max_automation_rules, max_campaigns, support_level,
    features, is_active, display_order
) VALUES
(
    '1-month',
    'Paket 1 Bulan',
    'Cocok untuk trial atau toko baru',
    349000,
    698000,
    50.00,
    'monthly',
    1,
    2, -- 1 toko + Free 1 toko
    10,
    -1, -- unlimited campaigns
    'community',
    '[
        "Akses 1 bulan penuh",
        "1 toko + Free 1 toko (Total 2 toko, nilai free: Rp 99.000)",
        "Total 10 rules aktif",
        "Semua fitur Shopee Ads Expert",
        "BCG Matrix Analysis",
        "Support via Telegram member group"
    ]'::jsonb,
    true,
    1
),
(
    '3-month',
    'Paket 3 Bulan',
    'Paling populer! Best value untuk bisnis berkembang',
    749000,
    1498000,
    50.00,
    '3-month',
    3,
    2, -- 1 toko + Free 1 toko
    20,
    -1, -- unlimited campaigns
    'priority',
    '[
        "Akses 3 bulan penuh",
        "1 toko + Free 1 toko (Total 2 toko, nilai free: Rp 99.000)",
        "Total 20 rules aktif",
        "Semua fitur Shopee Ads Expert",
        "BCG Matrix Analysis",
        "Support via Telegram member group",
        "Priority support"
    ]'::jsonb,
    true,
    2
),
(
    '6-month',
    'Paket 6 Bulan',
    'Investasi terbaik! Paling hemat per bulan',
    1499000,
    2998000,
    50.00,
    '6-month',
    6,
    3, -- 1 toko + Free 2 toko
    20,
    -1, -- unlimited campaigns
    'dedicated',
    '[
        "Akses 6 bulan penuh",
        "1 toko + Free 2 toko (Total 3 toko, nilai free: Rp 198.000)",
        "Total 20 rules aktif",
        "Semua fitur Shopee Ads Expert",
        "BCG Matrix Analysis",
        "Support via Telegram member group",
        "Priority support",
        "Dedicated onboarding"
    ]'::jsonb,
    true,
    3
)
ON CONFLICT (plan_id) DO NOTHING;

-- =====================================================
-- Notes
-- =====================================================
-- 
-- 1. plan_id harus UNIQUE dan digunakan sebagai identifier di seluruh aplikasi
-- 2. price adalah harga yang digunakan untuk checkout (setelah diskon jika ada)
-- 3. original_price dan discount_percentage untuk display di UI (optional)
-- 4. features adalah JSON array untuk display di landing page
-- 5. max_accounts, max_automation_rules, max_campaigns digunakan untuk limitasi subscription
-- 6. display_order menentukan urutan tampilan (lower = first)
--
-- =====================================================

