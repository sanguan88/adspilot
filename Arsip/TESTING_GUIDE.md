# 🧪 TESTING GUIDE - AUDIT LOGS & SYSTEM SETTINGS

**Date:** 12 Januari 2026  
**Environment:** Development  
**Server:** http://localhost:3000

---

## 📋 PREREQUISITES

✅ **Before Testing:**
1. Database PostgreSQL is running
2. Admin portal dev server is running (`npm run dev`)
3. You have admin credentials
4. Migrations have been executed

---

## 🎯 TEST PLAN

### Phase 1: Database Verification
### Phase 2: System Settings Testing
### Phase 3: Audit Logs Testing
### Phase 4: End-to-End Verification

---

## 📊 PHASE 1: DATABASE VERIFICATION

### Step 1.1: Check Audit Logs Table

**Open PostgreSQL client:**
```bash
# Option 1: Using psql
psql -h localhost -U your_user -d your_database

# Option 2: Using pgAdmin (GUI)
# Open pgAdmin and connect to your database
```

**Run verification queries:**
```sql
-- 1. Check if audit_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'audit_logs';

-- Expected: 1 row with 'audit_logs'

-- 2. Check table structure
\d audit_logs

-- Expected: All columns (id, user_id, action, etc.)

-- 3. Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'audit_logs';

-- Expected: 5 indexes

-- 4. Check sample data
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;

-- Expected: At least 1 row (migration log)
```

**✅ Success Criteria:**
- Table exists
- All columns present
- 5 indexes created
- At least 1 sample log

---

### Step 1.2: Check System Settings Table

```sql
-- 1. Check if system_settings table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'system_settings';

-- Expected: 1 row with 'system_settings'

-- 2. Check default settings
SELECT setting_key, setting_value, category 
FROM system_settings 
ORDER BY category, setting_key;

-- Expected: 15 default settings

-- 3. Count by category
SELECT category, COUNT(*) as total 
FROM system_settings 
GROUP BY category;

-- Expected:
-- system: 4
-- email: 4
-- payment: 2
-- security: 2
-- notifications: 3
```

**✅ Success Criteria:**
- Table exists
- 15 default settings loaded
- All 5 categories present

---

## ⚙️ PHASE 2: SYSTEM SETTINGS TESTING

### Step 2.1: Access Settings Page

**Browser:**
1. Open: http://localhost:3000/settings
2. Login with admin credentials if needed

**Expected:**
- ✅ Page loads successfully
- ✅ 5 tabs visible (System, Email, Payment, Security, Notifications)
- ✅ All fields populated with default values

---

### Step 2.2: Test Settings Update

**Actions:**
1. Click "System" tab
2. Change "App Name" to "Test Admin Portal"
3. Toggle "Maintenance Mode" to ON
4. Click "Save Settings" button

**Expected:**
- ✅ Success toast appears
- ✅ Settings saved message shown

**Verify in Database:**
```sql
SELECT setting_key, setting_value 
FROM system_settings 
WHERE setting_key IN ('system.appName', 'system.maintenanceMode');

-- Expected:
-- system.appName: "Test Admin Portal"
-- system.maintenanceMode: "true"
```

---

### Step 2.3: Test Settings Persistence

**Actions:**
1. Refresh the page (F5)
2. Check if values are still there

**Expected:**
- ✅ App Name shows "Test Admin Portal"
- ✅ Maintenance Mode is still ON

---

## 📝 PHASE 3: AUDIT LOGS TESTING

### Test 3.1: User Update Audit

**Actions:**
1. Go to: http://localhost:3000/users
2. Click on any user
3. Click "Edit" button
4. Change user's email
5. Click "Save"

**Verify in Database:**
```sql
-- Get latest user update log
SELECT 
    id,
    user_email as admin_email,
    action,
    resource_type,
    resource_name,
    description,
    old_values,
    new_values,
    ip_address,
    created_at
FROM audit_logs 
WHERE action = 'user.update' 
ORDER BY created_at DESC 
LIMIT 1;
```

**✅ Success Criteria:**
- Log exists with action = 'user.update'
- `old_values` contains old email
- `new_values` contains new email
- `user_email` shows admin who made the change
- `ip_address` is captured
- `created_at` is recent

---

### Test 3.2: User Delete Audit

**Actions:**
1. Go to: http://localhost:3000/users
2. Click on any user
3. Click "Delete" button
4. Confirm deletion

**Verify in Database:**
```sql
-- Get latest user delete log
SELECT 
    id,
    user_email as admin_email,
    action,
    resource_name,
    description,
    old_values,
    new_values,
    created_at
FROM audit_logs 
WHERE action = 'user.delete' 
ORDER BY created_at DESC 
LIMIT 1;
```

