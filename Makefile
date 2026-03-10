# ─────────────────────────────────────────────────────────────────────────────
# SpeakEasy — developer Makefile
# ─────────────────────────────────────────────────────────────────────────────
SHELL := /bin/zsh

# Android SDK — auto-detect or override with: make android ANDROID_HOME=/path
ANDROID_HOME ?= $(shell [ -d "$$HOME/Library/Android/sdk" ] && echo "$$HOME/Library/Android/sdk" || echo "$$ANDROID_HOME")
ADB           = $(ANDROID_HOME)/platform-tools/adb
GRADLEW       = ./android/gradlew

# ── Gradle distribution (corporate SSL / MITM-proxy workaround) ────────────
# `curl` uses the macOS system SSL stack (Secure Transport) which already
# trusts the corporate proxy CA.  The JVM-based Gradle wrapper does not.
# `make gradle-download` pre-populates the wrapper cache so the wrapper never
# needs to download over HTTPS with its own JVM TLS stack. Gradle names the
# cache directory using a base36-encoded MD5 of the distribution URL, so we
# must mirror that exact algorithm here.
GRADLE_DIST_URL = https://services.gradle.org/distributions/gradle-8.11.1-all.zip
GRADLE_DIST_ZIP = gradle-8.11.1-all.zip
GRADLE_CACHE    = $(HOME)/.gradle/wrapper/dists/gradle-8.11.1-all

