#!/usr/bin/env bash
# Dijalankan di VPS oleh GitHub Actions (lihat .github/workflows/deploy.yml).
# Artifact sudah diupload ke ~/deploy-tmp-frontend/<release>/dist/ sebelum
# script ini dipanggil: bash deploy.sh <release>
set -euo pipefail

RELEASE="$1"
ROOT=/var/www/zyad-cloud-frontend
TMP="$HOME/deploy-tmp-frontend/$RELEASE"
RELEASE_DIR="$ROOT/releases/$RELEASE"

mkdir -p "$RELEASE_DIR"
mv "$TMP/dist" "$RELEASE_DIR/dist"
ln -sfn "$RELEASE_DIR" "$ROOT/current"

cd "$ROOT/releases"
ls -1dt */ 2>/dev/null | tail -n +6 | xargs -r rm -rf

rm -rf "$TMP"
echo "Deploy frontend $RELEASE OK"
