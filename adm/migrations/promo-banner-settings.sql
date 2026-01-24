-- Migration: Add Promo Banner Settings
-- Date: 2026-01-22
-- Description: Insert promo banner settings into system_settings table

INSERT INTO system_settings (setting_key, setting_value, setting_type, category) VALUES
  ('promo.is_enabled', 'true', 'boolean', 'promo'),
  ('promo.badge_text', 'SOFT LAUNCHING - EARLY BIRD 50% OFF', 'string', 'promo'),
  ('promo.title', 'Promo Icip-icip 7 Hari - Hanya Sampai 28 Februari 2026!', 'string', 'promo'),
  ('promo.description', 'Dapatkan akses GRATIS semua fitur selama 7 hari untuk user baru. Promo berlaku hingga 28 Februari 2026!', 'string', 'promo'),
  ('promo.cta_text', 'Gunakan kesempatan trial 7 hari sebelum promo berakhir 28 Februari 2026', 'string', 'promo')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  category = EXCLUDED.category,
  updated_at = NOW();
