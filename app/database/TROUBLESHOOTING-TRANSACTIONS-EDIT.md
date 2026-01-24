# Troubleshooting: Tabel Transactions Tidak Bisa Diedit di DBeaver

## Masalah
Tabel `transactions` tidak bisa diedit di DBeaver, meskipun sudah ada primary key.

## Penyebab Umum

### 1. **Sequence Ownership Issue (Paling Umum)**
DBeaver kadang tidak mengenali kolom `SERIAL` sebagai primary key yang bisa diedit jika sequence ownership tidak di-set dengan benar.

**Solusi:**
Jalankan script `fix-transactions-editable.sql` yang sudah dibuat. Script ini akan:
- Memastikan sequence dimiliki oleh kolom `id`
- Memverifikasi primary key constraint
- Mengecek permissions

### 2. **Read-Only Connection**
Connection DBeaver mungkin dalam mode read-only.

**Solusi:**
- Cek di DBeaver: Connection Properties → Driver Properties
- Pastikan tidak ada setting yang membuat connection read-only
- Atau buat connection baru

### 3. **Database Permissions**
User database mungkin tidak punya permission UPDATE.

**Solusi:**
Jalankan query ini (ganti `your_username` dengan username database Anda):
```sql
GRANT UPDATE ON public.transactions TO your_username;
```

### 4. **DBeaver Settings**
DBeaver mungkin memiliki setting yang mencegah editing.

**Solusi:**
- Window → Preferences → Data Editor
- Pastikan "Read-only mode" tidak dicentang
- Pastikan "Auto-commit" mode aktif

### 5. **Missing Primary Key Recognition**
Kadang DBeaver perlu di-refresh untuk mengenali primary key.

**Solusi:**
- Klik kanan pada tabel `transactions` → Refresh
- Atau tekan F5
- Tutup dan buka lagi tab tabel

## Langkah-langkah Perbaikan

1. **Jalankan Script Fix:**
   ```sql
   -- Buka file: adbot/database/fix-transactions-editable.sql
   -- Jalankan semua query di DBeaver SQL Editor
   ```

2. **Refresh Tabel:**
   - Klik kanan tabel → Refresh (F5)

3. **Cek Mode Editing:**
   - Pastikan tab "Data" aktif (bukan "Properties" atau "Diagram")
   - Pastikan mode "Grid" aktif (bukan "Text")

4. **Coba Edit:**
   - Double-click pada cell yang ingin diedit
   - Atau tekan F2 pada cell

5. **Commit Changes:**
   - Klik tombol "Commit" (✓) di toolbar
   - Atau gunakan Ctrl+Enter

## Verifikasi

Setelah menjalankan fix, verifikasi dengan query ini:

```sql
-- Cek sequence ownership
SELECT 
    pg_get_serial_sequence('public.transactions', 'id') AS sequence_name,
    pg_get_serial_sequence('public.transactions', 'id') IS NOT NULL AS has_sequence;

-- Cek primary key
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.transactions'::regclass
    AND contype = 'p';
```

Kedua query harus mengembalikan hasil (tidak NULL).

## Jika Masih Tidak Bisa

1. **Cek Log DBeaver:**
   - Window → Show View → Error Log
   - Lihat apakah ada error message

2. **Cek Database Logs:**
   - Lihat PostgreSQL logs untuk error saat mencoba UPDATE

3. **Coba dengan SQL Manual:**
   ```sql
   UPDATE transactions 
   SET payment_status = 'paid' 
   WHERE id = 1;
   ```
   Jika ini berhasil, masalahnya di DBeaver settings, bukan database.

4. **Cek Trigger:**
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'transactions';
   ```
   Trigger tertentu bisa mencegah editing.

## Catatan

- Pastikan Anda menggunakan DBeaver versi terbaru (25.3.0 atau lebih baru)
- Beberapa driver PostgreSQL lama mungkin punya bug dengan editing
- Jika menggunakan connection pooling, pastikan connection tidak di-share dengan aplikasi lain yang lock tabel

