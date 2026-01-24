-- Migration: Landing Page Builder
-- Description: Create table to store page builder content as JSON structure
-- Date: 2026-01-22

CREATE TABLE IF NOT EXISTS landing_page_builder (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(50) NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{"sections": []}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_landing_page_builder_page_key ON landing_page_builder(page_key);
CREATE INDEX IF NOT EXISTS idx_landing_page_builder_content ON landing_page_builder USING GIN (content);

-- Insert default landing page structure
INSERT INTO landing_page_builder (page_key, content, updated_by) 
VALUES ('landing', '{"sections": []}'::jsonb, 'system')
ON CONFLICT (page_key) DO NOTHING;

