# SKEMA KOMISI AFFILIATE - ADSPILOT
**Dokumentasi Lengkap**  
**Tanggal:** 11 Januari 2026  
**Version:** 1.0

---

## 📋 RINGKASAN EKSEKUTIF

Sistem affiliate AdsPilot menggunakan **First-Click Attribution** dengan **Lifetime Recurring Commission**. Skema ini dirancang untuk memberikan passive income yang sustainable kepada affiliates sambil memastikan fairness dalam attribution.

### Key Features:
- ✅ **First-Click Attribution** - Link pertama yang diklik menang
- ✅ **Cookie Expiry: 3 Bulan** - Cookie valid selama 90 hari
- ✅ **Lifetime Recurring Commission** - Komisi selamanya dari setiap pembayaran
- ✅ **Minimum Payout: Rp 50.000**
- ✅ **Payout Schedule: 2x/bulan** (Minggu ke-2 & ke-4)
- ✅ **No Commission for Trial** - Hanya pembayaran real (Rp > 0)
- ✅ **Configurable via Admin Portal** - Semua setting bisa diatur admin

---

## 🎯 1. COMMISSION STRUCTURE

### 1.1 Commission Rate
- **Default:** 10% (configurable per affiliate)
- **Flexible:** Admin dapat set rate berbeda untuk setiap affiliate
- **Contoh:**
  - Affiliate A: 10% (standard)
  - Affiliate B: 15% (top performer)
  - Affiliate C: 20% (strategic partner)

### 1.2 Commission Types
1. **First Payment Commission**
   - Komisi dari pembayaran pertama user
   - Type: `first_payment`
   
2. **Recurring Commission (LIFETIME)**
   - Komisi dari setiap pembayaran berulang
   - Type: `recurring`
   - Duration: **SELAMANYA** selama user tetap subscribe

### 1.3 Commission Calculation
```javascript
commission_amount = transaction_amount * (commission_rate / 100)

// Contoh:
// Transaction: Rp 149.000
// Rate: 10%
// Commission: Rp 149.000 * 0.10 = Rp 14.900
```

### 1.4 Trial Gratis (No Commission)
- Trial gratis 7 hari (Rp 0) = **TIDAK** ada komisi
- Hanya pembayaran REAL (amount > 0) yang menghasilkan komisi

---

## 🔗 2. REFERRAL ATTRIBUTION

### 2.1 First-Click Attribution Model

**Rule:** Link PERTAMA yang diklik user = PEMENANG

**Cara Kerja:**
```
Day 1: User klik link Affiliate A "JOHN123"
       → Cookie: referral_code = "JOHN123", expires = Day 91

Day 5: User klik link Affiliate B "JANE456"
       → Cookie TIDAK berubah (masih "JOHN123")
       → FIRST-CLICK WINS!

Day 10: User signup
        → Database: referred_by_affiliate = "JOHN123"
        → John menang! Jane tidak dapat apa-apa
```

### 2.2 Cookie Expiry: 3 Bulan (90 Hari)

**Lifecycle:**
```
Klik Link → Cookie Set (90 days) → User Signup → Attribution Locked
```

**Setelah Cookie Expired:**
```
Day 1: Cookie "JOHN123" (expires Day 91)
Day 95: Cookie expired
Day 96: User klik link "JANE456"
        → Cookie baru: "JANE456" (expires Day 186)
        → Jane bisa "claim" user
```

### 2.3 Attribution Lock

Setelah user signup, attribution **LOCKED SELAMANYA**:
```
User signup via "JOHN123"
→ referred_by_affiliate = "JOHN123" (permanent)
→ Semua pembayaran future → John dapat komisi
→ Tidak bisa berubah ke affiliate lain
```

---

## 💰 3. PAYOUT SYSTEM

