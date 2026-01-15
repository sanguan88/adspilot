# Telegram Bot Migration - 2026-01-15

## Overview

Migrasi konfigurasi Telegram Bot dari brand lama ke brand baru AdsPilot, termasuk unified token untuk semua portal.

---

## Bot Configuration

| Setting | Nilai |
|---------|-------|
| **Bot Token** | `8489555840:AAHFNTi2UeqLjM8eCAtFneNPVwBRmrAeb00` |
| **Bot Username** | `@adspilot_bot` |
| **Webhook URL** | `https://app.adspilot.id/api/telegram/webhook` |

---

## Domain Migration

| Lama | Baru |
|------|------|
| `shopadexpert.com` | `adspilot.id` |
| `ads.sorobot.id` | `app.adspilot.id` |
| `aff.shopadexpert.com` | `aff.adspilot.id` |
| `support@shopadexpert.com` | `support@adspilot.id` |
| `payment@shopadexpert.com` | `payment@adspilot.id` |
| `shopadexpertbot` | `adspilot_bot` |

---

## Files Updated

### Environment Files (.env)

| File | Perubahan |
|------|-----------|
| `app/.env` | Token, Webhook URL, APP_URL → `app.adspilot.id` |
| `app/.env.local` | Token, Webhook URL, APP_URL → `app.adspilot.id` |
| `adm/.env.local` | Token, Webhook URL → `app.adspilot.id` |
| `aff/.env.local` | Token, Webhook URL → `app.adspilot.id` |

### Source Code Files

| File | Perubahan |
|------|-----------|
| `app/tele/config.ts` | Bot username → `adspilot_bot` |
| `app/tele/service.ts` | Fallback URL → `app.adspilot.id` |
| `app/tele/webhook.ts` | Login URL, base URL → `app.adspilot.id` |
| `app/app/auth/payment-confirmation/page.tsx` | Email → `support@adspilot.id` |
| `app/app/dashboard/payment-status/page.tsx` | Email → `payment@adspilot.id` |
| `app/app/api/transactions/[transactionId]/proof/route.ts` | Domain → `app.adspilot.id` |
| `app/app/api/invoices/[transactionId]/route.ts` | Email → `support@adspilot.id` |
| `adm/components/affiliates-management-page.tsx` | Affiliate URL → `aff.adspilot.id` |
| `adm/components/payment-settings-page.tsx` | Email → `support@adspilot.id` |
| `adm/app/api/invoices/[transactionId]/route.ts` | Email → `support@adspilot.id` |
| `aff/app/api/links/route.ts` | Base URL → `aff.adspilot.id` |
| `landing-page-v2/tele/config.ts` | Bot username → `adspilot_bot` |
| `landing-page-v2/tele/service.ts` | Fallback URL → `app.adspilot.id` |
| `landing-page-v2/tele/webhook.ts` | Login URL, base URL → `app.adspilot.id` |
| `landing-page-v2/app/auth/payment-confirmation/page.tsx` | Email → `support@adspilot.id` |
| `landing-page-v2/app/dashboard/payment-status/page.tsx` | Email → `payment@adspilot.id` |

---

## Notification Schema

### Admin Portal (adm)

| Notifikasi | Trigger | Target |
|------------|---------|--------|
| Registrasi Baru | User baru mendaftar | Superadmin dengan `chatid_tele` |

**Lokasi:** `app/app/api/auth/register/route.ts`

### User Portal (app)

| Notifikasi | Trigger | Target |
|------------|---------|--------|
| Rule Automation | Kondisi terpenuhi | User dengan `chatid_tele` |
| Setup Confirmation | User connect Telegram | User chat ID |
| Login via Telegram | `/login_adbot` command | User chat ID |
| Reset Password | `/reset_adbot` command | User chat ID |
| Status Akun | `/status_adbot` command | User chat ID |

**Lokasi:** 
- `app/worker/rule-executor.ts` (automation)
- `app/tele/webhook.ts` (commands)

---

## Bot Commands

| Command | Fungsi |
|---------|--------|
| `/start` | Mulai dan hubungkan akun (via deep link) |
| `/login_adbot` | Login via Telegram |
| `/reset_adbot` | Reset password via Telegram |
| `/status_adbot` | Cek status akun |

---

## Webhook Verification

```json
GET https://api.telegram.org/bot8489555840:AAHFNTi2UeqLjM8eCAtFneNPVwBRmrAeb00/getWebhookInfo

Response:
{
  "ok": true,
  "result": {
    "url": "https://app.adspilot.id/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "ip_address": "154.19.37.198"
  }
}
```

**Endpoint Test:**
```json
GET https://app.adspilot.id/api/telegram/webhook

Response:
{
  "success": true,
  "message": "Telegram webhook endpoint"
}
```

---

## Subdomain Structure

| Subdomain | Portal | Keterangan |
|-----------|--------|------------|
| `adspilot.id` | Landing Page | Public website |
| `app.adspilot.id` | User Portal | Dashboard user + Telegram webhook |
| `aff.adspilot.id` | Affiliate Portal | Dashboard affiliate |

---

## Deployment Notes

Setelah perubahan `.env`, lakukan deploy ulang:

1. **User Portal (app)** → Deploy ke `app.adspilot.id`
2. **Admin Portal (adm)** → Deploy ke admin server/internal
3. **Affiliate Portal (aff)** → Deploy ke `aff.adspilot.id`
4. **Landing Page (landing-page-v2)** → Deploy ke `adspilot.id`

---

## Migration Date

**Tanggal:** 2026-01-15  
**Waktu:** 09:00 - 09:22 WIB  
**Status:** ✅ Completed
