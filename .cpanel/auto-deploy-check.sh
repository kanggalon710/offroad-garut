#!/bin/bash
# Cron cPanel: cek perubahan di remote, lalu deploy kalau ada.
#
# Sejak ada halaman /pembaruan di dalam aplikasi, skrip ini sifatnya cadangan
# untuk yang ingin deploy berjalan tanpa ditekan siapa pun. Jalur dan branch
# diturunkan sendiri supaya satu skrip yang sama benar untuk aplikasi produksi
# maupun dev.
#
# Branch diambil dari UPDATE_BRANCH di .env.production, jatuh ke branch yang
# sedang ter-checkout kalau tidak ada.

set -e

AKAR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$AKAR"

BRANCH="$(grep -E '^UPDATE_BRANCH=' .env.production 2>/dev/null | head -1 | sed 's/^UPDATE_BRANCH=//; s/"//g')"
if [ -z "$BRANCH" ]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

git fetch origin "$BRANCH" --quiet

LOKAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOKAL" = "$REMOTE" ]; then
  exit 0
fi

# Hanya fast forward. Kalau riwayat di server bercabang, berhenti daripada
# menimpa commit yang cuma ada di sini.
if ! git merge-base --is-ancestor HEAD "origin/$BRANCH"; then
  echo "[$(date)] Riwayat server tidak sejalan dengan origin/$BRANCH. Deploy dilewati."
  exit 1
fi

echo "[$(date)] Perubahan baru di $BRANCH. Deploy dimulai."
git merge --ff-only "origin/$BRANCH" --quiet
bash "$AKAR/.cpanel/deploy.sh"
echo "[$(date)] Deploy selesai."
