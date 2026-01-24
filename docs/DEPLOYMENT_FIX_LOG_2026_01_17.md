# Deployment Fix Log - 2026-01-17

## 1. Automation Rule Limits & Plan Compatibility
- **Issue:** Users with "3-month" etc. plans were restricted to Free Plan limits (3 rules) because the code didn't recognize the plan ID.
- **Fix:** Updated `app/lib/subscription-limits.ts` to:
  1. Dynamically query `subscription_plans` table in DB for limits (`max_automation_rules`, etc.).
  2. Use the DB values as the source of truth.
  3. Fallback to hardcoded constants only if DB lookup fails.
- **Status:** Resolved. User "3-month" plan now gets 20 rules (as per DB config).

## 2. Rule Toggle 500 Error
- **Issue:** Toggling rules caused "Release called on client which has already been released".
- **Fix:** Removed redundant `connection.release()` calls in `try` blocks in `app/app/api/automation-rules/[id]/route.ts`. Now relying solely on `finally` block for connection cleanup.
- **Status:** Resolved.

## 3. Landing Page & Login Link Validations
- **Issue:** 
  - Login Page "Daftar sekarang" pointed to `localhost:3002`.
  - Landing Page "Langganan" pointed to `adspilot.id/auth/checkout` (404).
  - Landing Page Console Error: `GET /api/user/subscription 404`.
- **Fixes:**
  - **App (.env):** Added `NEXT_PUBLIC_LANDING_PAGE_URL=https://adspilot.id`.
  - **Landing Page (.env.production):** Updated `NEXT_PUBLIC_APP_URL=https://app.adspilot.id`.
  - **Landing Page Code:** Removed `SubscriptionProvider` from `landing-page-v2/app/layout.tsx` (server-side) to stop it from fetching user subscription on public pages.
- **Status:** Resolved. Navigation flow A-Z is correct.

## Files Updated on Server
- `~/adspilot/app/lib/subscription-limits.ts`
- `~/adspilot/app/app/api/automation-rules/[id]/route.ts`
- `~/adspilot/app/.env`
- `~/adspilot/app/components/particle-background.tsx`
- `~/adspilot/landing-page-v2/.env.production`
- `~/adspilot/landing-page-v2/app/layout.tsx`

---

## 4. WebGL Fallback for Login Page (Added ~15:15)
- **Issue:** User with unsupported WebGL (GPU disabled) experienced full page crash on Login page with error "Application error: a client-side exception has occurred".
- **Root Cause:** `ParticleBackground` component uses THREE.js (WebGL) for 3D particle animation. When WebGL context creation fails, the error was unhandled causing entire page to crash.
- **Fix:** Updated `app/components/particle-background.tsx` to:
  1. Detect WebGL availability before rendering Canvas.
  2. Wrap Canvas in Error Boundary to catch runtime crashes.
  3. Render a static gradient background with subtle dot pattern as fallback.
- **Status:** Resolved. Users without WebGL support now see static background instead of crash.

---

## 5. Campaign API SQL Parameter Mismatch (Added ~16:07)
- **Issue:** `GET /api/campaigns/summary` and `POST /api/campaigns/update-result` returning 404 for all users (non-admin).
- **Root Cause:** SQL parameter order mismatch in `getAccountsWithCookies()` function. The `user_id` placeholder was `$1` but was added LAST in the params array, while `tokoIds` were first.
- **Fix:** Updated both files to correctly order params:
  1. `app/app/api/campaigns/summary/route.ts` - Fixed `getAccountsWithCookies()`
  2. `app/app/api/campaigns/update-result/route.ts` - Fixed `getAccountWithCookies()`
- **Status:** Resolved. Campaign summary and update-result endpoints now work correctly.
