-- =====================================================
-- Add Rate Limit Settings to system_settings Table
-- =====================================================
-- 
-- Menambahkan konfigurasi rate limit ke tabel system_settings yang sudah ada
-- Tidak membuat tabel baru, tapi menambahkan rows baru
--
-- Created: 2026-01-16
-- =====================================================

-- Insert rate limit settings ke system_settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public, created_at, updated_at) VALUES
('security.maxLoginAttempts', '5', 'number', 'security', 'Maximum failed login attempts before blocking', false, NOW(), NOW()),
('security.loginWindowMinutes', '15', 'number', 'security', 'Time window in minutes to count login attempts', false, NOW(), NOW()),
('security.loginBlockDurationMinutes', '30', 'number', 'security', 'Duration in minutes to block user after max attempts', false, NOW(), NOW()),
('security.rateLimitEnabled', 'true', 'boolean', 'security', 'Enable/disable rate limiting for login', false, NOW(), NOW())
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- Notes
-- =====================================================
-- 
-- Settings yang ditambahkan:
-- 1. security.maxLoginAttempts: Maksimal percobaan login gagal (default: 5)
-- 2. security.loginWindowMinutes: Durasi window untuk menghitung percobaan (default: 15 menit)
-- 3. security.loginBlockDurationMinutes: Durasi blokir setelah max attempts (default: 30 menit)
-- 4. security.rateLimitEnabled: Flag untuk enable/disable rate limiting (default: true)
--
-- Semua settings ini akan muncul di Admin Panel > Settings > Security tab
-- =====================================================
