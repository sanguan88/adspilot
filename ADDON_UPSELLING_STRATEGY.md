# Addon Upselling Strategy - AdsPilot

**Tanggal:** 15 Januari 2026  
**Status:** Diskusi & Planning  
**Tujuan:** Implementasi strategi upselling untuk penambahan toko/akun

---

## 📊 Kondisi Saat Ini

### Struktur Subscription Plans

| Plan | Harga | Durasi | Max Accounts | Max Rules | Max Campaigns |
|------|-------|--------|--------------|-----------|---------------|
| 1-month | Rp 349.000 | 1 bulan | 2 toko | 10 rules | Unlimited |
| 3-month | Rp 749.000 | 3 bulan | 2 toko | 20 rules | Unlimited |
| 6-month | Rp 1.499.000 | 6 bulan | 3 toko | 20 rules | Unlimited |

### Limitasi yang Ada

Dari file [`subscription-limits.ts`](file:///c:/Users/STUDO/Documents/Project/SELLER.SHOPEE/AdsPilot/app/lib/subscription-limits.ts):

- ✅ **Validasi limit accounts** - `validateAccountLimit()` memblokir penambahan toko jika sudah mencapai limit
- ✅ **Validasi automation rules** - `validateAutomationRulesLimit()`
- ✅ **Validasi campaigns** - `validateCampaignsLimitForSync()`
- ⚠️ **Override system** - Kode sudah ada (lines 141-193) tapi tabel `user_limits_override` belum dibuat

### Yang Sudah Disiapkan (Belum Diimplementasi)

```typescript
// Di subscription-limits.ts lines 141-193
const overrideResult = await connection.query(
  `SELECT max_accounts, max_automation_rules, max_campaigns
   FROM user_limits_override
   WHERE user_id = $1`,
  [userId]
)
```

> ⚠️ **Tabel `user_limits_override` belum ada di database!**

---

## 🎯 Strategi Upselling: Dual Approach

### Opsi A: Self-Service Add-On (Primary Revenue Stream)

**Konsep:** User bisa beli addon toko tambahan secara mandiri melalui dashboard.

```
┌─────────────────────────────────────────────────────────────┐
│                   USER DASHBOARD                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📊 Toko: 2/2 (Limit tercapai!)                     │   │
│  │  ┌─────────────────────────────────────────────────┐│   │
│  │  │ [+ Tambah 1 Toko - Rp 99.000/bulan]           │ │   │
│  │  │ [+ Tambah 3 Toko - Rp 249.000/bulan (Hemat!)] │ │   │
│  │  └─────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Keuntungan:**
- ✅ Otomatis generate revenue
- ✅ User bisa beli sendiri (self-service)
- ✅ Scalable dan sustainable
- ✅ Ada transaction history untuk tracking

### Opsi B: Admin Override (Manual Control)

**Konsep:** Admin bisa set custom limit per user tanpa transaksi.

**Use Cases:**
- Special deals untuk enterprise clients
- Kompensasi untuk user yang komplain
- Testing/demo purposes
- Partnership agreements

---

## 💰 Pricing Strategy

### Harga Addon

| Package | Harga | Hemat |
|---------|-------|-------|
| +1 Toko | Rp 99.000/bulan | - |
| +3 Toko | Rp 249.000/bulan | Rp 48.000 (16%) |
| +5 Toko | Rp 399.000/bulan | Rp 96.000 (19%) |

### Perhitungan Pro-Rata

**Formula:**
```javascript
harga_addon = (sisa_hari / 30) × harga_per_bulan × quantity
```

**Contoh:**

| Sisa Hari | Quantity | Perhitungan | Harga Total |
|-----------|----------|-------------|-------------|
| 90 hari | 1 toko | 90/30 × Rp 99.000 | Rp 297.000 |
| 60 hari | 1 toko | 60/30 × Rp 99.000 | Rp 198.000 |
| 30 hari | 1 toko | 30/30 × Rp 99.000 | Rp 99.000 |
| 15 hari | 1 toko | 15/30 × Rp 99.000 | Rp 49.500 |
| 7 hari | 1 toko | 7/30 × Rp 99.000 | Rp 23.100 |

### Aturan Pembelian

| Aspek | Keputusan |
|-------|-----------|
| **Harga per toko** | Rp 99.000/bulan |
| **Perhitungan** | Pro-rata (sesuai sisa hari subscription) |
| **Minimum hari** | 7 hari sebelum expiry |
| **Minimum harga** | Tidak ada (bisa Rp 23.100 untuk 7 hari) |
| **Durasi addon** | Mengikuti durasi subscription aktif |

---

## ⚖️ Analisis Fairness

### Mengapa Pro-Rata Lebih Adil?

**Skenario tanpa pro-rata:**

| Waktu | User A | User B |
|-------|--------|--------|
| Hari 1 | Beli plan 3-bulan + addon | Beli plan 3-bulan |
| Hari 60 | - | Beli addon |
| **Total bayar addon:** | Rp 297.000 | Rp 297.000 |
| **Dapat akses addon:** | 90 hari ✅ | 30 hari ❌ |

**Masalah:** User B bayar sama tapi hanya dapat 30 hari → **TIDAK FAIR!**

**Solusi dengan pro-rata:**

| Waktu | User A | User B |
|-------|--------|--------|
| Hari 1 | Beli plan 3-bulan + addon | Beli plan 3-bulan |
| | Bayar: Rp 297.000 (90 hari) | - |
| Hari 60 | - | Beli addon |
| | - | Bayar: Rp 99.000 (30 hari) |
| **Harga per hari:** | Rp 3.300/hari ✅ | Rp 3.300/hari ✅ |

---

## 🔄 Smart Renewal Flow

### Pendekatan: "Opt-Out" bukan "Opt-In"

Addon **otomatis include** di invoice perpanjangan, tapi user bisa **remove** sebelum bayar.

**Alasan:**
- ✅ User tidak perlu ingat-ingat addon mana yang aktif
- ✅ Mengurangi churn (user lupa perpanjang addon → toko hilang)
- ✅ Revenue lebih predictable
- ✅ Masih memberi kontrol ke user (bisa remove)

### User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  📧 REMINDER EMAIL (H-7 Sebelum Expired)                        │
│                                                                  │
│  "Subscription Anda akan berakhir dalam 7 hari."                │
│  "Plan: Paket 3 Bulan + 2 Toko Tambahan"                        │
│                                                                  │
│  [Perpanjang Sekarang]                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  📋 HALAMAN RENEWAL                                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Perpanjang Subscription Anda                           │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ✅ Paket 3 Bulan                    Rp 749.000  │   │   │
│  │  │    Termasuk: 2 toko, 20 rules                   │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ✅ 2 Toko Tambahan              Rp 198.000  [×] │   │   │
│  │  │    (Perpanjang addon Anda)                      │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ─────────────────────────────────────────────────     │   │
│  │  Subtotal                           Rp 947.000         │   │
│  │  PPN 11%                            Rp 104.170         │   │
│  │  ─────────────────────────────────────────────────     │   │
│  │  TOTAL                           Rp 1.051.170         │   │
│  │                                                         │   │
│  │  [Bayar Sekarang]                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Konfirmasi Remove Addon

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Konfirmasi Hapus Addon                                      │
│                                                                  │
│  Anda akan kehilangan akses ke 2 toko tambahan:                 │
│  • Toko ABC (akan non-aktif)                                    │
│  • Toko XYZ (akan non-aktif)                                    │
│                                                                  │
│  Data toko tetap tersimpan dan bisa diaktifkan kembali          │
│  jika Anda membeli addon lagi.                                  │
│                                                                  │
│  [Batalkan]  [Ya, Hapus Addon]                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Roadmap

### Database Schema

#### 1. Table: `account_addons`

```sql
CREATE TABLE account_addons (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    addon_type VARCHAR(50) DEFAULT 'extra_accounts',
    quantity INTEGER DEFAULT 1,  -- Jumlah toko tambahan
    price_per_unit DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    
    -- Duration (mengikuti subscription)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    
    -- Transaction reference
    transaction_id VARCHAR(50) NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_end_date (end_date)
);
```

#### 2. Table: `user_limits_override`

```sql
CREATE TABLE user_limits_override (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Limits (NULL = use plan default)
    max_accounts INTEGER NULL,
    max_automation_rules INTEGER NULL,
    max_campaigns INTEGER NULL,
    
    -- Metadata
    notes TEXT NULL,
    set_by VARCHAR(255) NULL,  -- Admin user_id
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### User Portal APIs

```typescript
// 1. Calculate addon price (pro-rata)
GET /api/addons/calculate-price
Query: ?quantity=1
Response: {
  quantity: 1,
  pricePerMonth: 99000,
  remainingDays: 30,
  prorataPrice: 99000,
  subscriptionEndDate: "2026-04-01"
}

// 2. Purchase addon
POST /api/addons/purchase
Body: {
  quantity: 1,
  addonType: "extra_accounts"
}
Response: {
  success: true,
  transactionId: "TRX-xxx",
  totalPrice: 99000,
  paymentInstructions: {...}
}

// 3. Get user effective limits (plan + addons)
GET /api/user/effective-limits
Response: {
  planId: "3-month",
  planLimits: { maxAccounts: 2, ... },
  activeAddons: [
    { type: "extra_accounts", quantity: 2, endDate: "2026-04-01" }
  ],
  effectiveLimits: { maxAccounts: 4, ... },
  usage: { accounts: 3, rules: 5, campaigns: 10 }
}

// 4. Renewal with addons
POST /api/subscriptions/renew
Body: {
  planId: "3-month",
  includeAddons: true,  // or array of addon IDs to include
  removeAddons: []      // addon IDs to remove
}
```

#### Admin APIs

```typescript
// 1. Set user limit override
POST /api/admin/users/:userId/limits-override
Body: {
  maxAccounts: 10,
  maxAutomationRules: null,  // null = use plan default
  maxCampaigns: null,
  notes: "Special deal for enterprise client"
}

// 2. Get user limits detail
GET /api/admin/users/:userId/limits-detail
Response: {
  user: {...},
  plan: {...},
  addons: [...],
  override: {...},
  effectiveLimits: {...}
}
```

### Logic Updates

#### Update `subscription-limits.ts`

```typescript
// New function: Get effective limits (plan + addons + override)
export async function getUserEffectiveLimits(
  connection: PoolClient,
  userId: string
): Promise<SubscriptionInfo> {
  // 1. Get plan limits
  const planLimits = await getUserSubscriptionLimits(connection, userId)
  
  // 2. Get active addons
  const addonsResult = await connection.query(
    `SELECT addon_type, quantity 
     FROM account_addons 
     WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
    [userId]
  )
  
  // 3. Calculate total from addons
  let addonAccounts = 0
  for (const addon of addonsResult.rows) {
    if (addon.addon_type === 'extra_accounts') {
      addonAccounts += addon.quantity
    }
  }
  
  // 4. Apply override if exists (already handled in getUserSubscriptionLimits)
  
  // 5. Return effective limits
  return {
    ...planLimits,
    limits: {
      maxAccounts: planLimits.limits.maxAccounts === -1 
        ? -1 
        : planLimits.limits.maxAccounts + addonAccounts,
      maxAutomationRules: planLimits.limits.maxAutomationRules,
      maxCampaigns: planLimits.limits.maxCampaigns,
    }
  }
}
```

### UI Components

#### 1. Addon Purchase Modal

**Location:** `app/components/addon-purchase-modal.tsx`

**Features:**
- Display current limits and usage
- Show addon packages (1, 3, 5 toko)
- Calculate and display pro-rata price
- Checkout flow

#### 2. Renewal Page

**Location:** `app/components/subscription-renewal-page.tsx`

**Features:**
- Show current plan and addons
- Auto-include active addons
- Allow remove addons before payment
- Show warning if removing addons

#### 3. Admin Override Panel

**Location:** `adm/components/user-limits-override-panel.tsx`

**Features:**
- Search user
- View current limits (plan + addons + override)
- Set custom override
- Add notes for override reason

---

## 🎯 Edge Cases & Handling

### 1. User Upgrade Plan dengan Lebih Banyak Toko

**Scenario:**
- User punya: 2-toko plan + 1 addon = 3 toko total
- Upgrade ke: 6-month plan (sudah include 3 toko)

**Handling:**
- Addon tidak diperpanjang otomatis
- User notification: "Plan baru Anda sudah include 3 toko, addon tidak diperlukan lagi"
- Refund pro-rata untuk sisa hari addon (optional)

### 2. User Downgrade Plan

**Scenario:**
- User punya: 3-toko plan + 2 addon = 5 toko aktif
- Downgrade ke: 2-toko plan

**Handling:**
- Warning sebelum downgrade: "Anda punya 5 toko aktif, plan baru hanya support 2 toko"
- User harus pilih toko mana yang di-keep
- Toko lain otomatis non-aktif (data tetap ada)

### 3. Minimum Sisa Hari

**Scenario:**
- User mau beli addon tapi subscription tinggal 3 hari lagi

**Handling:**
- Block pembelian jika sisa < 7 hari
- Message: "Perpanjang subscription Anda dulu sebelum membeli addon"

### 4. Addon Expired

**Scenario:**
- Addon expired tapi user tidak perpanjang

**Handling:**
- Toko tambahan otomatis non-aktif
- Data tetap tersimpan
- Notification: "2 toko Anda telah non-aktif karena addon expired. Beli lagi untuk mengaktifkan."

---

## 📈 Success Metrics

### KPIs to Track

1. **Addon Conversion Rate**
   - % user yang beli addon dari total user aktif
   - Target: 20-30%

2. **Addon Renewal Rate**
   - % addon yang diperpanjang saat renewal
   - Target: 70-80%

3. **Average Revenue Per User (ARPU)**
   - Sebelum addon vs setelah addon
   - Target: +15-25%

4. **Addon Quantity Distribution**
   - Berapa banyak user beli 1, 3, atau 5 toko
   - Optimize pricing based on data

---

## 🚀 Next Steps

### Phase 1: Database & Backend (Week 1)
- [ ] Create `account_addons` table
- [ ] Create `user_limits_override` table
- [ ] Update `getUserSubscriptionLimits()` to include addons
- [ ] Create addon purchase API
- [ ] Create pro-rata calculation API

### Phase 2: User Portal UI (Week 2)
- [ ] Addon purchase modal
- [ ] Update accounts page to show addon option
- [ ] Renewal page with addon auto-include
- [ ] Testing & bug fixes

### Phase 3: Admin Panel (Week 3)
- [ ] User limits override panel
- [ ] Addon management view
- [ ] Reports & analytics

### Phase 4: Testing & Launch (Week 4)
- [ ] End-to-end testing
- [ ] Edge cases testing
- [ ] Soft launch to beta users
- [ ] Monitor metrics
- [ ] Full launch

---

## 📝 Notes

- Dokumen ini hasil diskusi tanggal 15 Januari 2026
- Status: Planning & Design
- Belum ada implementasi code
- Perlu approval sebelum mulai development

---

**Last Updated:** 15 Januari 2026  
**Contributors:** Discussion with User  
**Status:** ✅ Ready for Implementation
