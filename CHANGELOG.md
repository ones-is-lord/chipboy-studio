# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `pnpm fdroid:lint` and an F-Droid metadata CI workflow that validate the `fdroiddata` recipe on every relevant change.
- Full SIL Open Font License texts for Press Start 2P, Pixelify Sans and Nunito in `licenses/`, summarized in `THIRD_PARTY_LICENSES.md`.
- F-Droid submission packet with the exact merge request title, label and body in `docs/FDROID.md`.

### Changed
- F-Droid listing now points `WebSite` at the GitHub Pages build, uses the 75-character summary without a trailing period, and links the changelog through `/HEAD/` so it survives branch changes.
- The F-Droid recipe README and contributor checklist document the local lint and clean-build verification.
- The recipe installs OpenJDK 21 and Node.js from Debian `trixie` instead of piping a NodeSource script into a root shell.

### Fixed
- The F-Droid summary is quoted so `fdroid lint` can parse the colon in the listing text.

## [1.2.0] - 2026-11-21

### Added
- Android app built with Capacitor 8, packaged as `io.github.onesislord.chipboy` for Android 7.0 and newer.
- Offline APK that bundles the full studio, fonts and sound engine. No network is required to make music.
- Native Android share sheet for WAV exports, project JSON files and song links.
- Light haptic feedback on workspace tab changes, plus native status bar, splash screen and launcher icon.
- Android release workflow that builds, signs, verifies and publishes the APK alongside the static ZIP.
- Android CI workflow that builds a debug APK on every push and pull request.
- PWA service worker and offline precache for the browser build.
- F-Droid-compatible fastlane metadata, screenshots, feature graphic and a ready-to-copy `fdroiddata` recipe.
- `docs/ANDROID.md` and `docs/FDROID.md` with build, signing, install, release and submission instructions.
- `pnpm android:sync`, `android:debug`, `android:release`, `android:lint`, `android:icons` and `android:open` scripts.

### Changed
- Public share links now use the deployed GitHub Pages URL when created inside the Android app, instead of the local `https://localhost` WebView origin.
- The app shell respects Android safe-area insets and the system status and navigation bar colours.
- ESLint ignores the generated Android project so native Gradle output cannot break the web check.
- `pnpm check` now uses pnpm consistently.

### Fixed
- Gradle release signing no longer collides with the `keyAlias` and `keyPassword` property names.
- Android builds no longer depend on the debug keystore for release artifacts.

### Security
- Release signing keys are stored only in GitHub Actions secrets and a private local directory, never in the repository.
- Android release builds disable cleartext traffic, request no internet permission and disable app backup.
- `pnpm audit` reports no known vulnerabilities; the PWA build pins `workbox-build`'s `glob` dependency to a patched release.

## [1.1.0] - 2026-11-21

### Added
- GitHub release workflow that runs the full check, packages `dist/` and attaches it to a `v*` release.
- Release guide in `docs/RELEASING.md`.
- Riffs workspace with 30 built-in one-bar riffs across drum loops, basslines, melodies, chords/arps and FX.
- Riff auditioning at the current song tempo, one-click stamping into the selected channel and pattern, and octave fitting for sample channels.
- Custom riff capture in browser storage, with category filters and delete controls. Limit: 40 riffs.
- Song-wide key transpose from −12 to +12 semitones, applied to playback and WAV export without mutating notes.
- Per-channel pan, reverb send, delay send and solo controls.
- Colour-coded instrument families on arrangement blocks and channel rows.
- `docs/MUSIC-GENERATOR.md`, a researched design note on *Music 2000 / MTV Music Generator* and the features it inspired.
- SNES-style controller-and-music-note brand mark with a D-pad, four coloured face buttons, shoulder buttons and start/select.
- Tests for the riff library, custom-riff storage, transpose and solo behavior.

### Changed

- The interface now has a SNES-inspired textured plastic shell and bezel, a glass-like screen highlight, bolder pixel typography with layered letter shadows, pixel-font channel and preset names, and higher-contrast sprite outlines.
- Control labels now use 900-weight Nunito with tighter tracking, so every button label stays inside its control at mobile, tablet and desktop widths. The workspace tabs reflow to three columns on tablets before returning to five on desktop.
- The workspace now has five modes: Song maker, Instruments, Sampler, Riffs and Projects.
- Project format is now version 5. Version 3 and 4 files still import, with new fields defaulted.
- Live playback now builds per-channel effect buses, so reverb and delay sends are audible outside WAV export.
- The audio engine applies song transpose and solo filtering to both live playback and offline rendering.
- Documentation now reflects the real `chipboy-studio.*` storage keys.
- Upgraded Zod to 4.6 and refreshed the Vite, TypeScript and ESLint toolchain within semver ranges. `pnpm audit` reports no known vulnerabilities.
- Replaced the client router with a base-path route check for the single studio screen and the 404 fallback.

### Fixed

- Channel effect sends were previously applied only during WAV export.
- Pan is now honoured by the shared voice scheduler and by export.

### Removed

- `@tanstack/react-query`, `next-themes`, `@radix-ui/react-toast`, `tailwindcss-animate`, `react-router-dom` and the unused shadcn toast stack.

## [1.0.0] - 2026-11-21

### Added

- Five-channel chiptune sequencer with 16 bars by default and up to 64 bars.
- Two patterns per channel, multi-bar clips from 1 to 8 bars, drag-to-move and drag-to-swap arrangement editing.
- Step-pad and piano-roll editors with note draw, move, resize, trim and stretch.
- 30 original presets across chiptune, synths, bass, keys and drums, with waveform previews.
- Sampler with file import, microphone recording, waveform selection, crop, normalize, reverse, fade, gain, equal and transient slicing, and a 16-pad keyboard bank.
- Sample channels that can be placed in the arrangement as pitched or looped audio.
- Undo and redo with keyboard shortcuts.
- Per-channel volume, pitch and mute, master volume, tempo and speed controls.
- Project slots in `localStorage`, autosave, JSON export and import, and share links.
- Offline stereo 16-bit WAV export up to five minutes.
- Zod-validated project normalization with readable warnings for missing samples and overlapping clips.
- Error boundary, 404 screen, reduced-motion support and accessible controls.
- Pixel-art controller and music-note artwork, animated sprites, blinking power LED, scanline screen treatment, and self-hosted Press Start 2P, Pixelify Sans and Nunito fonts.
- Web app manifest, favicon set, Apple touch icon, social preview image, robots file and security headers.
- Vitest suite covering song helpers, project storage, share links, WAV encoding, sample processing, effects, instruments and event scheduling.

### Changed

- Reworked the workspace into four modes: Song maker, Instruments, Sampler and Projects.
- Inactive modes stay mounted so audio and unsaved edits survive tab changes.
- Project files are now version 4 with a documented envelope and backwards-compatible v3 import.
- Fonts are self-hosted instead of loaded from Google Fonts.
- Production build splits React, drag-and-drop and vendor code into separate chunks.

### Fixed

- TypeScript syntax error in the audio engine that blocked the build.
- WAV export no longer normalizes quiet material upward; clipping is attenuated instead.
- Sample channels that lose their audio after a project transfer now show a clear warning.
- Share links that are invalid or too large show an error instead of failing silently.
- Safe filenames no longer become a string of dashes.
- The piano-roll and step-pad editors reject overlapping multi-bar drops instead of corrupting the arrangement.

### Removed

- Unused shadcn/ui components, Dyad-specific tagging, demo components and unused dependencies.
- Google Fonts runtime request.
- Placeholder favicon and default README.
