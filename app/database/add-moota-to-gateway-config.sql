-- Add 'moota' to the provider check constraint in payment_gateway_config
-- Note: This script drops the existing constraint and recreates it.

-- 1. Drop existing constraint (assuming default naming if not specified, 
-- or we can use a generic script to find it, but usually it's better to just try common names or use a safe method)

DO $$ 
BEGIN
    -- Attempt to drop the constraint if it exists
    -- We assume the constraint name is 'payment_gateway_config_provider_check' based on standard PG naming
    BEGIN
        ALTER TABLE payment_gateway_config DROP CONSTRAINT IF EXISTS payment_gateway_config_provider_check;
    EXCEPTION
        WHEN undefined_object THEN
            RAISE NOTICE 'Constraint not found, skipping drop.';
    END;

    -- 2. Add the updated constraint
    ALTER TABLE payment_gateway_config 
    ADD CONSTRAINT payment_gateway_config_provider_check 
    CHECK (provider IN ('midtrans', 'xendit', 'doku', 'moota', 'other'));
END $$;
