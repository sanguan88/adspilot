-- =====================================================
-- Fix Transactions Table untuk DBeaver Editing
-- =====================================================
-- 
-- Script ini akan memperbaiki masalah editing di DBeaver
-- dengan memastikan sequence ownership dan constraints
-- sudah benar
--
-- =====================================================

-- 1. Cek struktur tabel dan primary key
SELECT 
    tc.table_name, 
    kcu.column_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'transactions'
    AND tc.constraint_type = 'PRIMARY KEY';

-- 2. Cek sequence ownership untuk kolom id
SELECT 
    sequence_name,
    sequence_schema,
    data_type,
    start_value,
    minimum_value,
    maximum_value
FROM information_schema.sequences
WHERE sequence_name LIKE 'transactions_id%';

-- 3. Fix: Pastikan sequence dimiliki oleh kolom id
-- (Ini akan memperbaiki masalah editing di DBeaver)
DO $$
DECLARE
    seq_name TEXT;
BEGIN
    -- Cari nama sequence untuk kolom id
    SELECT pg_get_serial_sequence('public.transactions', 'id') INTO seq_name;
    
    IF seq_name IS NOT NULL THEN
        -- Set ownership sequence ke kolom id
        EXECUTE format('ALTER SEQUENCE %s OWNED BY public.transactions.id', seq_name);
        RAISE NOTICE 'Sequence % telah di-set ownership ke transactions.id', seq_name;
    ELSE
        RAISE NOTICE 'Sequence tidak ditemukan untuk transactions.id';
    END IF;
END $$;

-- 4. Verifikasi primary key constraint
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.transactions'::regclass
    AND contype = 'p';

-- 5. Cek permissions untuk current user
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name = 'transactions';

-- 6. Grant UPDATE permission jika diperlukan (ganti 'your_username' dengan username database Anda)
-- GRANT UPDATE ON public.transactions TO your_username;

-- =====================================================
-- Catatan:
-- =====================================================
-- 
-- Setelah menjalankan script ini:
-- 1. Refresh tabel di DBeaver (F5 atau klik kanan -> Refresh)
-- 2. Pastikan mode "Auto-commit" aktif di DBeaver
-- 3. Coba edit lagi tabel transactions
--
-- Jika masih tidak bisa edit:
-- 1. Cek apakah connection DBeaver dalam mode read-only
-- 2. Cek permissions user database (step 5)
-- 3. Pastikan tidak ada trigger yang mencegah editing
-- 4. Coba restart DBeaver
--
-- =====================================================

