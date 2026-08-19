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
  echo "Next akan memakai SWC WebAssembly dan aplikasi bisa gagal saat runtime."
fi

# Server TIDAK meng-compile. Ruang alamat cPanel sekitar 4 GB, sedangkan
# binding SWC saja 137 MB dan build worker berjalan di atasnya. Hasil build
# dibuat GitHub Actions dan didorong ke branch build-<branch>.
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
BRANCH_BUILD="build-$BRANCH"

git fetch origin "+refs/heads/$BRANCH_BUILD:refs/remotes/origin/$BRANCH_BUILD" --force

SUMBER_SHA="$(git rev-parse HEAD)"
BUILD_SHA="$(git show "origin/$BRANCH_BUILD:BUILD-INFO.json" | grep -o '"sumberSha"[^,]*' | cut -d'"' -f4)"

if [ "$SUMBER_SHA" != "$BUILD_SHA" ]; then
  echo "GAGAL: hasil build di $BRANCH_BUILD untuk commit ${BUILD_SHA:0:7},"
  echo "sedangkan kode di server ${SUMBER_SHA:0:7}. Tunggu GitHub Actions selesai."
  exit 1
fi

rm -rf "$AKAR/tmp/build-baru" && mkdir -p "$AKAR/tmp/build-baru"
git archive --format=tar -o "$AKAR/tmp/build.tar" "origin/$BRANCH_BUILD"
tar -xf "$AKAR/tmp/build.tar" -C "$AKAR/tmp/build-baru"
rm -f "$AKAR/tmp/build.tar"

# Simpan hasil build lama supaya pemulihan tidak butuh jaringan.
rm -rf "$AKAR/.next-sebelumnya"
[ -d "$AKAR/.next" ] && mv "$AKAR/.next" "$AKAR/.next-sebelumnya"
mv "$AKAR/tmp/build-baru/.next" "$AKAR/.next"
rm -rf "$AKAR/tmp/build-baru"

# Penanda restart Passenger, relatif ke aplikasi ini saja.
mkdir -p "$AKAR/tmp"
touch "$AKAR/tmp/restart.txt" "$AKAR/restart.txt"

echo "Selesai. $NAMA_APP akan restart sendiri."
