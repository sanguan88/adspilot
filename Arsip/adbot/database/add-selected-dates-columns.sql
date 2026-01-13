-- Add selected_dates and date_time_map columns to data_rules table
-- These columns store JSONB data for date-specific scheduling

-- Add selected_dates column (JSONB array of date strings in YYYY-MM-DD format)
ALTER TABLE data_rules 
ADD COLUMN IF NOT EXISTS selected_dates JSONB DEFAULT NULL;

-- Add date_time_map column (JSONB object mapping dates to time arrays)
-- Format: { "2025-12-25": ["09:00", "14:00"], "2025-12-26": ["10:00"] }
ALTER TABLE data_rules 
ADD COLUMN IF NOT EXISTS date_time_map JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN data_rules.selected_dates IS 'Array of specific dates (YYYY-MM-DD) when rule should execute';
COMMENT ON COLUMN data_rules.date_time_map IS 'Map of dates to execution times. Format: {"YYYY-MM-DD": ["HH:MM", ...]}';

