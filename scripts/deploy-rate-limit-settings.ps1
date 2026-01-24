# =====================================================
# AdsPilot Rate Limit Settings Deployment Script
# =====================================================
# Deploy rate limit settings feature to production
# Portals: adm (Admin), aff (Affiliate)
# =====================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "AdsPilot Rate Limit Settings Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Server details
$SERVER = "root@154.19.37.198"

Write-Host "Step 1: Connecting to server..." -ForegroundColor Yellow
Write-Host ""

# SSH commands to execute on server
$commands = @"
set -e
cd /root/adspilot

echo ""
echo "========================================="
echo "Step 2: Pulling latest code from GitHub"
echo "========================================="
git pull origin main

echo ""
echo "========================================="
echo "Step 3: Running database migration"
echo "========================================="
cd /root/adspilot/app
npx tsx scripts/create-rate-limit-settings.ts

echo ""
echo "========================================="
echo "Step 4: Building Admin Portal"
echo "========================================="
cd /root/adspilot/adm
npm run build

echo ""
echo "========================================="
echo "Step 5: Restarting PM2 processes"
echo "========================================="
pm2 restart app-admin

echo ""
echo "========================================="
echo "Step 6: Verifying deployment"
echo "========================================="
pm2 list | grep app-admin

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "Rate Limit Settings are now available at:"
echo "  https://adm.adspilot.id/settings (Security tab)"
echo ""
echo "Default configuration:"
echo "  - Max Login Attempts: 5"
echo "  - Login Window: 15 minutes"
echo "  - Block Duration: 30 minutes"
echo "  - Rate Limiting: Enabled"
echo ""
"@

# Execute SSH command
ssh $SERVER $commands

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Login to Admin Panel: https://adm.adspilot.id"
Write-Host "2. Go to Settings > Security tab"
Write-Host "3. Verify new rate limit fields are visible"
Write-Host "4. Test by adjusting values and clicking Save"
Write-Host ""
