# Bypass Authentication - Development Mode

Fitur bypass authentication untuk memudahkan development dan testing tanpa perlu validasi password.

## Cara Mengaktifkan Bypass

### Opsi 1: Via Environment Variable (Recommended)

Tambahkan ke file `.env.local`:

```env
BYPASS_AUTH=true
BYPASS_USERNAME=admin
```

### Opsi 2: Via Browser Console (Temporary)

Buka browser console dan jalankan:

```javascript
localStorage.setItem('BYPASS_AUTH', 'true')
location.reload()
```

Untuk disable:
```javascript
localStorage.removeItem('BYPASS_AUTH')
location.reload()
```

## Cara Menggunakan

1. **Enable bypass** dengan salah satu cara di atas
2. **Login** dengan username berikut (password bisa apa saja):
   - `admin`
   - `test`
   - Atau username yang di-set di `BYPASS_USERNAME`

3. Sistem akan otomatis login tanpa validasi password

## Fitur Bypass

- ✅ Login tanpa validasi password
- ✅ Auto-login saat bypass enabled
- ✅ Bypass protected routes
- ✅ User role: `superadmin` (full access)

## Keamanan

⚠️ **PENTING**: 
- Hanya gunakan bypass di **development environment**
- **JANGAN** enable bypass di production
- Pastikan `BYPASS_AUTH=false` atau tidak ada di production

## Disable Bypass

Set `BYPASS_AUTH=false` di `.env.local` atau hapus dari localStorage:

```javascript
localStorage.removeItem('BYPASS_AUTH')
```

