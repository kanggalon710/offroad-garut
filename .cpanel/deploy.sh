#!/bin/bash
# Dijalankan otomatis sesudah cPanel Git Version Control menarik perubahan.
#
# Jalurnya diturunkan dari letak skrip ini, bukan ditulis tetap. Ada dua
# aplikasi Node di akun yang sama (offroad-garut untuk produksi dan
# offroad-garut-dev untuk pengujian), dan versi lama skrip ini menuliskan
# jalur produksi apa adanya. Akibatnya deploy di aplikasi dev mengaktifkan
# virtualenv produksi dan me-restart aplikasi produksi.

set -e

AKAR="$(cd "$(dirname "$0")/.." && pwd)"
NAMA_APP="$(basename "$AKAR")"
AKTIVATOR="$HOME/nodevenv/repositories/$NAMA_APP/22/bin/activate"

cd "$AKAR"

if [ -f "$AKTIVATOR" ]; then
  # shellcheck source=/dev/null
  source "$AKTIVATOR"
else
  echo "Peringatan: $AKTIVATOR tidak ada, memakai node yang ada di PATH."
fi

echo "Deploy $NAMA_APP dari $AKAR"

# --include=optional wajib disebut eksplisit. Binary SWC native Next
# (@next/swc-linux-x64-gnu) adalah optionalDependency, dan kalau ia tidak
# terpasang Next jatuh ke SWC versi WebAssembly yang menuntut satu blok memori
# besar sekaligus. Di cPanel blok itu ditolak RLIMIT_AS dan build mati dengan
# "Cannot allocate Wasm memory for new instance".
npm ci --omit=dev --include=optional

if [ ! -d node_modules/@next/swc-linux-x64-gnu ]; then
  echo "PERINGATAN: @next/swc-linux-x64-gnu tidak terpasang."
  echo "Next akan memakai SWC WebAssembly dan build kemungkinan besar kehabisan memori."
  echo "Coba: npm install --include=optional @next/swc-linux-x64-gnu@\$(node -p \"require('next/package.json').version\")"
fi

# cPanel shared hosting RLIMIT_AS ketat. Heap 1024 terlalu besar, SWC Wasm
# kena OOM. Turunkan heap dan batasi semi-space.
export NODE_OPTIONS="--max-old-space-size=768 --max-semi-space-size=64"
export NEXT_TELEMETRY_DISABLED=1
npx next build

# Penanda restart Passenger, relatif ke aplikasi ini saja.
mkdir -p "$AKAR/tmp"
touch "$AKAR/tmp/restart.txt" "$AKAR/restart.txt"

echo "Selesai. $NAMA_APP akan restart sendiri."
