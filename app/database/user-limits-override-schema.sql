-- =====================================================
-- User Limits Override Database Schema
-- =====================================================
-- 
-- Schema untuk menyimpan custom limits override per user
-- Admin dapat mengoverride limits default dari plan untuk user tertentu
--
-- Created: 2025-12-21
-- =====================================================

-- =====================================================
-- 1. User Limits Override Table
-- =====================================================
-- Menyimpan custom limits yang di-override oleh admin untuk user tertentu
-- Jika user punya entry di tabel ini, limits dari tabel ini akan digunakan
-- Jika tidak ada entry, menggunakan limits dari plan subscription user

CREATE TABLE IF NOT EXISTS user_limits_override (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE, -- Reference ke data_user.user_id
    -- Custom limits (NULL = tidak di-override, gunakan dari plan)
    max_accounts INTEGER NULL CHECK (max_accounts = -1 OR max_accounts > 0), -- -1 = unlimited, NULL = use plan default
    max_automation_rules INTEGER NULL CHECK (max_automation_rules = -1 OR max_automation_rules > 0), -- -1 = unlimited, NULL = use plan default
    max_campaigns INTEGER NULL CHECK (max_campaigns = -1 OR max_campaigns > 0), -- -1 = unlimited, NULL = use plan default
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NULL, -- Admin user_id yang membuat override
    updated_by VARCHAR(255) NULL, -- Admin user_id yang terakhir update
    notes TEXT NULL -- Catatan admin tentang override ini
);

-- Indexes untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_user_limits_override_user_id ON user_limits_override(user_id);
CREATE INDEX IF NOT EXISTS idx_user_limits_override_updated_at ON user_limits_override(updated_at);

-- Foreign key constraints (optional, jika ingin strict referential integrity)
-- ALTER TABLE user_limits_override ADD CONSTRAINT fk_user_limits_override_user_id 
--     FOREIGN KEY (user_id) REFERENCES data_user(user_id) ON DELETE CASCADE;

-- =====================================================
-- 2. Helper Views (Optional)
-- =====================================================
-- View untuk mendapatkan effective limits per user
-- (Bisa digunakan untuk query yang lebih mudah)

-- Note: View ini akan dibuat di application level jika diperlukan
-- Karena perlu join dengan subscriptions dan plans

-- =====================================================
-- Notes
-- =====================================================
-- 
-- 1. Override Logic:
--    - Jika user punya entry di user_limits_override:
--      * Kolom yang tidak NULL = menggunakan nilai override
--      * Kolom yang NULL = menggunakan nilai dari plan subscription
--    - Jika user tidak punya entry: gunakan plan subscription limits
--
-- 2. Unlimited Limits:
--    - Nilai -1 = unlimited
--    - NULL = gunakan plan default
--    - Integer > 0 = custom limit
--
-- 3. Priority:
--    - Admin/Superadmin: selalu unlimited (di-validate di application level)
--    - User dengan override: menggunakan override (NULL = plan default)
--    - User tanpa override: menggunakan plan subscription limits
--    - User tanpa subscription: menggunakan free plan defaults
--
-- 4. Use Cases:
--    - Special discount: user dapat limits lebih tinggi dari plan yang dibeli
--    - Temporary boost: admin bisa naikkan limits sementara untuk event/promosi
--    - Penalty: admin bisa turunkan limits jika ada violation
--    - Custom enterprise: user khusus dengan limits yang berbeda dari plan standar
--
-- 5. Migration:
--    - Untuk existing users tanpa override, tidak perlu entry di tabel ini
--    - Hanya perlu entry jika admin ingin override limits
--
-- =====================================================

