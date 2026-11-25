#!/usr/bin/env zsh
set -euo pipefail

# ==============================================================================
# Skrip Rilis Otomatis LacakHP (Build APK -> Update SHA-256 & version.json -> Deploy Web)
# Cara pakai:
#   ./publish-update.sh
#   ./publish-update.sh 3 "2.1" "Catatan perubahan rilis baru"
# ==============================================================================

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$ROOT_DIR/tracker-android"
WEB_DIR="$ROOT_DIR/tracker-web"
GRADLE_FILE="$ANDROID_DIR/app/build.gradle.kts"
APK_SOURCE="$ANDROID_DIR/app/build/outputs/apk/full/release/app-full-release.apk"
APK_DEST="$WEB_DIR/public/lacakhp-resmi.apk"
VERSION_JSON="$WEB_DIR/public/version.json"
EXPECTED_CERT_SHA256="E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48"

if [[ $# -ge 2 ]]; then
  NEW_CODE="$1"
  NEW_NAME="$2"
  sed -i '' -E "s/versionCode = [0-9]+/versionCode = $NEW_CODE/" "$GRADLE_FILE"
  sed -i '' -E "s/versionName = \"[^\"]+\"/versionName = \"$NEW_NAME\"/" "$GRADLE_FILE"
fi

NOTES="${3:-Pembaruan keamanan Anti-Sabotase, Benteng Device Owner, & rilis non-debuggable resmi lacakinhp110.my.id.}"

VER_CODE=$(grep -E "versionCode = " "$GRADLE_FILE" | sed -E 's/.*versionCode = ([0-9]+).*/\1/')
VER_NAME=$(grep -E "versionName = " "$GRADLE_FILE" | sed -E 's/.*versionName = "([^"]+)".*/\1/')

echo "==> [1/4] Mem-build APK Release Non-Debuggable LacakHP v$VER_NAME (Build $VER_CODE)..."
cd "$ANDROID_DIR"
./gradlew --no-daemon assembleFullRelease assemblePlayRelease

if command -v apksigner >/dev/null 2>&1; then
  ACTUAL_CERT=$(apksigner verify --print-certs "$APK_SOURCE" | grep "SHA-256 digest:" | head -n 1 | awk '{print $NF}' | tr '[:lower:]' '[:upper:]')
  EXPECTED_HEX=$(echo "$EXPECTED_CERT_SHA256" | tr -d ':')
  if [[ -n "$ACTUAL_CERT" && "$ACTUAL_CERT" != "$EXPECTED_HEX" ]]; then
    echo "❌ GAGAL: Sertifikat APK ($ACTUAL_CERT) tidak cocok dengan sertifikat resmi ($EXPECTED_HEX)!" >&2
    exit 1
  fi
fi

echo "==> [2/4] Menyalin APK & menghitung checksum SHA-256..."
mkdir -p "$WEB_DIR/public"
cp "$APK_SOURCE" "$APK_DEST"
APK_SHA256=$(shasum -a 256 "$APK_DEST" | awk '{print $1}')

cat > "$VERSION_JSON" <<EOF
{
  "versionCode": $VER_CODE,
  "versionName": "$VER_NAME",
  "apkUrl": "https://lacakinhp110.my.id/lacakhp-resmi.apk",
  "certSha256": "E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48",
  "apkSha256": "$APK_SHA256",
  "notes": "$NOTES"
}
EOF

echo "==> [3/4] Mem-build Portal Web LacakHP..."
cd "$WEB_DIR"
npm run build

echo "==> [4/4] Men-deploy ke https://lacakinhp110.my.id..."
npx vercel --prod --yes

echo "✅ Selesai! LacakHP v$VER_NAME (Build $VER_CODE) dengan SHA-256 $APK_SHA256 sudah live di https://lacakinhp110.my.id"
