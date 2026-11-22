This merge request was created by an AI agent (OpenHands) on behalf of @ones-is-lord.

Adds Chipboy Studio, a local-first chiptune studio with optional CC0 audio downloads.

- Source: https://github.com/ones-is-lord/chipboy-studio
- Licence: MIT
- Version: 1.3.0 (versionCode 3)
- Tag: v1.3.0
- Build: Capacitor 8 + Vite 8 + Gradle, unsigned release APK
- Offline: the core studio is fully offline and all instruments/fonts are bundled. The optional free-pack browser uses the INTERNET permission to fetch CC0 game audio only when the user taps Download or Preview.
- Metadata: fastlane listing and screenshots in the upstream repository
- Local checks: `fdroid lint` clean; the last verified clean build from `v1.2.0` succeeded; the `v1.3.0` entry is added and awaits its tag
- `fdroiddata` CI: the `v1.2.0` submission was green (lint, rewritemeta, metadata tools, build and `check apk`); rerun CI for the `v1.3.0` update
- Suggested label: `New App`
