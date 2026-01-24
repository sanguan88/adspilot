# 🚀 Deployment Script - Landing Page Fix
# Date: 16 Januari 2026
# Purpose: Deploy fixed landing-page-v2 dengan DB connection fix & tracking improvements

echo "🚀 Starting deployment process..."
echo "=====================================\n"

# 1. SSH ke server dan pull latest code
echo "📥 Step 1: Pulling latest code from GitHub..."
ssh root@154.19.37.198 << 'ENDSSH'
cd ~/adspilot
git pull origin main
ENDSSH

# 2. Install dependencies untuk landing-page-v2
echo "\n📦 Step 2: Installing dependencies..."
ssh root@154.19.37.198 << 'ENDSSH'
cd ~/adspilot/landing-page-v2
npm install --legacy-peer-deps
ENDSSH

# 3. Build landing-page-v2
echo "\n🔨 Step 3: Building landing-page-v2..."
ssh root@154.19.37.198 << 'ENDSSH'
cd ~/adspilot/landing-page-v2
npm run build
ENDSSH

# 4. Copy .env.local dari aff ke landing-page-v2 (ensure correct DB config)
echo "\n⚙️  Step 4: Syncing environment variables..."
ssh root@154.19.37.198 << 'ENDSSH'
cd ~/adspilot
cp aff/.env.local landing-page-v2/.env.local
# Also copy lib/db.ts if needed (already done in local dev)
ENDSSH

# 5. Restart PM2 processes
echo "\n🔄 Step 5: Restarting services..."
ssh root@154.19.37.198 << 'ENDSSH'
pm2 restart adbot-seller
pm2 restart app-affiliate
pm2 restart app-landing || pm2 start landing-page-v2/ecosystem.config.js
pm2 save
ENDSSH

# 6. Verify deployment
echo "\n✅ Step 6: Verifying deployment..."
ssh root@154.19.37.198 << 'ENDSSH'
pm2 list
pm2 logs app-landing --lines 20 --nostream
ENDSSH

echo "\n=====================================\n"
echo "✅ Deployment completed successfully!"
echo "🌐 Landing Page: http://adspilot.id"
echo "🌐 Affiliate Portal: http://aff.adspilot.id"
echo ""
echo "📊 Monitor logs with: ssh root@154.19.37.198 'pm2 logs app-landing'"
