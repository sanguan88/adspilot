# Manual Migration Instructions for Vouchers Schema

Jika migration script tidak berjalan karena environment variables, jalankan SQL migration secara manual:

## Option 1: Run SQL files directly via psql or pgAdmin

1. **Create vouchers tables:**
   ```bash
   psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f vouchers-schema.sql
   ```

2. **Add voucher columns to transactions table:**
   ```bash
   psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f add-voucher-columns-to-transactions.sql
   ```

## Option 2: Copy and paste SQL directly

Jalankan SQL dari file `vouchers-schema.sql` terlebih dahulu, kemudian `add-voucher-columns-to-transactions.sql` melalui pgAdmin atau psql console.

## Option 3: Update environment variables

Pastikan environment variables berikut tersedia sebelum menjalankan `run-vouchers-schema.js`:
- `DB_HOST`
- `DB_PORT` (default: 5432 untuk PostgreSQL)
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Atau buat file `.env.local` di folder `local_pc/adbot/` dengan format:
```
DB_HOST=your_host
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
```

