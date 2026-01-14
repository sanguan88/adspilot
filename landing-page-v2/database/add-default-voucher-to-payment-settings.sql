-- =====================================================
-- Migration: Add Default Voucher to Payment Settings
-- =====================================================
--
-- Menambahkan kolom untuk default voucher di payment_settings table
--
-- Created: 2025-12-21
-- =====================================================

DO $$
BEGIN
    -- Add default_voucher_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='payment_settings' AND column_name='default_voucher_enabled'
    ) THEN
        ALTER TABLE payment_settings ADD COLUMN default_voucher_enabled BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE 'Column default_voucher_enabled added to payment_settings table.';
    ELSE
        RAISE NOTICE 'Column default_voucher_enabled already exists in payment_settings table.';
    END IF;

    -- Add default_voucher_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='payment_settings' AND column_name='default_voucher_id'
    ) THEN
        ALTER TABLE payment_settings ADD COLUMN default_voucher_id INTEGER NULL;
        -- Add foreign key constraint to vouchers table
        ALTER TABLE payment_settings 
        ADD CONSTRAINT fk_payment_settings_default_voucher_id 
        FOREIGN KEY (default_voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column default_voucher_id added to payment_settings table.';
    ELSE
        RAISE NOTICE 'Column default_voucher_id already exists in payment_settings table.';
    END IF;
END
$$;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_payment_settings_default_voucher_id 
ON payment_settings(default_voucher_id);

