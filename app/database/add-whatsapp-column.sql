-- =====================================================
-- Add WhatsApp Column to data_user Table
-- =====================================================
-- 
-- Migration untuk menambahkan kolom no_whatsapp
-- Created: 2026-01-11
-- =====================================================

-- Tambah kolom no_whatsapp
ALTER TABLE data_user 
ADD COLUMN IF NOT EXISTS no_whatsapp VARCHAR(20);

-- Add index untuk faster lookup (optional)
CREATE INDEX IF NOT EXISTS idx_data_user_no_whatsapp ON data_user(no_whatsapp);

-- =====================================================
-- Notes
-- =====================================================
-- 
-- Format yang diharapkan: +62xxx atau 08xxx
-- Validasi format dilakukan di application level
-- 
-- =====================================================