**✅ Success Criteria:**
- Log exists with action = 'user.delete'
- `old_values` shows status = 'aktif'
- `new_values` shows status = 'nonaktif'
- Description mentions deactivation

---

### Test 3.3: Subscription Update Audit

**Actions:**
1. Go to: http://localhost:3000/subscriptions
2. Click on any subscription
3. Click "Edit" button
4. Change status or plan
5. Click "Save"

**Verify in Database:**
```sql
-- Get latest subscription update log
SELECT 
    id,
    user_email as admin_email,
    action,
    resource_id,
    resource_name,
    old_values,
    new_values,
    created_at
FROM audit_logs 
WHERE action IN ('subscription.update', 'subscription.cancel')
ORDER BY created_at DESC 
LIMIT 1;
```

**✅ Success Criteria:**
- Log exists
- Action is either 'subscription.update' or 'subscription.cancel'
- Old/new values show the changes
- Resource ID matches subscription ID

---

### Test 3.4: Store Assignment Audit

**Actions:**
1. Go to: http://localhost:3000/users
2. Click on any user
3. Go to "Stores" tab
4. Click "Assign Store" button
5. Select a store
6. Click "Assign"

**Verify in Database:**
```sql
-- Get latest store assign log
SELECT 
    id,
    user_email as admin_email,
    action,
    resource_id as store_id,
    resource_name as store_name,
    description,
    old_values,
    new_values,
    created_at
FROM audit_logs 
WHERE action = 'store.assign' 
ORDER BY created_at DESC 
LIMIT 1;
```

**✅ Success Criteria:**
- Log exists with action = 'store.assign'
- `old_values` shows previous owner ID
- `new_values` shows new owner ID
- Store name is captured

---

### Test 3.5: Store Unassignment Audit

**Actions:**
1. Go to: http://localhost:3000/users
2. Click on any user with stores
3. Go to "Stores" tab
4. Click "Unassign" on a store
5. Confirm

**Verify in Database:**
```sql
-- Get latest store unassign log
SELECT 
    id,
    user_email as admin_email,
    action,
    resource_id as store_id,
    resource_name as store_name,
    old_values,
    new_values,
    created_at
FROM audit_logs 
WHERE action = 'store.unassign' 
ORDER BY created_at DESC 
LIMIT 1;
```

**✅ Success Criteria:**
- Log exists with action = 'store.unassign'
- Old values show owner ID
- New values show deleted = true

---

## 🔍 PHASE 4: END-TO-END VERIFICATION

### Test 4.1: Audit Log Completeness

**Run comprehensive query:**
```sql
-- Get summary of all audit logs
SELECT 
    action,
    COUNT(*) as total,
    MIN(created_at) as first_log,
    MAX(created_at) as last_log
FROM audit_logs 
GROUP BY action 
ORDER BY total DESC;
```

**Expected Actions:**
- `user.update`
- `user.delete`
- `subscription.update`
- `subscription.cancel` (if tested)
- `store.assign`
- `store.unassign`
- `system.migration`

---

### Test 4.2: Audit Log Data Quality

**Check for missing data:**
```sql
-- Check logs with missing critical fields
SELECT 
    id,
    action,
    CASE 
        WHEN user_id IS NULL THEN 'Missing user_id'
        WHEN action IS NULL THEN 'Missing action'
        WHEN resource_type IS NULL THEN 'Missing resource_type'
        WHEN created_at IS NULL THEN 'Missing created_at'
        ELSE 'OK'
    END as status
FROM audit_logs
WHERE user_id IS NULL 
   OR action IS NULL 
   OR resource_type IS NULL 
   OR created_at IS NULL;

-- Expected: 0 rows (all logs should be complete)
```

---

### Test 4.3: Performance Check

**Test query performance:**
```sql
-- Test index performance
EXPLAIN ANALYZE
SELECT * FROM audit_logs 
WHERE action = 'user.update' 
  AND created_at >= CURRENT_DATE 
ORDER BY created_at DESC 
LIMIT 10;

-- Expected: Uses indexes, execution time < 10ms
```

---

## 📊 TESTING CHECKLIST

### Database Setup ✅
- [ ] audit_logs table exists
- [ ] system_settings table exists
- [ ] All indexes created
- [ ] Default settings loaded

### System Settings ✅
- [ ] Settings page loads
- [ ] Can view all settings
- [ ] Can update settings
- [ ] Changes persist after refresh
- [ ] Database updated correctly

