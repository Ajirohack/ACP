#!/usr/bin/env bash
set -euo pipefail

# Android SDK + AVD setup helper (macOS-focused, CLI-first)
# Phases:
#   setup        -> installs baseline SDK components and accepts licenses
#   create-avd   -> creates an AVD with provided name and device profile
#   boot         -> boots the AVD with chosen flags (headless or GPU host)
#   full         -> setup + create-avd + boot (end-to-end)
#
# Env vars (override as needed):
#   ANDROID_SDK_ROOT   Default: $HOME/Library/Android/sdk
#   AVD_NAME           Default: Pixel8_API34
#   DEVICE_ID          Default: pixel_8 (use `avdmanager list devices`)
#   BUILD_TOOLS_VER    Default: 35.0.0
#   PLATFORM_API       Default: android-34
#   ABI                Auto-detected (arm64-v8a on Apple Silicon, x86_64 on Intel)
#   HEADLESS           Default: false (set true to use -no-window -no-audio -no-snapshot)
#
# Binaries (auto-detected, override if needed):
#   SDKMANAGER_PATH    $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager
#   AVDMANAGER_PATH    $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/avdmanager
#   ADB_PATH           $ANDROID_SDK_ROOT/platform-tools/adb
#   EMULATOR_PATH      $ANDROID_SDK_ROOT/emulator/emulator


ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
AVD_NAME="${AVD_NAME:-Pixel8_API34}"
DEVICE_ID="${DEVICE_ID:-pixel_8}"
BUILD_TOOLS_VER="${BUILD_TOOLS_VER:-35.0.0}"
PLATFORM_API="${PLATFORM_API:-android-34}"
HEADLESS="${HEADLESS:-false}"

ARCH="$(uname -m)"
if [[ "$ARCH" == "arm64" ]]; then
  ABI_DEFAULT="arm64-v8a"
else
  ABI_DEFAULT="x86_64"
fi
ABI="${ABI:-$ABI_DEFAULT}"

SDKMANAGER_PATH_DEFAULT="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
AVDMANAGER_PATH_DEFAULT="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/avdmanager"
ADB_PATH_DEFAULT="$ANDROID_SDK_ROOT/platform-tools/adb"
EMULATOR_PATH_DEFAULT="$ANDROID_SDK_ROOT/emulator/emulator"

SDKMANAGER_PATH="${SDKMANAGER_PATH:-$SDKMANAGER_PATH_DEFAULT}"
AVDMANAGER_PATH="${AVDMANAGER_PATH:-$AVDMANAGER_PATH_DEFAULT}"
ADB_PATH="${ADB_PATH:-$ADB_PATH_DEFAULT}"
EMULATOR_PATH="${EMULATOR_PATH:-$EMULATOR_PATH_DEFAULT}"

