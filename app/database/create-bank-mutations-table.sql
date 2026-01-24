-- Create bank_mutations table
CREATE TABLE IF NOT EXISTS bank_mutations (
    id SERIAL PRIMARY KEY,
    moota_mutation_id VARCHAR(50) UNIQUE,
    amount DECIMAL(15, 2) NOT NULL,
    bank_type VARCHAR(50),
    account_number VARCHAR(50),
    description TEXT,
    date TIMESTAMP NOT NULL,
    type VARCHAR(10), -- 'CR' for credit, 'DB' for debit
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'ignored', 'failed'
    transaction_id VARCHAR(100), -- Link to transactions table if matched
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for matching
CREATE INDEX IF NOT EXISTS idx_bank_mutations_amount_status ON bank_mutations(amount, status);
CREATE INDEX IF NOT EXISTS idx_bank_mutations_trx_id ON bank_mutations(transaction_id);
