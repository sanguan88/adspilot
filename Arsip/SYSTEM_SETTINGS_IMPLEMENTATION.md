# 📝 SYSTEM SETTINGS IMPLEMENTATION

**Date:** 12 Januari 2026  
**Developer:** AdsPilot Team  
**Feature:** System Settings with Database Storage  
**Status:** ✅ COMPLETED

---

## 🎯 OVERVIEW

Implementasi lengkap untuk System Settings di Admin Portal dengan database storage (PostgreSQL). Settings sekarang disimpan di database dan bisa diupdate via UI.

---

## 📦 FILES CREATED/MODIFIED

### 1. **Database Migration**
**File:** `adm/migrations/create-system-settings-table.js`  
**Purpose:** Create `system_settings` table with default values

**Schema:**
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Categories:**
- `system` - App name, version, maintenance mode
- `email` - SMTP configuration
- `payment` - Payment gateway settings
- `security` - Security settings (JWT, session timeout)
- `notifications` - Notification preferences

### 2. **API Route**
**File:** `adm/app/api/settings/route.ts`  
**Methods:** GET, PUT  
**Authentication:** Required (`canManageSettings` permission)

**Features:**
- ✅ Database CRUD operations
- ✅ Transaction support for updates
- ✅ Type conversion (string, number, boolean, json)
- ✅ Sensitive data masking (JWT secret)
- ✅ Audit trail (updated_by, updated_at)

### 3. **UI Component**
**File:** `adm/components/settings-page.tsx` (ALREADY EXISTS)  
**Status:** ✅ No changes needed - already perfect!

**Features:**
- 5 tabs (System, Email, Payment, Security, Notifications)
- Real-time updates
- Form validation
- Loading states

---

## 🚀 USAGE

### Running Migration

```bash
# Navigate to admin folder
cd adm

# Run migration (PostgreSQL)
node migrations/create-system-settings-table-pg.js

# Or using npm script (if configured)
npm run migrate:settings
```

### API Endpoints

#### GET /api/settings
Get all system settings grouped by category.

**Response:**
```json
{
  "success": true,
  "data": {
    "system": {
      "appName": "AdsBot Admin",
      "appVersion": "1.0.0",
      "maintenanceMode": false,
      "allowRegistration": true
    },
    "email": {
      "smtpHost": "smtp.gmail.com",
      "smtpPort": "587",
      "smtpUser": "noreply@example.com",
      "smtpFrom": "noreply@example.com"
    },
    "payment": {
      "paymentGateway": "manual",
      "currency": "IDR"
    },
    "security": {
      "jwtSecret": "***",
      "sessionTimeout": 3600,
      "maxLoginAttempts": 5
    },
    "notifications": {
      "emailEnabled": true,
      "smsEnabled": false,
      "webhookUrl": ""
    }
  }
}
```

#### PUT /api/settings
Update system settings.

**Request Body:**
```json
{
  "system": {
    "appName": "My Custom App",
    "maintenanceMode": true
  },
  "email": {
    "smtpHost": "smtp.sendgrid.net"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "5 settings updated successfully",
  "data": { ... }
}
```

---

## 🔐 SECURITY

### Authentication
- All endpoints require admin authentication
- Permission check: `canManageSettings`
- Unauthorized access returns 401/403

### Sensitive Data
- JWT Secret is masked in GET responses (`***`)
- JWT Secret cannot be updated via API (read-only)
- Database passwords never exposed

### Audit Trail
- Every update tracked with `updated_by` (admin user ID)
- Timestamp tracked with `updated_at`
- Can be used for audit logs later

---

## 🧪 TESTING

### Manual Testing Steps

1. **Access Settings Page**
   ```
   http://localhost:3003/settings
   ```

2. **Verify Data Load**
   - Check all 5 tabs load correctly
   - Verify default values appear

3. **Update Settings**
   - Change app name
   - Toggle maintenance mode
   - Update SMTP settings
   - Click "Save Settings"

4. **Verify Database**
   ```sql
   SELECT * FROM system_settings WHERE category = 'system';
   ```

5. **Verify Audit Trail**
   ```sql
   SELECT setting_key, setting_value, updated_by, updated_at 
   FROM system_settings 
   WHERE updated_at > NOW() - INTERVAL '1 hour'
   ORDER BY updated_at DESC;
   ```

---

## 📊 DEFAULT SETTINGS

### System
- `system.appName` = "AdsBot Admin"
- `system.appVersion` = "1.0.0"
- `system.maintenanceMode` = false
- `system.allowRegistration` = true

### Email
- `email.smtpHost` = (from env)
- `email.smtpPort` = "587"
- `email.smtpUser` = (from env)
- `email.smtpFrom` = (from env)

### Payment
- `payment.paymentGateway` = "manual"
- `payment.currency` = "IDR"

### Security
- `security.sessionTimeout` = 3600 (seconds)
- `security.maxLoginAttempts` = 5

### Notifications
- `notifications.emailEnabled` = true
- `notifications.smsEnabled` = false
- `notifications.webhookUrl` = ""

---

## 🔄 MIGRATION FROM ENV TO DATABASE

Settings previously stored in `.env` file are now in database:

**Before:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
PAYMENT_GATEWAY=manual
```

**After:**
```sql
INSERT INTO system_settings (setting_key, setting_value, category)
VALUES 
  ('email.smtpHost', 'smtp.gmail.com', 'email'),
  ('email.smtpPort', '587', 'email'),
  ('payment.paymentGateway', 'manual', 'payment');
```

**Benefits:**
- ✅ No server restart needed for changes
- ✅ UI-based configuration
- ✅ Audit trail for changes
- ✅ Multi-environment support
- ✅ Centralized configuration

---

## 🐛 TROUBLESHOOTING

### Issue: Migration fails with "ECONNREFUSED"
**Solution:** Database is not running or credentials are wrong
```bash
# Check database connection
psql -h localhost -U your_user -d your_database

# Verify .env.local has correct credentials
cat .env.local | grep DB_
```

### Issue: Settings not saving
**Solution:** Check permissions and database connection
```bash
# Check logs
tail -f logs/pm2-error.log

# Verify admin has permission
SELECT * FROM users WHERE role = 'superadmin';
```

### Issue: JWT Secret showing as empty
**Solution:** This is intentional for security
- JWT Secret is masked in GET responses
- It cannot be updated via API
- It's read-only from environment

---

## 📈 NEXT STEPS

### Immediate (Done ✅)
- ✅ Database migration script
- ✅ API route implementation
- ✅ Type conversion helpers
- ✅ Authentication & authorization

### Short Term (Optional)
- [ ] Add setting validation (min/max values)
- [ ] Add setting dependencies (if A then B required)
- [ ] Add setting groups/sections
- [ ] Add import/export functionality

### Long Term (Future)
- [ ] Setting history/versioning
- [ ] Rollback functionality
- [ ] Setting templates
- [ ] Multi-tenant settings

---

## 💡 TIPS & BEST PRACTICES

1. **Always use transactions** when updating multiple settings
2. **Validate input** before saving to database
3. **Mask sensitive data** in API responses
4. **Log all changes** for audit trail
5. **Use proper types** (boolean, number, json) for better validation

---

## 📞 SUPPORT

If you encounter issues:
1. Check database connection
2. Verify admin permissions
3. Check server logs
4. Review migration script output

---

**Implementation Time:** ~2 hours  
**Complexity:** ⭐⭐⭐ (Medium)  
**Status:** ✅ Production Ready  
**Last Updated:** 12 Januari 2026, 10:25 WIB
