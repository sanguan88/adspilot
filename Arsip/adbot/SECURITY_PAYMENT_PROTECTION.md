# Security: Payment Protection

## Overview
Dokumen ini menjelaskan sistem proteksi untuk memastikan user yang belum membayar (status `pending_payment`) tidak bisa mengakses fitur utama aplikasi.

## Protection Layers

### 1. Client-Side Protection (ProtectedRoute)
- **File**: `components/ProtectedRoute.tsx`
- **Fungsi**: Redirect user dengan `pending_payment` ke `/dashboard/payment-status`
- **Cakupan**: Semua halaman yang menggunakan `<ProtectedRoute>`
- **Keterbatasan**: Bisa di-bypass dengan manipulasi client-side

### 2. Server-Side Protection (requireActiveStatus)
- **File**: `lib/auth.ts`
- **Fungsi**: Memeriksa `status_user` dari database secara real-time
- **Keamanan**: Tidak bisa di-bypass karena check dilakukan di server
- **Penggunaan**: Semua API endpoints yang mengakses fitur utama

### 3. Database-Level Protection
- **Status User**:
  - `aktif`: User memiliki subscription aktif → Boleh akses semua fitur
  - `pending_payment`: User memiliki transaksi pending → Hanya boleh akses payment status
  - `inactive`: User tidak memiliki subscription → Tidak boleh akses

## API Endpoints Protection

### ✅ Protected (requireActiveStatus)
Endpoints berikut **HARUS** menggunakan `requireActiveStatus`:

1. **Dashboard & Overview**
   - `/api/overview` ✅

2. **Accounts Management**
   - `/api/accounts` (GET, POST, PUT) ✅
   - `/api/accounts/get-cookies` ✅
   - `/api/accounts/sync-report-aggregate` ✅
   - `/api/accounts/detail-per-date` ✅
   - `/api/accounts/save-campaign-data` ✅
   - `/api/accounts-simple` ✅

3. **Campaigns**
   - `/api/campaigns` (GET, POST) ✅
   - `/api/campaigns/products` ✅
   - `/api/campaigns/operation-log` ✅
   - `/api/campaigns/images` ✅

4. **Automation Rules**
   - `/api/automation-rules` (GET, POST) ✅
   - `/api/automation-rules/[id]` (GET, PUT, DELETE) ✅
   - `/api/automation/engine` ✅

5. **Rekam Medic**
   - `/api/rekam-medic` ✅
   - `/api/rekam-medic/images` ✅

6. **Reports & Analytics**
   - `/api/gmv-daily` ✅
   - `/api/logs` ✅

7. **User Features**
   - `/api/user/telegram-status` ✅
   - `/api/user/setup-telegram` ✅

### ❌ Not Protected (requireAuth only)
Endpoints berikut **TIDAK** perlu `requireActiveStatus` (boleh untuk `pending_payment`):

1. **Authentication**
   - `/api/auth/login`
   - `/api/auth/register`
   - `/api/auth/me`
   - `/api/auth/forgot-password`
   - `/api/auth/reset-password`

2. **Payment Status**
   - `/api/transactions/[transactionId]` (GET)
   - `/api/transactions/[transactionId]/proof` (POST)

3. **Public Endpoints**
   - `/api/payment-settings/public`

## Implementation

### Menggunakan requireActiveStatus

```typescript
import { requireActiveStatus } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication AND active status
    const user = await requireActiveStatus(request)
    
    // User is authenticated AND has active status
    // Proceed with API logic...
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    )
  }
}
```

### Error Handling

Jika user dengan `pending_payment` mencoba akses:
- **Status Code**: 401 Unauthorized
- **Error Message**: "Access denied. Payment required. Please complete your payment to access this feature."

## Testing Checklist

- [ ] User dengan `pending_payment` tidak bisa akses dashboard
- [ ] User dengan `pending_payment` tidak bisa akses accounts
- [ ] User dengan `pending_payment` tidak bisa akses campaigns
- [ ] User dengan `pending_payment` tidak bisa akses automation rules
- [ ] User dengan `pending_payment` bisa akses payment status page
- [ ] User dengan `pending_payment` bisa upload payment proof
- [ ] User dengan `aktif` bisa akses semua fitur
- [ ] API endpoints mengembalikan error 401 untuk `pending_payment`

## Security Notes

1. **Real-Time Check**: `requireActiveStatus` memeriksa status dari database setiap kali, bukan dari JWT token
2. **No Bypass**: Server-side check tidak bisa di-bypass dengan manipulasi client-side
3. **Status Sync**: Pastikan `status_user` selalu sync dengan `subscriptions` dan `transactions` tables
4. **Regular Audit**: Lakukan audit berkala untuk memastikan semua API endpoints terlindungi

## Update Log

- **2025-01-XX**: Implementasi `requireActiveStatus` untuk proteksi server-side
- **2025-01-XX**: Update `/api/overview` dan `/api/accounts` untuk menggunakan `requireActiveStatus`

