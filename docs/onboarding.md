# Developer Onboarding

This guide provides instructions for new developers joining the project.

## Android SDK Setup (CLI-first)
- Verify `ANDROID_SDK_ROOT` on macOS: defaults to `~/Library/Android/sdk`.
- If command line tools are missing, install them (Android Studio or `brew install --cask android-commandlinetools`).

Quick commands:
- List packages: `sdkmanager --list`
- Accept licenses: `sdkmanager --licenses`
- Baseline tools: `sdkmanager "platform-tools" "emulator" "build-tools;35.0.0"`
- Install platform and system images:
  - Intel: `sdkmanager "platforms;android-34" "system-images;android-34;google_apis;x86_64"`
  - Apple Silicon: `sdkmanager --list` then choose `system-images;android-34;google_apis;arm64-v8a`

## Create AVD (virtual device)
- List device profiles: `avdmanager list devices`
- Create device:
  - `avdmanager create avd -n Pixel8_API34 -k "system-images;android-34;google_apis;x86_64" --device "pixel_8"`
  - Omit `--device` if needed; pick a preferred profile from the list.

## Boot Emulator
- List AVDs: `emulator -list-avds`
- Start (GUI + fast graphics): `emulator @Pixel8_API34 -gpu host`
- Headless (CI): `emulator @Pixel8_API34 -no-window -no-audio -no-snapshot`

Wait for boot completion:
- `adb wait-for-device`
- `adb shell 'while [[ $(getprop sys.boot_completed) != 1 ]]; do sleep 1; done; input keyevent 82'`

## One-Command Helper Script
- Use `tools/scripts/setup-android-sdk.sh` to automate setup:
  - Setup SDK: `ANDROID_SDK_ROOT=~/Library/Android/sdk tools/scripts/setup-android-sdk.sh setup`
  - Create AVD: `AVD_NAME=Pixel8_API34 DEVICE_ID=pixel_8 tools/scripts/setup-android-sdk.sh create-avd`
  - Boot (CI): `AVD_NAME=Pixel8_API34 HEADLESS=true tools/scripts/setup-android-sdk.sh boot`
  - End-to-end: `tools/scripts/setup-android-sdk.sh full`

## Host Adapter Configuration
- Copy `agent/host-adapter/server/.env.example` to `.env` and adjust paths:
  - `PORT=4001`
  - `INSTANCE_MANAGER_URL=http://localhost:3002`
  - `ADB_PATH=$HOME/Library/Android/sdk/platform-tools/adb`
  - `EMULATOR_PATH=$HOME/Library/Android/sdk/emulator/emulator`

## ADB Tips
- List devices: `adb devices`
- Shell: `adb -s emulator-5554 shell`
- Install APK: `adb -s emulator-5554 install -r path/to/app.apk`
- Launch app: `adb -s emulator-5554 shell am start -n com.example/.MainActivity`

## Contribution Guide
- Follow repository code style and naming conventions.
- Keep changes focused and documented.