function need_cmd() {
  local name="$1" path="$2"
  if [[ -x "$path" ]]; then
    return 0
  fi
  if command -v "$name" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

function check_tools() {
  echo "[check] ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
  if [[ ! -d "$ANDROID_SDK_ROOT" ]]; then
    echo "[warn] ANDROID_SDK_ROOT directory does not exist: $ANDROID_SDK_ROOT"
    echo "       Install Android SDK (Android Studio or commandline-tools) and set ANDROID_SDK_ROOT."
  fi

  if ! need_cmd sdkmanager "$SDKMANAGER_PATH"; then
    echo "[error] sdkmanager not found. Install Android command line tools."
    echo "        macOS: brew install --cask android-commandlinetools (or install via Android Studio)."
    exit 1
  fi

  if ! need_cmd avdmanager "$AVDMANAGER_PATH"; then
    echo "[error] avdmanager not found. Ensure cmdline-tools are installed and latest is selected."
    exit 1
  fi

  if ! need_cmd adb "$ADB_PATH"; then
    echo "[warn] adb not found yet; it will be installed by sdkmanager platform-tools in setup phase."
  fi

  if ! need_cmd emulator "$EMULATOR_PATH"; then
    echo "[warn] emulator binary not found yet; it will be installed by sdkmanager emulator in setup phase."
  fi
}

function sdk_setup() {
  check_tools
  echo "[setup] Accepting licenses..."
  yes | "$SDKMANAGER_PATH" --licenses >/dev/null || true

  echo "[setup] Installing baseline tools: platform-tools, emulator, build-tools;$BUILD_TOOLS_VER"
  "$SDKMANAGER_PATH" "platform-tools" "emulator" "build-tools;$BUILD_TOOLS_VER"

  echo "[setup] Installing platform and system image: $PLATFORM_API / google_apis / $ABI"
  "$SDKMANAGER_PATH" "platforms;$PLATFORM_API" "system-images;$PLATFORM_API;google_apis;$ABI"

  echo "[setup] Done. Ensure $ADB_PATH and $EMULATOR_PATH are on PATH or use Host Adapter .env."
}

function list_devices_profiles() {
  check_tools
  echo "[devices] Listing available device profiles..."
  "$AVDMANAGER_PATH" list devices || true
}

function create_avd() {
  check_tools
  local sysimg="system-images;$PLATFORM_API;google_apis;$ABI"
  echo "[avd] Creating AVD: name=$AVD_NAME, device=$DEVICE_ID, image=$sysimg"
  if [[ -n "$DEVICE_ID" ]]; then
    "$AVDMANAGER_PATH" create avd -n "$AVD_NAME" -k "$sysimg" --device "$DEVICE_ID" || true
  else
    "$AVDMANAGER_PATH" create avd -n "$AVD_NAME" -k "$sysimg" || true
  fi
  echo "[avd] AVDs available:"
  "$EMULATOR_PATH" -list-avds || true
}

function boot_emulator() {
  check_tools
  echo "[boot] Booting emulator @$AVD_NAME ..."
  local args=("@$AVD_NAME")
  if [[ "$HEADLESS" == "true" ]]; then
    args+=("-no-window" "-no-audio" "-no-snapshot")
  else
    args+=("-gpu" "host")
  fi
  echo "[boot] Command: $EMULATOR_PATH ${args[*]}"
  "$EMULATOR_PATH" "${args[@]}" &

  echo "[boot] Waiting for device..."
  "$ADB_PATH" wait-for-device
  echo "[boot] Waiting for sys.boot_completed..."
  while [[ "$($ADB_PATH shell getprop sys.boot_completed 2>/dev/null || echo 0)" != "1" ]]; do
    sleep 1
  done
  "$ADB_PATH" shell input keyevent 82 || true
  echo "[boot] Emulator is ready."
}

function usage() {
  cat <<EOF
Usage: $(basename "$0") <setup|create-avd|boot|devices|full>

Commands:
  setup        Install baseline SDK components and accept licenses
  create-avd   Create AVD with env vars (AVD_NAME, DEVICE_ID, PLATFORM_API, ABI)
  boot         Boot the AVD (HEADLESS=true for CI)
  devices      Show device profiles available to avdmanager
  full         Run setup + create-avd + boot (end-to-end)

Examples:
  ANDROID_SDK_ROOT=~/Library/Android/sdk \ 
    $(basename "$0") setup

  AVD_NAME=Pixel8_API34 DEVICE_ID=pixel_8 PLATFORM_API=android-34 \ 
    $(basename "$0") create-avd

  AVD_NAME=Pixel8_API34 HEADLESS=true \ 
    $(basename "$0") boot

EOF
}

cmd="${1:-}"
case "$cmd" in
  setup)
    sdk_setup
    ;;
  create-avd)
    create_avd
    ;;
  boot)
    boot_emulator
    ;;
  devices)
    list_devices_profiles
    ;;
  full)
    sdk_setup
    create_avd
    boot_emulator
    ;;
  *)
    usage
    exit 1
    ;;
esac