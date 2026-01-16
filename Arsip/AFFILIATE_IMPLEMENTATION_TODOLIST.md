# Todolist Implementasi Affiliate Hybrid (Dual Entry)

Dokumen ini berisi langkah-langkah teknis untuk mengimplementasikan skenario pendaftaran affiliate Hybrid (Public & Subscriber One-Click).

## 🚀 Phase 1: Backend API (Service Affiliate)
Fokus: Membuat "pintu belakang" agar User Portal bisa mendaftarkan user ke Affiliate System.

- [x] **Create Internal Registration Endpoint**
    - Lokasi: `aff/app/api/internal/create-affiliate/route.ts`
    - Method: `POST`
    - Payload: `{ email, name, password_hash, whatsapp, telegram }`

- [x] **Security Setup**
    - `INTERNAL_API_SECRET` ready in `.env.local`

## 💻 Phase 2: User Dashboard UI (Service App)
Fokus: Menyediakan antarmuka bagi subscriber untuk bergabung.

- [x] **Add "Partner Affiliate" Menu**
    - Lokasi: `app/components/dashboard-layout.tsx` (Updated sidebarItems)
    - Action: Added item menu baru "Partner Affiliate" with Share2 icon.

- [x] **Create Activation Page**
    - Lokasi: `app/app/affiliate/page.tsx`
    - Content: UI Hero Banner, Benefits List, Activation Button.
    - Integration: Connected to `/api/user/activate-affiliate`.

- [x] **Integration Logic Details**
    - API Perantara: `app/app/api/user/activate-affiliate/route.ts` created.
    - Logic: Auth Check -> Query Password Hash -> Call Internal API -> Return Result.

## 🌐 Phase 3: Public Registration (Service Affiliate)
Fokus: Memastikan pendaftaran manual berjalan lancar.

- [x] **Audit Existing Register Page** (Existing functionality validated previously)
    - Lokasi: `aff/app/auth/register/page.tsx`

## 🧪 Phase 4: Testing & Validation
- [x] **Run Services:**
    - App Portal: Port 3000
    - Affiliate Portal: Port 3003 (Need to run `npm run dev -- -p 3003` in `aff` folder)
    
- [x] **Test Skenario B (Subscriber):**
    1. Login User Portal.
    2. Click Menu "Affiliate".
    3. Click "Aktifkan Akun Sekarang".
    4. Verify Success Modal & Affiliate Code.
    5. Click "Buka Portal Affiliate" and Try Login using same credentials.

- [x] **Test Skenario A (Public):** Register manual via `localhost:3003/auth/register` (Optional regression test).
