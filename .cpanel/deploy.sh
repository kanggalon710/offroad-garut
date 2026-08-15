#!/bin/bash
# .cpanel/deploy.sh - Runs automatically after cPanel Git Version Control pull
# Sources the Node.js virtual environment from cPanel Node.js Selector

set -e

# Activate cPanel Node.js virtual environment
# Adjust path if your Node.js app version differs (check with: ls ~/nodevenv/repositories/offroad-garut/)
source /home/jabnet/nodevenv/repositories/offroad-garut/22/bin/activate

echo "🚀 Starting deployment..."

# 1. Install/update dependencies (production only)
npm ci --omit=dev

# 2. Build the Next.js app
npm run build

# 3. Restart the Node.js app via cPanel's API
# This touches the restart.txt file that cPanel watches
touch ~/nodejs/offroad-garut/restart.txt

echo "✅ Deployment complete. App will restart automatically."