# Rate Limit Settings - Dokumentasi (Updated)

## Overview
Fitur Rate Limit Settings terintegrasi dengan sistem Settings yang sudah ada di Admin Panel. Admin dapat mengatur batasan percobaan login melalui halaman **Settings > Security tab**.

## Perubahan yang Dilakukan

### 1. Database Settings (system_settings table)
Settings baru yang ditambahkan ke tabel `system_settings`:

| Setting Key | Default | Type | Description |
|------------|---------|------|-------------|
| `security.maxLoginAttempts` | 5 | number | Maksimal percobaan login gagal |
| `security.loginWindowMinutes` | 15 | number | Durasi window untuk menghitung percobaan (menit) |
| `security.loginBlockDurationMinutes` | 30 | number | Durasi blokir setelah max attempts (menit) |
| `security.rateLimitEnabled` | true | boolean | Enable/disable rate limiting |

### 2. Rate Limit Library Update
**File:** `app/lib/rate-limit.ts`

**Perubahan:**
- Rate limit membaca konfigurasi dari `system_settings` table
- Caching konfigurasi selama 1 menit untuk performa
- Fallback ke default config jika database error
- Support untuk disable rate limiting via `rateLimitEnabled` flag

**Functions:**
- `checkRateLimit(identifier)`: Check rate limit untuk IP atau username
- `resetRateLimit(identifier)`: Reset rate limit untuk identifier tertentu
- `initializeRateLimitConfig()`: Preload config saat startup
- `getRateLimitConfig()`: Get fresh config from database
- `clearRateLimitConfigCache()`: Force refresh config

### 3. Admin Panel UI Update
**File:** `adm/components/settings-page.tsx`

**Perubahan:**
- Menambahkan 3 field baru di Security tab:
  - **Login Window (minutes)**: Time window to count login attempts
  - **Block Duration (minutes)**: Duration to block after max attempts
  - **Rate Limiting (toggle)**: Enable/disable rate limiting

**Screenshot lokasi:**
Admin Panel > Settings > Security tab

### 4. API Integration
Settings menggunakan API endpoint yang sudah ada:
- `GET /api/settings` - Mengambil semua settings
- `PUT /api/settings` - Update settings (termasuk rate limit)

## Cara Menggunakan

### 1. Setup Database
Jalankan script untuk menambahkan settings:
```bash
cd app
npx tsx scripts/create-rate-limit-settings.ts
```

### 2. Akses Admin Panel
1. Login sebagai Admin
2. Buka **Settings** dari sidebar
3. Klik tab **Security**
4. Scroll ke bawah untuk melihat rate limit settings:
   - Session Timeout
   - Max Login Attempts
   - Login Window (minutes) ← **BARU**
   - Block Duration (minutes) ← **BARU**
   - Rate Limiting toggle ← **BARU**

### 3. Konfigurasi Settings

#### Development Mode (Longgar)
```
Max Login Attempts: 100
Login Window: 60 minutes
Block Duration: 1 minute
Rate Limiting: ON
```

#### Production Mode (Strict)
```
Max Login Attempts: 3
Login Window: 15 minutes
Block Duration: 60 minutes
Rate Limiting: ON
```

#### Disable Rate Limiting
```
Rate Limiting: OFF
```

### 4. Testing
1. **Test Rate Limit Aktif:**
   - Login dengan password salah 5x (atau sesuai Max Login Attempts)
   - Seharusnya diblokir dengan pesan error
   - Tunggu sesuai Block Duration atau restart server

2. **Test Update Settings:**
   - Ubah Max Login Attempts menjadi 10
   - Klik "Save Settings"
   - Tunggu 1 menit (cache refresh)
   - Test login dengan password salah 10x

3. **Test Disable:**
   - Toggle Rate Limiting OFF
   - Klik "Save Settings"
   - Login dengan password salah berkali-kali
   - Seharusnya tidak diblokir

## Technical Details

### Cache Mechanism
- Rate limit config di-cache selama 1 menit
- Setelah 1 menit, config akan di-fetch ulang dari database
- Untuk force refresh, restart server atau tunggu cache expire

### Database Query
```sql
SELECT setting_key, setting_value, setting_type 
FROM system_settings 
WHERE setting_key IN (
  'security.maxLoginAttempts',
  'security.loginWindowMinutes', 
  'security.loginBlockDurationMinutes',
  'security.rateLimitEnabled'
)
```

### Rate Limit Storage
- In-memory storage menggunakan `Map<string, RateLimitEntry>`
- Key: IP address atau username
- Value: { attempts, resetTime, blocked }
- Data hilang saat server restart (by design)

## Validation Rules

### Max Login Attempts
- Minimum: 1
- Maximum: 1000
- Default: 5

### Login Window Minutes
- Minimum: 1
- Maximum: 1440 (24 jam)
- Default: 15

### Block Duration Minutes
- Minimum: 1
- Maximum: 10080 (7 hari)
- Default: 30

## Troubleshooting

### Settings tidak berubah setelah save
- Tunggu 1 menit untuk cache refresh
- Atau restart server untuk force refresh

### Rate limit tidak bekerja
- Cek apakah `rateLimitEnabled` = true
- Cek database apakah settings tersimpan
- Cek console log untuk error

### User masih bisa login meskipun diblokir
- Cek apakah IP atau username yang sama
- Rate limit berdasarkan IP DAN username
- Restart server akan reset semua blokir

## Migration Notes

### Dari Hardcoded ke Database-driven
Sebelumnya rate limit config hardcoded di `lib/rate-limit.ts`:
```typescript
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 30 * 60 * 1000,
}
```

Sekarang config dibaca dari database dengan fallback ke default jika database error.

## Future Enhancements
1. Redis integration untuk persistent storage
2. Per-user rate limit customization
3. IP whitelist/blacklist
4. Email notification saat user diblokir
5. Audit log untuk login attempts
