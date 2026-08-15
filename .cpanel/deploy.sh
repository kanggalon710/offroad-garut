#!/bin/bash
# .cpanel/deploy.sh - Runs automatically after cPanel Git Version Control pull

set -e

echo "🚀 Starting deployment..."

# 1. Install/update dependencies (production only)
npm ci --omit=dev

# 2. Build the Next.js app
npm run build

# 3. Restart the Node.js app via cPanel's API
# This touches the restart.txt file that cPanel watches
# Adjust path based on your Node.js app location in cPanel
# For Node.js Selector, typically: ~/nodejs/[app-name]/restart.txt
touch ~/nodejs/offroad-garut/restart.txt

echo "✅ Deployment complete. App will restart automatically."