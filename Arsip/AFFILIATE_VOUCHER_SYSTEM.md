# Sistem Voucher Affiliate - Multi-Touch Attribution

## Tanggal: 16 Januari 2026

## Ringkasan Konsep
Sistem voucher affiliate memungkinkan affiliate membuat kode voucher unik yang **otomatis diterapkan** ketika user mengklik link referral mereka. Ini memberikan **fairness** karena affiliate yang mengakuisisi user akan mendapatkan komisi.

## Spesifikasi

### Pricing Model
| Item | Nilai |
|------|-------|
| Harga Display (Gimik) | Rp 699.000 |
| Harga Real (Setelah Diskon) | Rp 349.500 |
| Diskon Affiliate | Fixed 50% |
| Komisi Affiliate | 30% dari harga real = Rp 104.850 |

### Aturan Prioritas Voucher
```
if (affiliate_voucher exists) {
  → Apply affiliate voucher
  → Affiliate dapat komisi
} else if (default_voucher enabled) {
  → Apply default voucher
  → Tidak ada komisi
}
```

### Flow Auto-Inject Voucher
```
User klik: adspilot.id?ref=RIZKI
    │
    ▼
Landing Page:
    1. Set cookie: referral_code=RIZKI
    2. Lookup voucher milik RIZKI
    3. Set cookie: affiliate_voucher=RIZKI50
    │
    ▼
Checkout Page:
    1. Detect affiliate_voucher cookie
    2. Pre-fill voucher: RIZKI50
    3. User checkout dengan RIZKI50
    │
    ▼
Payment Confirmed:
    → Komisi Rp 104.850 ke RIZKI
```

## Keuntungan
- **Fairness**: Affiliate yang akuisisi = yang dapat komisi
- **Intent-Based**: User purposefully pakai kode affiliate
- **Trackable**: Setiap affiliate tahu persis konversi dari kode mereka
- **Simple UI**: Affiliate hanya input nama kode, diskon fixed

## Status
🔄 Dalam Implementasi - Running on Local

**Services Running:**
- Affiliate Portal: http://localhost:3003
- Landing Page: http://localhost:3001
- User Portal: http://localhost:3000

**Checklist:**
- [x] Database: `affiliate_vouchers` table
- [x] Database: `voucher_affiliate_id` column di transactions
- [x] Affiliate API: `/api/vouchers` (create, list, delete)
- [x] Affiliate UI: `/dashboard/vouchers` page
- [x] Landing Page: Auto-inject voucher cookie
- [x] Checkout: Priority affiliate voucher > default
- [x] Register: Support affiliate voucher validation
- [x] Commission: Prioritize voucher > cookie attribution
