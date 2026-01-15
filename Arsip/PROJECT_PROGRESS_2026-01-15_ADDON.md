# Project Progress - 15 Januari 2026
## Addon Upselling Implementation - Phase 1

**Tanggal:** 15 Januari 2026  
**Status:** In Progress - Phase 1 (Database & Backend)  
**Developer:** Discussion & Implementation

---

## 🎯 Objective

Implementasi strategi upselling untuk penambahan toko/akun dengan sistem addon berbasis pro-rata pricing.

---

## ✅ Completed Today

### 1. Planning & Documentation

- [x] **Diskusi strategi addon upselling** dengan user
  - Dual approach: Self-service addon + Admin override
  - Pro-rata pricing untuk fairness
  - Smart renewal flow (opt-out approach)
  
- [x] **Created comprehensive documentation**
  - File: `ADDON_UPSELLING_STRATEGY.md`
  - Mencakup: pricing strategy, user flows, implementation roadmap, edge cases

### 2. Database Schema

- [x] **Created `account_addons` table schema**
  - File: `app/database/account-addons-schema.sql`
  - Fields: user_id, addon_type, quantity, price_per_unit, total_price, start_date, end_date, status
  - Indexes: user_id, status, end_date
  - Support pro-rata pricing dengan remaining_days tracking

- [x] **Verified `user_limits_override` table schema**
  - File: `app/database/user-limits-override-schema.sql` (already exists)
  - For admin manual override

- [x] **Created migration script**
  - File: `app/database/run-account-addons-schema.js`
  - Auto-verification after migration

### 3. Backend Logic

- [x] **Updated `subscription-limits.ts`**
  - Added `getUserEffectiveLimits()` function
  - Combines: plan limits + active addons + admin override
  - Returns complete limits breakdown with active addons list

### 4. API Endpoints

- [x] **Created `/api/addons/calculate-price` endpoint**
  - Calculate pro-rata price based on remaining subscription days
  - Validation: minimum 7 days before expiry
  - Returns: quantity, pro-rata price, PPN, total
  
- [x] **Created `/api/user/effective-limits` endpoint**
  - Get complete limits info (plan + addons + override)
  - Includes current usage statistics
  - Returns availability flags (canAddAccount, canAddRule, etc.)

---

## 📊 Implementation Details

### Pro-Rata Calculation Formula

```javascript
harga_addon = (sisa_hari / 30) × harga_per_bulan × quantity
```

**Example:**
- Sisa 30 hari, 1 toko: `(30/30) × Rp 99.000 = Rp 99.000`
- Sisa 15 hari, 1 toko: `(15/30) × Rp 99.000 = Rp 49.500`
- Sisa 7 hari, 1 toko: `(7/30) × Rp 99.000 = Rp 23.100`

### Pricing Structure

| Package | Harga/bulan | Hemat |
|---------|-------------|-------|
| +1 Toko | Rp 99.000 | - |
| +3 Toko | Rp 249.000 | Rp 48.000 (16%) |
| +5 Toko | Rp 399.000 | Rp 96.000 (19%) |

### Business Rules

1. **Minimum Days:** 7 hari sebelum subscription expiry
2. **Duration:** Addon mengikuti subscription end_date
3. **Renewal:** Auto-include di invoice (opt-out)
4. **Expiry:** Toko non-aktif tapi data tetap tersimpan

---

## 🔄 Next Steps

### Immediate (Pending)

- [ ] **Run database migration**
  ```bash
  node app/database/run-account-addons-schema.js
  ```

- [ ] **Test API endpoints**
  - Test calculate-price dengan berbagai skenario
  - Test effective-limits response

### Phase 1 Remaining

- [ ] Create `/api/addons/purchase` endpoint
  - Generate transaction for addon purchase
  - Create addon record after payment confirmed
  - Send notification to user

- [ ] Create `/api/addons/list` endpoint
  - Get user's addon history
  - Filter by status (active/expired/cancelled)

### Phase 2: User Portal UI

- [ ] Addon purchase modal component
- [ ] Update accounts page to show addon option
- [ ] Renewal page with addon auto-include
- [ ] Testing & bug fixes

### Phase 3: Admin Panel

- [ ] User limits override panel
- [ ] Addon management view
- [ ] Reports & analytics

---

## 📁 Files Created/Modified

### Created Files

1. `ADDON_UPSELLING_STRATEGY.md` - Complete strategy documentation
2. `app/database/account-addons-schema.sql` - Database schema
3. `app/database/run-account-addons-schema.js` - Migration script
4. `app/app/api/addons/calculate-price/route.ts` - Pro-rata calculator API
5. `app/app/api/user/effective-limits/route.ts` - Effective limits API

### Modified Files

1. `app/lib/subscription-limits.ts` - Added `getUserEffectiveLimits()` function

---

## 🎯 Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Pro-rata pricing** | Fair untuk semua user, bayar sesuai yang didapat |
| **Minimum 7 days** | Prevent abuse, encourage renewal first |
| **Opt-out renewal** | Better UX, reduce churn, predictable revenue |
| **Dual approach** | Self-service untuk scale, admin override untuk flexibility |

---

## 📝 Notes

- Database migration belum dijalankan (waiting for user confirmation)
- API endpoints sudah dibuat tapi belum di-test
- Frontend UI belum dimulai
- Worker untuk auto-expire addon belum dibuat

---

## 🚀 Progress Status

**Phase 1: Database & Backend** - 60% Complete

- ✅ Database schema design
- ✅ Core backend logic
- ✅ Basic API endpoints
- ⏳ Purchase API (pending)
- ⏳ Database migration (pending)
- ⏳ Testing (pending)

---

**Last Updated:** 15 Januari 2026 14:50 WIB  
**Next Session:** Continue with purchase API and database migration