# ── Colours ─────────────────────────────────────────────────────────────────
C_RESET  = \033[0m
C_GREEN  = \033[1;32m
C_CYAN   = \033[1;36m
C_YELLOW = \033[1;33m

# ─────────────────────────────────────────────────────────────────────────────
#  Web / Dev
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: install dev build preview lint gradle-download clean help

## Install npm dependencies
install:
	@echo "$(C_CYAN)▸ npm install$(C_RESET)"
	npm install

## Start Vite dev server (hot reload)
dev:
	@echo "$(C_GREEN)▸ Starting dev server…$(C_RESET)"
	npx vite --host

## Production build → dist/
build:
	@echo "$(C_CYAN)▸ Building for production…$(C_RESET)"
	npx vite build

## Preview production build locally
preview: build
	npx vite preview --host

## Run ESLint
lint:
	npx eslint .

## Pre-download Gradle wrapper zip using curl (run ONCE behind corporate SSL proxies).
## curl uses macOS Secure Transport which already trusts the corporate proxy CA.
## The wrapper then finds the zip in its cache and skips the HTTPS download.
gradle-download:
	@echo "$(C_CYAN)▸ Pre-fetching Gradle distribution via curl…$(C_RESET)"
	@HEX_HASH=$$(echo -n '$(GRADLE_DIST_URL)' | md5 -q 2>/dev/null \
	      || echo -n '$(GRADLE_DIST_URL)' | md5sum | awk '{print $$1}'); \
	 HASH=$$(node -e "console.log(BigInt('0x' + process.argv[1]).toString(36))" "$$HEX_HASH"); \
	 DEST="$(GRADLE_CACHE)/$$HASH"; \
	 ZIP="$$DEST/$(GRADLE_DIST_ZIP)"; \
	 LEGACY_DEST="$(GRADLE_CACHE)/$$HEX_HASH"; \
	 LEGACY_ZIP="$$LEGACY_DEST/$(GRADLE_DIST_ZIP)"; \
	 if [ -f "$$ZIP" ]; then \
	   echo "$(C_GREEN)✔ Already cached: $$ZIP$(C_RESET)"; \
	 elif [ -f "$$LEGACY_ZIP" ]; then \
	   mkdir -p "$$DEST"; \
	   cp "$$LEGACY_ZIP" "$$ZIP"; \
	   echo "$(C_GREEN)✔ Moved legacy cache into Gradle wrapper path: $$ZIP$(C_RESET)"; \
	 else \
	   mkdir -p "$$DEST"; \
	   echo "$(C_CYAN)  → $(GRADLE_DIST_URL)$(C_RESET)"; \
	   curl -L --progress-bar -o "$$ZIP" '$(GRADLE_DIST_URL)'; \
	   echo "$(C_GREEN)✔ Saved to $$ZIP$(C_RESET)"; \
	 fi

## Delete build artefacts
clean:
	@echo "$(C_YELLOW)▸ Cleaning build artefacts…$(C_RESET)"
	rm -rf dist android/app/build android/app/src/main/assets/public

# ─────────────────────────────────────────────────────────────────────────────
#  Capacitor — sync
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: sync sync-android sync-ios

## Build web + sync all platforms
sync: build
	npx cap sync

## Build web + sync Android only
sync-android: build
	npx cap sync android

## Build web + sync iOS only
sync-ios: build
	npx cap sync ios

# ─────────────────────────────────────────────────────────────────────────────
#  Android
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: android android-debug android-release android-install android-run android-open android-log android-devices gradle-download

## Build web → sync → assemble debug APK → install on USB device
android: sync-android android-debug android-install
	@echo "$(C_GREEN)✔ APK installed on device$(C_RESET)"

## Assemble Android debug APK
## (auto-downloads Gradle distribution via curl on first run if not cached)
android-debug: gradle-download
	@echo "$(C_CYAN)▸ Assembling debug APK…$(C_RESET)"
	cd android && ./gradlew assembleDebug

## Assemble Android release APK (unsigned)
android-release: gradle-download
	@echo "$(C_CYAN)▸ Assembling release APK…$(C_RESET)"
	cd android && ./gradlew assembleRelease

## Install debug APK on connected USB device
android-install:
	@echo "$(C_CYAN)▸ Installing APK on device…$(C_RESET)"
	$(ADB) install -r android/app/build/outputs/apk/debug/app-debug.apk

## Build + sync + run directly on USB device (Capacitor live)
android-run: sync-android
	npx cap run android --target $(shell $(ADB) devices | awk 'NR==2{print $$1}')

## Open project in Android Studio
android-open:
	npx cap open android

## Stream device logcat filtered to SpeakEasy
android-log:
	$(ADB) logcat -s "Capacitor" "Capacitor/*" "WebView" | grep -i --color speakeasy || $(ADB) logcat | grep -iE "capacitor|speakeasy|chromium"

## List connected Android devices
android-devices:
	$(ADB) devices -l

# ─────────────────────────────────────────────────────────────────────────────
#  iOS  (macOS only)
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: ios ios-open ios-run

## Build web + sync + open Xcode
ios: sync-ios ios-open

## Open Xcode workspace
ios-open:
	npx cap open ios

## Build + run on connected iOS device / simulator
ios-run: sync-ios
	npx cap run ios

# ─────────────────────────────────────────────────────────────────────────────
#  Shortcuts
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: all fresh

## Full pipeline: install → build → sync → android APK → install on device
all: install android

## Clean everything and rebuild from scratch
fresh: clean install android

# ─────────────────────────────────────────────────────────────────────────────
#  Help
# ─────────────────────────────────────────────────────────────────────────────

## Show this help
help:
	@echo ""
	@echo "$(C_GREEN)SpeakEasy Makefile targets$(C_RESET)"
	@echo "─────────────────────────────────────────"
	@echo ""
	@echo "$(C_CYAN)Web / Dev$(C_RESET)"
	@echo "  make install          Install npm deps"
	@echo "  make dev              Vite dev server (hot reload)"
	@echo "  make build            Production build → dist/"
	@echo "  make preview          Preview prod build locally"
	@echo "  make lint             ESLint"
	@echo "  make clean            Remove build artefacts"
	@echo ""
	@echo "$(C_CYAN)Capacitor$(C_RESET)"
	@echo "  make sync             Build + sync all platforms"
	@echo "  make sync-android     Build + sync Android"
	@echo "  make sync-ios         Build + sync iOS"
	@echo ""
	@echo "$(C_CYAN)Android$(C_RESET)"
	@echo "  make android          Build → sync → APK → install on USB device"
	@echo "  make android-debug    Assemble debug APK only"
	@echo "  make android-release  Assemble release APK (unsigned)"
	@echo "  make android-install  Push debug APK to USB device"
	@echo "  make android-run      Capacitor run on USB device"
	@echo "  make android-open     Open Android Studio"
	@echo "  make android-log      Stream device logs (Capacitor)"
	@echo "  make android-devices  List USB devices"
	@echo ""
	@echo "$(C_CYAN)iOS$(C_RESET)"
	@echo "  make ios              Build + sync + open Xcode"
	@echo "  make ios-run          Build + run on device/sim"
	@echo ""
	@echo "$(C_CYAN)Shortcuts$(C_RESET)"
	@echo "  make all              Full pipeline: install → APK → device"
	@echo "  make fresh            Clean + full rebuild"
	@echo ""
	@echo "$(C_CYAN)TLS / Corporate proxy$(C_RESET)"
	@echo "  make gradle-download  Download Gradle zip via curl (system SSL = proxy-aware)"
	@echo "                        Runs automatically before android-debug / android-release"
	@echo ""

.DEFAULT_GOAL := help
