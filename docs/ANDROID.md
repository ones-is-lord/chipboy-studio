# Android build and install

Chipboy Studio ships as a Capacitor Android app. The Android project wraps the
same React app that runs on the web, bundles every asset in the APK and adds
native share, status bar, splash screen and haptics plugins.

## What is in the APK

- Package name: `io.github.onesislord.chipboy`
- Minimum SDK: 24 (Android 7.0)
- Target SDK: 36 (Android 16)
- Version: `1.3.0`, version code `3`
- Web assets: copied from `dist/` into `android/app/src/main/assets/public/`
- Permissions: microphone (optional sampler recording), vibration (haptics)
  and audio settings. The APK requests no internet permission.
- No analytics, advertising, crash reporting or remote API calls
- Android backup is disabled, so projects stay on the device unless the user
  exports or shares them

The app is fully offline after installation. Android's WebView loads the
bundled `https://localhost` app shell through Capacitor's local asset handler;
it never fetches the live website. Cleartext traffic is disabled.

## Prerequisites

- Node.js 22 or newer
- pnpm 12
- JDK 21
- Android SDK Platform 36 and Build Tools 36.0.0
- Android Studio, or the Android command-line tools

Set `ANDROID_HOME` and `JAVA_HOME` before running Gradle:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

## Build commands

```bash
pnpm install

# Build the web app, copy it into android/ and update native plugins.
pnpm android:sync

# Installable debug APK, signed with the local debug key.
pnpm android:debug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Release APK. Signed only when the signing variables below are set.
pnpm android:release
# Output: android/app/build/outputs/apk/release/app-release.apk
```

`pnpm android:sync` is the important command after any web change. It runs the
Vite build and then `cap sync android`, which copies `dist/` and refreshes the
native plugin list.

To open the native project in Android Studio:

```bash
pnpm android:open
```

## Signing a release APK

The Gradle file reads four environment variables. When all four are present,
`assembleRelease` signs the APK:

```bash
export CHIPBOY_KEYSTORE_PATH="$HOME/.chipboy-signing/release.jks"
export CHIPBOY_KEYSTORE_PASSWORD="..."
export CHIPBOY_KEY_ALIAS="chipboy"
export CHIPBOY_KEY_PASSWORD="..."
pnpm android:release
```

Create a keystore once and keep it somewhere safe:

```bash
keytool -genkeypair \
  -keystore "$HOME/.chipboy-signing/release.jks" \
  -alias chipboy \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Chipboy Studio, O=Chipboy Studio, C=US"
```

Do not commit the keystore or its password. The GitHub release workflow stores
the keystore and password as repository secrets (`ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) and
signs the APK automatically.

Verify a signed APK:

```bash
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose \
  android/app/build/outputs/apk/release/app-release.apk
```

The release workflow runs the same check before uploading the APK.

## Install on a device

### Sideload the APK

1. Download `chipboy-studio-v1.3.0.apk` from the GitHub release.
2. Open the file on the Android device.
3. Allow installs from the browser or file manager when Android asks.
4. Open Chipboy Studio from the launcher.

### Install with ADB

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

To install a debug build:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Native integration

The native bridge lives in `src/lib/native.ts`.

- **Export WAV and project JSON:** writes the file to the app cache and opens
  Android's share sheet, so the user can save it to Files, send it to another
  app or upload it to their own cloud storage.
- **Share song link:** opens the Android share sheet with the public
  `ones-is-lord.github.io` link.
- **Haptics:** a light impact on workspace tab changes.
- **Status bar and splash screen:** brand colours from `capacitor.config.ts`
  and the Android theme.
- **Back button:** navigates WebView history when possible, otherwise exits.
- **Microphone:** the WebView permission bridge maps the browser request to
  Android's `RECORD_AUDIO` permission.

Browser downloads still work on the web build. The native path is selected at
runtime with `Capacitor.isNativePlatform()`.

## Icons and splash screens

The source art is generated from the same pixel controller used by the web
favicon:

```bash
python3 -m pip install pillow
curl -sL -o /tmp/fonts/PressStart2P-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf
python3 scripts/generate-icons.py /tmp/fonts/PressStart2P-Regular.ttf
pnpm android:icons
```

`scripts/generate-icons.py` writes `resources/icon.png`,
`resources/icon-foreground.png`, `resources/icon-background.png` and
`resources/splash.png`. `pnpm android:icons` expands them into every Android
density and adaptive-icon variant.

## Offline service worker

The web build uses `vite-plugin-pwa`. It precaches the app shell, fonts, icons
and hashed JavaScript chunks. The service worker is useful for the browser and
PWA install; the Android APK does not depend on it because the assets are
already inside the APK.

## Version bumps

When releasing a new Android version, update all of these together:

1. `package.json` `version`
2. `android/app/build.gradle` `versionCode` and `versionName`
3. `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`
4. `fdroid/io.github.onesislord.chipboy.yml` `CurrentVersion`,
   `CurrentVersionCode` and the new `Builds` entry
5. `CHANGELOG.md`

`versionCode` must always increase. F-Droid and Android use it to decide
whether an APK is an upgrade.

## Troubleshooting

**`SDK location not found`** — set `ANDROID_HOME` or create
`android/local.properties` with `sdk.dir=/path/to/Android/Sdk`.

**`Unsupported class file major version`** — Gradle is using the wrong JDK.
Set `JAVA_HOME` to JDK 21.

**The app opens but assets are stale** — run `pnpm android:sync` again. The
Android project copies `dist/`; it does not read from the Vite dev server.

**Microphone recording does nothing** — check Android Settings → Apps →
Chipboy Studio → Permissions → Microphone. The sampler also needs a user
gesture before Web Audio starts.

**Share sheet does not appear** — export to the cache directory first. The
Capacitor Share plugin only exposes the cache path by default; the app writes
exports to `Directory.Cache` before sharing.

**Gradle runs out of memory** — add `org.gradle.jvmargs=-Xmx4g` to
`android/gradle.properties`, or run `./gradlew assembleRelease --no-daemon`.
