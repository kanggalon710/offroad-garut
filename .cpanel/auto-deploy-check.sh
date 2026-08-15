#!/bin/bash
# .cpanel/auto-deploy-check.sh
# Skrip untuk Cron Job cPanel: Cek perubahan di GitHub, tarik, build, dan restart otomatis.
# Menghilangkan kebutuhan interaksi manual di cPanel.

set -e

# Pindah ke folder proyek
cd "$(dirname "$0")/.."

# Ambil commit terbaru dari origin tanpa mengubah working tree
git fetch origin main-sql --quiet

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main-sql)

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    echo "[$(date)] Perubahan baru terdeteksi. Memulai auto-deploy..."

    # Activate cPanel Node.js virtual environment
    source /home/jabnet/nodevenv/repositories/offroad-garut/22/bin/activate

    git pull origin main-sql --quiet
    npm ci --omit=dev
    # cPanel shared hosting membatasi memori (RLIMIT_AS). Naikkan heap Node.
    NODE_OPTIONS="--max-old-space-size=1024" npx next build
    mkdir -p tmp
    touch tmp/restart.txt
    touch restart.txt
    echo "[$(date)] Auto-deploy selesai dan aplikasi di-restart."
fi