### 3.1 Minimum Payout
- **Amount:** Rp 50.000
- **Rule:** Affiliate harus kumpulkan minimal Rp 50.000 untuk withdraw
- **Contoh:**
  ```
  Saldo: Rp 45.000 → Belum bisa withdraw ❌
  Saldo: Rp 55.000 → Bisa withdraw Rp 55.000 ✅
  ```

### 3.2 Payout Schedule: 2x Per Bulan

**Jadwal:**
- **Payout #1:** Minggu ke-2 setiap bulan (tanggal 8-14)
- **Payout #2:** Minggu ke-4 setiap bulan (tanggal 22-28)

**Contoh Januari 2026:**
```
Payout #1: 8-14 Januari
Payout #2: 22-28 Januari
```

### 3.3 Payout Process

```
1. Auto-Generate Payout Batch
   ↓
2. Admin Review & Approve
   ↓
3. Transfer ke Rekening Affiliate
   ↓
4. Update Status: pending → paid
```

### 3.4 Commission Status

- **`pending`** - Komisi belum dibayar
- **`paid`** - Komisi sudah dibayar
- **`cancelled`** - Komisi dibatalkan (refund, chargeback)

---

## 📊 4. DATABASE SCHEMA

### 4.1 Tabel: `affiliates`
```sql
CREATE TABLE affiliates (
  affiliate_id VARCHAR(50) PRIMARY KEY,
  affiliate_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
  commission_rate DECIMAL(5,2) DEFAULT 10.00, -- %
  photo_profile TEXT,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX idx_affiliates_status ON affiliates(status);
```

### 4.2 Tabel: `affiliate_referrals`
```sql
CREATE TABLE affiliate_referrals (
  referral_id SERIAL PRIMARY KEY,
  affiliate_id VARCHAR(50) NOT NULL,
  user_id INTEGER NOT NULL,
  referral_code VARCHAR(50) NOT NULL,
  first_click_date TIMESTAMP NOT NULL,
  signup_date TIMESTAMP,
  first_payment_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, converted, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX idx_referrals_user ON affiliate_referrals(user_id);
CREATE INDEX idx_referrals_status ON affiliate_referrals(status);
```

### 4.3 Tabel: `affiliate_commissions`
```sql
CREATE TABLE affiliate_commissions (
  commission_id SERIAL PRIMARY KEY,
  affiliate_id VARCHAR(50) NOT NULL,
  referral_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  order_id VARCHAR(100),
  type VARCHAR(20) NOT NULL, -- first_payment, recurring
  amount DECIMAL(15,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
  payout_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id),
  FOREIGN KEY (referral_id) REFERENCES affiliate_referrals(referral_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX idx_commissions_type ON affiliate_commissions(type);
CREATE INDEX idx_commissions_payout ON affiliate_commissions(payout_id);
```

### 4.4 Tabel: `affiliate_payouts`
```sql
CREATE TABLE affiliate_payouts (
  payout_id SERIAL PRIMARY KEY,
  payout_batch VARCHAR(50) UNIQUE NOT NULL, -- e.g., "2026-01-W2"
  payout_date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  total_affiliates INTEGER NOT NULL,
  total_commissions INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by INTEGER, -- admin user_id
  paid_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_payouts_batch ON affiliate_payouts(payout_batch);
CREATE INDEX idx_payouts_status ON affiliate_payouts(status);
CREATE INDEX idx_payouts_date ON affiliate_payouts(payout_date);
```

### 4.5 Tabel: `affiliate_settings`
```sql
CREATE TABLE affiliate_settings (
  setting_id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER -- admin user_id
);

-- Default Settings
INSERT INTO affiliate_settings (setting_key, setting_value, description) VALUES
('default_commission_rate', '10', 'Default commission rate (%)'),
('minimum_payout', '50000', 'Minimum payout amount (Rp)'),
('cookie_expiry_days', '90', 'Referral cookie expiry in days (3 months)'),
('attribution_model', 'first_click', 'Attribution model: first_click or last_click'),
('payout_schedule_week2', 'true', 'Enable payout on week 2'),
('payout_schedule_week4', 'true', 'Enable payout on week 4'),
('trial_commission_enabled', 'false', 'Enable commission for trial'),
('lifetime_attribution', 'true', 'Enable lifetime referral attribution');
```

