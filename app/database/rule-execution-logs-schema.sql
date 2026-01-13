-- Table untuk menyimpan detail eksekusi rule per campaign
-- Menyimpan error message spesifik dari Shopee API

CREATE TABLE IF NOT EXISTS rule_execution_logs (
  id SERIAL PRIMARY KEY,
  rule_id VARCHAR(255) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  toko_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'skipped'
  error_message TEXT, -- Error detail dari Shopee API (jika gagal)
  execution_data JSONB, -- Data tambahan: currentBudget, newBudget, dll
  executed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes untuk query cepat
  CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES data_rules(rule_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_rule_id ON rule_execution_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_campaign_id ON rule_execution_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_executed_at ON rule_execution_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_rule_campaign ON rule_execution_logs(rule_id, campaign_id, executed_at DESC);

COMMENT ON TABLE rule_execution_logs IS 'Log detail eksekusi rule per campaign dengan error message spesifik';
COMMENT ON COLUMN rule_execution_logs.error_message IS 'Error detail dari Shopee API (jika status = failed)';
COMMENT ON COLUMN rule_execution_logs.execution_data IS 'Data tambahan eksekusi: currentBudget, newBudget, amount, dll';

