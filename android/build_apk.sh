#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
APP_DIR="$ANDROID_DIR/app"
SRC_DIR="$APP_DIR/src/main"
ASSETS_DIR="$SRC_DIR/assets"
JAVA_DIR="$SRC_DIR/java"
RES_DIR="$SRC_DIR/res"
BUILD_DIR="$ANDROID_DIR/build"
CLASSES_DIR="$BUILD_DIR/classes"
DEX_DIR="$BUILD_DIR/dex"
COMPILED_RES_DIR="$BUILD_DIR/res-compiled"
UNSIGNED_APK="$BUILD_DIR/task-manager-unsigned.apk"
ALIGNED_APK="$BUILD_DIR/task-manager-aligned.apk"
FINAL_APK="$BUILD_DIR/task-manager.apk"
DOWNLOADS_DIR="$ROOT_DIR/downloads"
WEB_APK="$DOWNLOADS_DIR/task-manager.apk"
KEYSTORE_PATH="$BUILD_DIR/task-manager.keystore"
KEY_ALIAS="taskmanager"
KEY_PASS="taskmanager"
BUILD_TOOLS="/Users/prakharojha/Library/Android/sdk/build-tools/36.0.0"
ANDROID_JAR="/Users/prakharojha/Library/Android/sdk/platforms/android-36/android.jar"

rm -rf "$BUILD_DIR"
mkdir -p "$ASSETS_DIR" "$CLASSES_DIR" "$DEX_DIR" "$COMPILED_RES_DIR" "$DOWNLOADS_DIR"

cp "$ROOT_DIR/index.html" "$ASSETS_DIR/index.html"
cp "$ROOT_DIR/style.css" "$ASSETS_DIR/style.css"
cp "$ROOT_DIR/script.js" "$ASSETS_DIR/script.js"
cp "$ROOT_DIR/site.webmanifest" "$ASSETS_DIR/site.webmanifest"
cp "$ROOT_DIR/robots.txt" "$ASSETS_DIR/robots.txt"
rm -rf "$ASSETS_DIR/assets"
cp -R "$ROOT_DIR/assets" "$ASSETS_DIR/assets"

javac \
  -source 8 \
  -target 8 \
  -cp "$ANDROID_JAR" \
  -d "$CLASSES_DIR" \
  "$JAVA_DIR/com/taskmanager/app/MainActivity.java"

"$BUILD_TOOLS/d8" \
  --lib "$ANDROID_JAR" \
  --output "$DEX_DIR" \
  "$CLASSES_DIR/com/taskmanager/app/MainActivity.class"

"$BUILD_TOOLS/aapt2" compile \
  --dir "$RES_DIR" \
  -o "$COMPILED_RES_DIR"

typeset -a RES_FILES
RES_FILES=($(find "$COMPILED_RES_DIR" -name '*.flat' -print))

"$BUILD_TOOLS/aapt2" link \
  -o "$UNSIGNED_APK" \
  --manifest "$SRC_DIR/AndroidManifest.xml" \
  -I "$ANDROID_JAR" \
  -A "$ASSETS_DIR" \
  "${RES_FILES[@]}"

cd "$DEX_DIR"
zip -qj "$UNSIGNED_APK" classes.dex

if [ ! -f "$KEYSTORE_PATH" ]; then
  keytool -genkeypair \
    -keystore "$KEYSTORE_PATH" \
    -storepass "$KEY_PASS" \
    -keypass "$KEY_PASS" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Task Manager, OU=Local Build, O=Task Manager, L=Pune, S=Maharashtra, C=IN"
fi

"$BUILD_TOOLS/zipalign" -f 4 "$UNSIGNED_APK" "$ALIGNED_APK"

"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE_PATH" \
  --ks-pass "pass:$KEY_PASS" \
  --key-pass "pass:$KEY_PASS" \
  --out "$FINAL_APK" \
  "$ALIGNED_APK"

"$BUILD_TOOLS/apksigner" verify "$FINAL_APK"

cp "$FINAL_APK" "$WEB_APK"

echo "$FINAL_APK"
