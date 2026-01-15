#!/bin/bash

# =====================================================
# AdsPilot Rate Limit Settings Deployment Script
# =====================================================
# Deploy rate limit settings feature to production
# Portals: adm (Admin), aff (Affiliate)
# =====================================================

set -e  # Exit on error

echo "========================================="
echo "AdsPilot Rate Limit Settings Deployment"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Server details
SERVER_IP="154.19.37.198"
SERVER_USER="root"
PROJECT_DIR="/root/adspilot"

echo -e "${YELLOW}Step 1: Connecting to server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'

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

ENDSSH

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Login to Admin Panel: https://adm.adspilot.id"
echo "2. Go to Settings > Security tab"
echo "3. Verify new rate limit fields are visible"
echo "4. Test by adjusting values and clicking Save"
echo ""