### Audit Logs - User Management ✅
- [ ] User update logged
- [ ] User delete logged
- [ ] Old/new values captured
- [ ] Admin info captured
- [ ] IP address captured

### Audit Logs - Subscription ✅
- [ ] Subscription update logged
- [ ] Subscription cancel logged
- [ ] Changes tracked correctly

### Audit Logs - Store Management ✅
- [ ] Store assign logged
- [ ] Store unassign logged
- [ ] Owner changes tracked

### Data Quality ✅
- [ ] No missing required fields
- [ ] Timestamps accurate
- [ ] JSON data valid
- [ ] Descriptions meaningful

### Performance ✅
- [ ] Queries use indexes
- [ ] Response time < 100ms
- [ ] No N+1 queries

---

## 🐛 TROUBLESHOOTING

### Issue: Settings page shows empty values

**Solution:**
```sql
-- Check if settings exist
SELECT COUNT(*) FROM system_settings;

-- If 0, run migration again
cd adm
node migrations/create-system-settings-table-pg.js
```

---

### Issue: Audit logs not appearing

**Checklist:**
1. Check if migration ran:
   ```sql
   SELECT COUNT(*) FROM audit_logs;
   ```

2. Check API response in browser console (F12)

3. Check server logs for errors

4. Verify authentication:
   ```sql
   -- Check if admin user exists
   SELECT * FROM data_user WHERE role IN ('superadmin', 'admin');
   ```

---

### Issue: Permission denied errors

**Solution:**
```sql
-- Check user permissions
SELECT user_id, role FROM data_user WHERE user_id = 'YOUR_USER_ID';

-- Ensure role is 'superadmin' or 'admin'
```

---

## 📈 EXPECTED RESULTS SUMMARY

After all tests, you should have:

**In Database:**
- ✅ 15+ settings in `system_settings`
- ✅ 5+ logs in `audit_logs`
- ✅ All logs have complete data

**In Browser:**
- ✅ Settings page works
- ✅ All admin actions succeed
- ✅ No console errors

**Performance:**
- ✅ Page load < 2s
- ✅ API response < 500ms
- ✅ Database queries < 100ms

---

## 🎯 QUICK TEST SCRIPT

**Copy-paste this into PostgreSQL:**

```sql
-- QUICK VERIFICATION SCRIPT
-- Run this after testing to verify everything

-- 1. Check tables exist
SELECT 'Tables Check' as test,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')
            AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings')
           THEN '✅ PASS'
           ELSE '❌ FAIL'
       END as result;

-- 2. Check settings count
SELECT 'Settings Count' as test,
       CASE 
           WHEN COUNT(*) >= 15 THEN '✅ PASS (' || COUNT(*) || ' settings)'
           ELSE '❌ FAIL (Only ' || COUNT(*) || ' settings)'
       END as result
FROM system_settings;

-- 3. Check audit logs count
SELECT 'Audit Logs Count' as test,
       CASE 
           WHEN COUNT(*) >= 1 THEN '✅ PASS (' || COUNT(*) || ' logs)'
           ELSE '❌ FAIL (No logs)'
       END as result
FROM audit_logs;

-- 4. Check indexes
SELECT 'Indexes Check' as test,
       CASE 
           WHEN COUNT(*) >= 5 THEN '✅ PASS (' || COUNT(*) || ' indexes)'
           ELSE '❌ FAIL (Only ' || COUNT(*) || ' indexes)'
       END as result
FROM pg_indexes 
WHERE tablename = 'audit_logs';

-- 5. Check data quality
SELECT 'Data Quality' as test,
       CASE 
           WHEN COUNT(*) = 0 THEN '✅ PASS (No missing data)'
           ELSE '❌ FAIL (' || COUNT(*) || ' logs with missing data)'
       END as result
FROM audit_logs
WHERE user_id IS NULL 
   OR action IS NULL 
   OR resource_type IS NULL;

-- 6. Show recent audit logs
SELECT 
    '📋 Recent Audit Logs' as section,
    action,
    resource_type,
    resource_name,
    created_at
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## ✅ SUCCESS CRITERIA

**All tests pass if:**
- ✅ All database tables exist
- ✅ All migrations executed successfully
- ✅ Settings page loads and works
- ✅ All admin actions create audit logs
- ✅ Audit logs contain complete data
- ✅ No errors in console or server logs
- ✅ Performance is acceptable

---

**Testing Time:** ~30 minutes  
**Difficulty:** ⭐⭐ (Easy)  
**Status:** Ready to test!

**Good luck Boss! 🚀**
