-- Increase column lengths for payment gateway credentials
-- Moota API Tokens can be longer than 255 characters.

ALTER TABLE payment_gateway_config 
ALTER COLUMN merchant_key TYPE TEXT,
ALTER COLUMN client_key TYPE TEXT,
ALTER COLUMN server_key TYPE TEXT;

-- Verify if webhook_url also needs an update (currently 500, but TEXT is safer)
ALTER TABLE payment_gateway_config 
ALTER COLUMN webhook_url TYPE TEXT;
