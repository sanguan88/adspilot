# Database Migration Guide - Account Addons

**Date:** 15 Januari 2026  
**Migration:** account_addons table  
**Status:** Ready to deploy

---

## 📋 Overview

Migration ini menambahkan tabel `account_addons` untuk fitur addon upselling (tambah toko).

---

## 🗄️ Table: account_addons

### Purpose
Menyimpan addon yang dibeli user untuk menambah limit toko/akun.

### Fields
- `id` - Primary key
- `user_id` - Reference ke data_user
- `addon_type` - Type addon (default: 'extra_accounts')
- `quantity` - Jumlah toko tambahan
- `price_per_unit` - Harga per toko per bulan (Rp 99.000)
- `total_price` - Total harga setelah pro-rata
- `start_date` - Tanggal mulai addon
- `end_date` - Tanggal berakhir (sama dengan subscription end_date)
- `remaining_days` - Sisa hari subscription saat beli
- `status` - Status addon (active/expired/cancelled)
- `transaction_id` - Reference ke transactions table
- Timestamps dan metadata lainnya

---

## 🚀 How to Run Migration

### Option 1: Via SSH (Recommended)

```bash
# 1. SSH ke server production
ssh root@154.19.37.198

# 2. Navigate to app directory
cd /var/www/adspilot/app

# 3. Run migration script
node database/run-account-addons-schema.js

# 4. Verify table created
mysql -u soroboti_db -p soroboti_ads -e "DESCRIBE account_addons;"
```

### Option 2: Manual SQL

```bash
# 1. SSH ke server
ssh root@154.19.37.198

# 2. Login to MySQL
mysql -u soroboti_db -p

# 3. Use database
USE soroboti_ads;

# 4. Copy-paste SQL from account-addons-schema-mysql.sql
# (See file: app/database/account-addons-schema-mysql.sql)

# 5. Verify
SHOW TABLES LIKE 'account_addons';
DESCRIBE account_addons;
```

---

## ✅ Verification

After running migration, verify:

```sql
-- Check table exists
SHOW TABLES LIKE 'account_addons';

-- Check table structure
DESCRIBE account_addons;

-- Check indexes
SHOW INDEX FROM account_addons;

-- Expected output: 5 indexes
-- - PRIMARY (id)
-- - idx_account_addons_user_id
-- - idx_account_addons_status
-- - idx_account_addons_end_date
-- - idx_account_addons_transaction_id
-- - idx_account_addons_user_status
```

---

## 🔄 Rollback (if needed)

```sql
DROP TABLE IF EXISTS account_addons;
```

---

## 📝 Notes

- Migration script: `app/database/run-account-addons-schema.js`
- SQL file: `app/database/account-addons-schema-mysql.sql`
- Database: MySQL (soroboti_ads)
- Host: 154.19.37.198
- Port: 3306

---

## ⚠️ Important

- Backup database sebelum run migration
- Test di development/staging dulu jika ada
- Pastikan tidak ada downtime saat migration
- Migration ini safe (CREATE TABLE IF NOT EXISTS)

---

## 🔗 Related Files

1. `app/database/account-addons-schema-mysql.sql` - SQL schema
2. `app/database/run-account-addons-schema.js` - Migration script
3. `app/lib/subscription-limits.ts` - Logic yang menggunakan table ini
4. `ADDON_UPSELLING_STRATEGY.md` - Complete strategy documentation

---

**Status:** ⏳ Pending deployment to production