### 4.6 Tabel: `users` (Update)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_affiliate VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_cookie_first_click TIMESTAMP;

CREATE INDEX idx_users_referral ON users(referred_by_affiliate);
```

---

## 🔧 5. TECHNICAL IMPLEMENTATION

### 5.1 Cookie Management

**Set Cookie (First-Click):**
```javascript
function setReferralCookie(referralCode) {
  // Cek apakah sudah ada cookie
  const existingCookie = getCookie('referral_code');
  
  if (existingCookie) {
    // FIRST-CLICK WINS - jangan overwrite!
    console.log('Referral already set:', existingCookie);
    return;
  }
  
  // Set cookie baru (90 days)
  const maxAge = 90 * 24 * 60 * 60; // 90 days in seconds
  document.cookie = `referral_code=${referralCode}; max-age=${maxAge}; path=/; secure; samesite=strict`;
  
  // Track first click
  const firstClick = new Date().toISOString();
  localStorage.setItem('referral_first_click', firstClick);
}
```

**Get Cookie:**
```javascript
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
```

### 5.2 Tracking Endpoint

**API: `/api/tracking/click`**
```typescript
export async function POST(request: NextRequest) {
  const { referralCode } = await request.json();
  
  // Validate referral code
  const affiliate = await db.query(
    'SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1 AND status = $2',
    [referralCode, 'active']
  );
  
  if (affiliate.rows.length === 0) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
  }
  
  // Log click (for analytics)
  await db.query(
    `INSERT INTO affiliate_clicks (affiliate_id, referral_code, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [affiliate.rows[0].affiliate_id, referralCode, getIP(request), getUserAgent(request)]
  );
  
  return NextResponse.json({ success: true });
}
```

### 5.3 Signup Flow

**API: `/api/auth/signup`**
```typescript
export async function POST(request: NextRequest) {
  const { email, password, nama } = await request.json();
  
  // Get referral code from cookie
  const cookies = request.cookies;
  const referralCode = cookies.get('referral_code')?.value;
  
  // Create user
  const user = await db.query(
    `INSERT INTO users (email, password_hash, nama_lengkap, referred_by_affiliate, referral_date)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING user_id`,
    [email, hashedPassword, nama, referralCode || null]
  );
  
  // If referral exists, create referral record
  if (referralCode) {
    const affiliate = await db.query(
      'SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1',
      [referralCode]
    );
    
    if (affiliate.rows.length > 0) {
      await db.query(
        `INSERT INTO affiliate_referrals (affiliate_id, user_id, referral_code, first_click_date, signup_date, status)
         VALUES ($1, $2, $3, NOW(), NOW(), 'converted')`,
        [affiliate.rows[0].affiliate_id, user.rows[0].user_id, referralCode]
      );
    }
  }
  
  return NextResponse.json({ success: true });
}
```

### 5.4 Commission Creation

**Trigger: Saat Payment Success**
```typescript
async function createCommission(transactionId: string, userId: number, amount: number) {
  // Get user's referral info
  const user = await db.query(
    'SELECT referred_by_affiliate FROM users WHERE user_id = $1',
    [userId]
  );
  
  const referralCode = user.rows[0]?.referred_by_affiliate;
  
  if (!referralCode) {
    // No referral, skip commission
    return;
  }
  
  // Get affiliate info
  const affiliate = await db.query(
    `SELECT a.affiliate_id, a.commission_rate, ar.referral_id
     FROM affiliates a
     JOIN affiliate_referrals ar ON a.affiliate_id = ar.affiliate_id
     WHERE a.affiliate_code = $1 AND ar.user_id = $2`,
    [referralCode, userId]
  );
  
  if (affiliate.rows.length === 0) {
    return;
  }
  
  const { affiliate_id, commission_rate, referral_id } = affiliate.rows[0];
  
  // Calculate commission
  const commissionAmount = amount * (commission_rate / 100);
  
  // Determine type (first_payment or recurring)
  const existingCommissions = await db.query(
    'SELECT COUNT(*) as count FROM affiliate_commissions WHERE user_id = $1',
    [userId]
  );
  
  const type = existingCommissions.rows[0].count === '0' ? 'first_payment' : 'recurring';
  
  // Create commission
  await db.query(
    `INSERT INTO affiliate_commissions 
     (affiliate_id, referral_id, user_id, transaction_id, type, amount, commission_rate, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [affiliate_id, referral_id, userId, transactionId, type, commissionAmount, commission_rate]
  );
}
```

---

## 📈 6. CONTOH PERHITUNGAN

### 6.1 Single User - 1 Year

**Asumsi:**
- Commission Rate: 10%
- Monthly Plan: Rp 149.000/bulan
- User subscribe 12 bulan

**Perhitungan:**
```
Month 1 (First Payment):
  Transaction: Rp 149.000
  Commission: Rp 14.900 (first_payment)

