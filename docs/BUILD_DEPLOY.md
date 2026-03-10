# SpeakEasy — Build, Deploy & Publish Guide

> **Solo-founder cheat-sheet.** Everything you need to go from `git clone` to the
> App Store and Google Play. See also the [Makefile](../Makefile) at the repo root
> for one-command shortcuts.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development (Browser)](#2-local-development-browser)
3. [Android — Local Build & Device Deploy](#3-android--local-build--device-deploy)
4. [iOS — Local Build & Device Deploy](#4-ios--local-build--device-deploy)
5. [Publish to Google Play](#5-publish-to-google-play)
6. [Publish to Apple App Store](#6-publish-to-apple-app-store)
7. [Version Bumping](#7-version-bumping)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| **Node.js** | 18+ | `brew install node` or [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Comes with Node |
| **Xcode** | 15+ | Mac App Store (iOS builds only) |
| **Xcode CLI Tools** | – | `xcode-select --install` |
| **CocoaPods** | 1.15+ | `brew install cocoapods` |
| **Android Studio** | Hedgehog+ | [developer.android.com](https://developer.android.com/studio) |
| **JDK** | 17 | `brew install openjdk@17` |
| **Capacitor CLI** | 7+ | Installed as project dep (`npx cap`) |

### One-time setup

```bash
# Clone & install JS deps
git clone <your-repo-url> speakeasy && cd speakeasy
npm install

# Android: accept SDK licences (first time)
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

# iOS: install native pods (first time)
cd ios/App && pod install && cd ../..
```

> **Tip:** Set `ANDROID_HOME` in your shell profile:
> ```bash
> export ANDROID_HOME="$HOME/Library/Android/sdk"
> export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
> ```

---

## 2. Local Development (Browser)

```bash
npm run dev          # starts Vite dev server at http://localhost:5173
```

This gives you hot-module reload. The app works fully in the browser (TTS uses
`speechSynthesis`, haptics are no-ops). WebGPU / SharedArrayBuffer headers are
configured in `vite.config.js` so local LLM inference works in Chrome.

```bash
npm run build        # production build → dist/
npm run preview      # preview the production build locally
```

---

## 3. Android — Local Build & Device Deploy

### 3a. Quick run on a connected device / emulator

```bash
make android         # build web → sync → open Android Studio
# or run directly on a connected device:
make android-run     # build web → sync → deploy to device
```

**Manual equivalent:**

```bash
npm run build
npx cap sync android
npx cap run android          # deploys to connected device
# or:  npx cap open android  # opens Android Studio
```

### 3b. Build a signed APK / AAB (release)

1. **Generate a keystore** (once):

   ```bash
   keytool -genkey -v \
     -keystore speakeasy-release.keystore \
     -alias speakeasy \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

   Store the keystore file **outside** the repo. Never commit it.

2. **Create `android/keystore.properties`** (git-ignored):

   ```properties
   storeFile=../../speakeasy-release.keystore
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=speakeasy
   keyPassword=YOUR_KEY_PASSWORD
   ```

3. **Add signing config** to `android/app/build.gradle`:

   ```gradle
   android {
       signingConfigs {
           release {
               def props = new Properties()
               props.load(new FileInputStream(file("../keystore.properties")))
               storeFile     file(props['storeFile'])
               storePassword props['storePassword']
               keyAlias      props['keyAlias']
               keyPassword   props['keyPassword']
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

4. **Build the AAB:**

   ```bash
   make android-release
   # or manually:
   npm run build && npx cap sync android
   cd android && ./gradlew bundleRelease && cd ..
   ```

   Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 4. iOS — Local Build & Device Deploy

### 4a. Quick run on a connected device / simulator

```bash
make ios             # build web → sync → open Xcode
# or:
make ios-run         # build web → sync → deploy to device
```

**Manual equivalent:**

```bash
npm run build
npx cap sync ios
npx cap open ios             # opens Xcode
# or:  npx cap run ios       # deploys to connected device
```

> **First time on a real device:** In Xcode → Signing & Capabilities, select
> your **Personal Team** or **Apple Developer** team and set a unique
> Bundle ID (e.g. `com.yourname.speakeasy`).

### 4b. Build an archive for distribution

1. In Xcode: **Product → Archive** (select "Any iOS Device" as target).
2. When the archive appears in the Organizer, click **Distribute App**.
3. Choose **App Store Connect** (or **Ad Hoc** for TestFlight-free beta).

Or from the command line:

```bash
make ios-release
```

This runs `xcodebuild archive` + `xcodebuild -exportArchive`. See the
Makefile for details.

---

## 5. Publish to Google Play

### 5a. First-time setup

1. Create a [Google Play Developer account](https://play.google.com/console/) ($25 one-time).
2. Create an app: **All apps → Create app**.
3. Fill in the **Store listing**: title, description, screenshots, icon.
4. Set up **Content rating** questionnaire.
5. Set **Pricing & distribution** (free or paid).

### 5b. Upload & release

1. Go to **Production → Create new release**.
2. Upload the `.aab` from `android/app/build/outputs/bundle/release/`.
3. Add release notes.
4. **Review → Start rollout to Production**.

> **Tip — Internal testing first:** Use the "Internal testing" track to get
> a link you can share with up to 100 testers within minutes (no review).

### 5c. Store listing essentials

| Asset | Spec |
|-------|------|
| App icon | 512 × 512 px, PNG, 32-bit |
| Feature graphic | 1024 × 500 px |
| Phone screenshots | Min 2, 16:9 or 9:16 |
| Short description | Max 80 chars |
| Full description | Max 4000 chars |

### 5d. AAC-specific review tips

- Declare **Accessibility** category.
- Mention AAC / assistive tech in the description — reviewers are lenient.
- If you use the microphone (Whisper listen mode), add a clear privacy note.

---

## 6. Publish to Apple App Store

### 6a. First-time setup

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. In [App Store Connect](https://appstoreconnect.apple.com/), create a **New App**.
3. Use bundle ID `com.speakeasy.app` (matches `capacitor.config.json`).

### 6b. Upload & release

1. **Archive** the app (Xcode → Product → Archive) or `make ios-release`.
2. In the Organizer, click **Distribute App → App Store Connect**.
3. In App Store Connect, select the build under your app version.
4. Fill in **App Information**, **Pricing**, **Screenshots**, **Review Notes**.
5. **Submit for Review**.

> **TestFlight:** After uploading a build, enable it in TestFlight for up to
> 10,000 external testers. Internal testers (your team) get it immediately.

### 6c. Store listing essentials

| Asset | Spec |
|-------|------|
| App icon | 1024 × 1024 px (no alpha) |
| iPhone screenshots | 6.7" (1290 × 2796) + 5.5" (1242 × 2208) |
| iPad screenshots | 12.9" (2048 × 2732) — required if you support iPad |
| Description | Max 4000 chars |
| Keywords | Max 100 chars, comma-separated |
| Privacy Policy URL | **Required** |

### 6d. Review tips

- Apple reviews take **24–48 h** (often faster).
- If using microphone/speech: add `NSMicrophoneUsageDescription` to `Info.plist`.
- If using on-device LLM: mention it runs locally, no data leaves the device.
- Add a **demo account** or video if the reviewer needs to see the full flow.

---

## 7. Version Bumping

Use the Makefile helper to bump version everywhere at once:

```bash
make bump-version V=1.2.0 C=5
```

This updates:
- `package.json` → `"version": "1.2.0"`
- Android `versionName` "1.2.0" + `versionCode` 5
- iOS `MARKETING_VERSION` "1.2.0" + `CURRENT_PROJECT_VERSION` 5

> **Google Play** requires `versionCode` to increase every upload.
> **App Store** requires `CURRENT_PROJECT_VERSION` to increase every upload.

---

## 8. Troubleshooting

### Android

| Problem | Fix |
|---------|-----|
| `SSLHandshakeException` while downloading Gradle | Run `make gradle-download` once to pre-cache the Gradle zip with `curl`; `make android-debug` and `make android-release` now reuse that cache automatically |
| `SDK location not found` | Create `android/local.properties` with `sdk.dir=/Users/YOU/Library/Android/sdk` |
| `Could not resolve com.android.tools.build:gradle` | Open Android Studio → SDK Manager → install SDK 35 |
| White screen on device | Run `npx cap sync android` — web assets may be stale |
| Build fails with `namespace not specified` | Ensure `namespace "com.speakeasy.app"` is in `android/app/build.gradle` |

### iOS

| Problem | Fix |
|---------|-----|
| `pod install` fails | `cd ios/App && pod repo update && pod install` |
| Signing error | Xcode → Signing & Capabilities → select your team |
| `No such module 'Capacitor'` | `cd ios/App && pod deintegrate && pod install` |
| Deployment target warning | Podfile already sets `platform :ios, '16.0'` — ensure Xcode matches |

### General

| Problem | Fix |
|---------|-----|
| `npx cap sync` fails | Delete `node_modules`, run `npm install`, retry |
| Web build fails | Check `npx vite build` output; usually a missing import |
| LLM not working on device | WebGPU requires iOS 17+ / Chrome 113+ — falls back to sentence frames |
