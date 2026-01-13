# Enable Bypass Authentication

Untuk mengaktifkan bypass authentication, edit file `.env.local` dan set:

```env
BYPASS_AUTH=true
```

Atau hapus/comment line `BYPASS_AUTH=false` jika ada.

**Default behavior:**
- Di development mode (NODE_ENV !== 'production'), bypass **AKTIF secara default**
- Di production mode, bypass **NONAKTIF** kecuali di-set `BYPASS_AUTH=true`

**Username yang bisa bypass:**
- `admin`
- `test`
- `bypass`
- `dev`
- `developer`
- Atau username yang di-set di `BYPASS_USERNAME`

**Password:** Bisa apa saja (akan di-bypass)

Setelah edit `.env.local`, **restart development server** untuk apply changes.