Month 2-12 (Recurring):
  Transaction: Rp 149.000 x 11 = Rp 1.639.000
  Commission: Rp 163.900 (recurring)

Total Year 1:
  Total Transaction: Rp 1.788.000
  Total Commission: Rp 178.800
```

### 6.2 Multiple Users - 1 Year

**Asumsi:**
- Affiliate "John" dengan 10% commission
- 5 users signup via John
- Semua subscribe Monthly (Rp 149.000)

**Perhitungan:**
```
User A: Rp 178.800 (12 months)
User B: Rp 178.800 (12 months)
User C: Rp 149.000 (10 months, cancel month 11)
User D: Rp 59.600 (4 months, cancel month 5)
User E: Rp 14.900 (1 month trial, tidak lanjut)

Total Commission Year 1: Rp 581.100
Average per User: Rp 116.220
```

### 6.3 Lifetime Value (3 Years)

**Asumsi:**
- 1 user loyal subscribe 3 tahun
- Monthly Rp 149.000
- Commission 10%

**Perhitungan:**
```
Year 1: Rp 178.800
Year 2: Rp 178.800
Year 3: Rp 178.800

Total 3 Years: Rp 536.400 (dari 1 user saja!)
```

---

## 🎛️ 7. ADMIN PORTAL CONFIGURATION

### 7.1 Affiliate Settings Page

**Location:** `/admin/affiliates/settings`

**Features:**
```
┌─────────────────────────────────────────────┐
│ Affiliate System Settings                   │
├─────────────────────────────────────────────┤
│                                             │
│ Commission Settings                         │
│ ├─ Default Rate: [10] %                     │
│ └─ Allow Custom Rate: [✓] Yes               │
│                                             │
│ Attribution Settings                        │
│ ├─ Model: [First-Click ▼]                   │
│ └─ Cookie Expiry: [90] days                 │
│                                             │
│ Payout Settings                             │
│ ├─ Minimum Payout: Rp [50,000]              │
│ ├─ Schedule Week 2: [✓] Enabled             │
│ └─ Schedule Week 4: [✓] Enabled             │
│                                             │
│ Commission Rules                            │
│ ├─ Trial Commission: [✗] Disabled           │
│ └─ Lifetime Recurring: [✓] Enabled          │
│                                             │
│ [Save Settings]                             │
└─────────────────────────────────────────────┘
```

### 7.2 Affiliate Management

**Location:** `/admin/affiliates`

**Features:**
- View all affiliates
- Create new affiliate
- Edit affiliate (custom commission rate)
- Suspend/Activate affiliate
- View affiliate performance

### 7.3 Commission Management

**Location:** `/admin/affiliates/commissions`

**Features:**
- View all commissions
- Filter by status (pending/paid)
- Filter by type (first_payment/recurring)
- Manual commission adjustment
- Export commission report

### 7.4 Payout Management

**Location:** `/admin/affiliates/payouts`

**Features:**
- Generate payout batch
- Review pending payouts
- Approve payout batch
- Mark as paid
- Export payout report

---

## 📊 8. REPORTING & ANALYTICS

### 8.1 Affiliate Dashboard

**Metrics:**
```
┌──────────────────────────────────────────┐
│ Dashboard Overview                       │
├──────────────────────────────────────────┤
│ Total Earnings: Rp 1.250.000            │
│ ├─ Paid: Rp 850.000                     │
│ └─ Pending: Rp 400.000                  │
│                                          │
│ This Month: Rp 175.000                  │
│ Last Month: Rp 220.000                  │
│                                          │
│ Active Referrals: 15                    │
│ Total Referrals: 25                     │
│                                          │
│ Conversion Rate: 60% (15/25)            │
│ Average Commission: Rp 83.333           │
└──────────────────────────────────────────┘
```

### 8.2 Admin Analytics

**Metrics:**
```
┌──────────────────────────────────────────┐
│ Affiliate System Analytics               │
├──────────────────────────────────────────┤
│ Total Affiliates: 50                    │
│ ├─ Active: 42                           │
│ └─ Inactive: 8                          │
│                                          │
│ Total Commissions (All Time)            │
│ ├─ Paid: Rp 15.500.000                  │
│ └─ Pending: Rp 3.200.000                │
│                                          │
│ This Month                               │
│ ├─ New Referrals: 35                    │
│ ├─ Conversions: 18                      │
│ └─ Commission: Rp 2.100.000             │
│                                          │
│ Top Performers                           │
│ 1. John Doe - Rp 850.000                │
│ 2. Jane Smith - Rp 720.000              │
│ 3. Mike Johnson - Rp 650.000            │
└──────────────────────────────────────────┘
```

---

## 🔐 9. SECURITY & FRAUD PREVENTION

### 9.1 Anti-Fraud Measures

1. **IP Tracking**
   - Track IP address untuk setiap click
   - Detect suspicious patterns (same IP multiple clicks)

2. **Cookie Validation**
   - Validate cookie integrity
   - Prevent cookie manipulation

3. **Referral Validation**
   - Validate referral code exists
   - Check affiliate status (active)

4. **Payment Validation**
   - Only real payments (amount > 0) generate commission
   - Validate transaction status before creating commission

5. **Chargeback Handling**
   - If payment refunded, cancel commission
   - Update commission status to 'cancelled'

### 9.2 Affiliate Terms & Conditions

**Key Points:**
- No self-referral allowed
- No fake accounts
- No spam/misleading marketing
- Commission subject to verification
- AdsPilot reserves right to cancel commission for fraud

---

## 📝 10. CHANGELOG

### Version 1.0 (11 Jan 2026)
- Initial documentation
- First-Click Attribution model
- 3-month cookie expiry
- Lifetime recurring commission
- Minimum payout Rp 50.000
- Payout schedule 2x/month

---

## 🎯 11. NEXT STEPS

### Implementation Checklist:

- [ ] Create database tables
- [ ] Implement cookie tracking
- [ ] Build tracking endpoint
- [ ] Update signup flow
- [ ] Create commission trigger
- [ ] Build admin settings page
- [ ] Build affiliate dashboard
- [ ] Build payout management
- [ ] Setup automated payout batch generation
- [ ] Create email notifications
- [ ] Build reporting & analytics
- [ ] Testing & QA
- [ ] Documentation for affiliates
- [ ] Launch affiliate program

---

## 📞 SUPPORT

Untuk pertanyaan atau issue terkait affiliate system:
- Email: support@adspilot.com
- Telegram: @adspilot_support

---

**Dokumen ini adalah referensi resmi untuk Affiliate Commission Scheme AdsPilot.**  
**Terakhir diupdate:** 11 Januari 2026  
**Version:** 1.0
