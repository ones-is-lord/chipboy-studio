# Chipboy Studio

**A pocket-sized chiptune studio that runs entirely in your browser and on Android.**

[**Play in your browser**](https://ones-is-lord.github.io/chipboy-studio/) · [**Download the Android APK**](https://github.com/ones-is-lord/chipboy-studio/releases/latest)

[![CI](https://github.com/ones-is-lord/chipboy-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/ones-is-lord/chipboy-studio/actions/workflows/ci.yml)
[![Android](https://github.com/ones-is-lord/chipboy-studio/actions/workflows/android.yml/badge.svg)](https://github.com/ones-is-lord/chipboy-studio/actions/workflows/android.yml)
[![Deploy](https://github.com/ones-is-lord/chipboy-studio/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ones-is-lord/chipboy-studio/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-933d60.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Android 7+](https://img.shields.io/badge/Android-7.0%2B-3ddc84.svg)](#android-app)
[![Web Audio](https://img.shields.io/badge/Web%20Audio-API-658342.svg)](https://developer.mozilla.org/docs/Web/API/Web_Audio_API)

![Chipboy Studio, a cream and green handheld console interface with a step sequencer](docs/screenshot.png)

Chipboy Studio is a complete little music workstation: a 16-step sequencer, a piano roll, 42 synth presets, an 18-lane loop-station drum machine, a microphone sampler with a slicer and 16 pads, project slots, share links and offline WAV export. No account. No server. No samples uploaded anywhere.

Built with React 19, TypeScript, Vite, Tailwind CSS and the Web Audio API. Styled like a very good 1990s handheld that never existed.

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Android app](#android-app)
- [Scripts](#scripts)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [How it works](#how-it-works)
- [Project files and privacy](#project-files-and-privacy)
- [Browser support](#browser-support)
- [Deployment](#deployment)
- [F-Droid](#f-droid)
- [Testing and quality](#testing-and-quality)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License and credits](#license-and-credits)

## Features

### Song maker

- Up to 32 channels per song, 16 bars by default, up to 64 bars.
- Two patterns per channel. Matching blocks share a pattern; duplicate a block to edit an independent copy.
- Multi-bar clips from 1 to 8 bars, with drag-to-move and drag-to-swap arrangement editing.
- Tempo from 40 to 240 BPM, speed from 0.25x to 2x, 4/4, and a song-wide key transpose from −12 to +12 semitones.
- Per-channel volume, pitch, pan, mute and solo, plus a full FX rack and a master volume.
- Undo and redo across musical edits.
- Transport with play, pause, stop and return-to-start.

### Pattern editor

- Step pads or a piano roll with a five-octave keyboard.
- Draw notes, drag them, resize their length and copy patterns between A and B.
- Trim, stretch, repeat or remove a block. Sample blocks follow the sample's loop mode.
- Channel octave transposition without touching note data.

### Riff library

- 95 built-in one-bar riffs across drum loops, modern beats, basslines, melodies, chords/arps, retro game music, cinematic cues and FX.
- Audition any riff at the current song tempo, then stamp it into the selected channel and pattern in one click.
- Stamping switches the channel to the riff's instrument and root note while keeping the channel name; sample channels keep their audio and fit the riff by octave.
- Capture the selected pattern as a named custom riff. Up to 40 custom riffs live in browser storage.
- Category filters, name search, a 16-step mini-grid on every card, and a delete action for custom riffs.

### Beat lab

![Chipboy Studio Beat lab, an 18-lane drum machine with a playing step grid](docs/beat-lab.png)

- An 18-lane, 16-step rows × columns drum machine with four pattern banks (A–D) and a loop-station transport.
- Lanes for kick, double bass, snare, snare roll, toms 1–3, closed hat, open hat, cymbal, ride, timpani, kettle bell, cowbell, clap 1, clap 2 and two custom slots.
- BPM slider from 40 to 240, swing from 0 to 60%, master level and per-lane preview.
- Custom A and B can load any preset from the instrument library, including melodic sounds.
- Copy a bank, randomize a musical starting point, clear a bank or start a fresh pattern.
- Send the active lanes to the song as individual drum-kit channels at the selected bar, then shape them with the FX rack.

### Instruments

- 42 original presets across chiptune, synths, bass, keys and drums.
- Preview any preset, assign it to the selected channel or add a new channel.
- Waveform previews generated from the same parameters used by the audio engine.

### Sampler

- Import WAV, MP3, OGG and other browser-decodable audio; up to 50 MB and two minutes per file.
- Record from the microphone for up to 60 seconds.
- Waveform selection with crop, normalize, reverse, fade in, fade out and gain.
- Equal or transient slicing into 2, 4, 8 or 16 slices.
- 16 keyboard-mapped pads, each assignable to a sample and playable live.
- Assign a sample to a channel and place it in the arrangement as pitched or looped audio.

### Projects

- Up to 30 named slots in `localStorage`, with autosave for the current session.
- Export and import `.chipboy.json` files. The importer accepts Chipboy Studio v3, v4 and v5 files.
- Share links carry song data in the URL fragment-free `project` query parameter; no upload is involved.
- Download a stereo 16-bit WAV of the arrangement, up to five minutes.
- Clear warnings when a project references sample audio that is not in the current browser session.

### Interface

- Six workspaces: Song maker, Instruments, Sampler, Riffs, Beat lab and Projects.
- SNES-style pixel-art controller overlaid on a music note, with high-contrast outlines, animated sprites and a blinking power LED.
- SNES-inspired textured plastic shell and bezels, a glass-like highlight across the screen, and chunky bevelled hardware controls with extra-bold labels that fit every button size.
- Self-hosted pixel fonts (Press Start 2P and Pixelify Sans) and a rounded body font (Nunito). No Google Fonts request at runtime.
- A 23-control FX rack with presets for clean, crunch, acid, wide, dub, lo-fi, compression, space and destroy.
- Bolder pixel typography with layered letter shadows, scanline and glass-sheen overlays, LCD readouts and a reduced-motion mode that respects `prefers-reduced-motion`.
- Responsive layout, keyboard navigation and visible focus states.
- Installable web app manifest, offline service worker and social preview image.
- Native Android shell with an offline APK, Android share sheet, haptics, splash screen and launcher icon.

## Quick start

Requirements: **Node.js 20.19+** and **pnpm 12** (the repository declares `packageManager`).

```bash
git clone https://github.com/ones-is-lord/chipboy-studio.git
cd chipboy-studio
corepack enable
pnpm install
pnpm dev
```

Open <http://localhost:8080>. The first tap or keypress starts the Web Audio context, as required by browsers.

If `corepack enable` is blocked by permissions, run commands through Corepack directly:

```bash
corepack pnpm install
corepack pnpm dev
```

To let a container or tunnel host reach the dev server, pass the hostnames explicitly:

```bash
VITE_ALLOWED_HOSTS=my-preview.example.com pnpm dev
```

## Android app

The Android build is a complete offline app, not a browser shortcut. Capacitor bundles the web runtime, all assets and the native share, status-bar, splash and haptics plugins into one APK. The app never needs a network connection to make music.

- **Package:** `io.github.onesislord.chipboy`
- **Minimum Android:** 7.0 (API 24)
- **Target Android:** 16 (API 36)
- **APK size:** about 4.3 MB
- **Permissions:** microphone, vibration and audio settings only; no internet permission
- **Download:** [latest GitHub release](https://github.com/ones-is-lord/chipboy-studio/releases/latest)

To install, download the `.apk`, open it on the device, and allow installs from your browser or file manager when Android asks. The release APK is signed for sideloading; F-Droid builds and signs its own copy from the same source.

Build it locally:

```bash
pnpm install
pnpm android:sync      # build the web bundle and copy it into android/
pnpm android:debug     # debug APK: android/app/build/outputs/apk/debug/app-debug.apk
pnpm android:release   # signed release APK, if signing variables are set
```

For a signed release, set `CHIPBOY_KEYSTORE_PATH`, `CHIPBOY_KEYSTORE_PASSWORD`, `CHIPBOY_KEY_ALIAS` and `CHIPBOY_KEY_PASSWORD`. The GitHub release workflow does this automatically from repository secrets.

See [docs/ANDROID.md](docs/ANDROID.md) for the full Android build, signing, emulator and troubleshooting guide.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the Vite dev server on port 8080. |
| `pnpm build` | Type-check and build the production bundle into `dist/`. |
| `pnpm preview` | Serve the production build locally. |
| `pnpm lint` | Run ESLint over the repository. |
| `pnpm lint:fix` | Apply ESLint's safe fixes. |
| `pnpm typecheck` | Run TypeScript with `--noEmit`. |
| `pnpm test` | Run the Vitest suite once. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm check` | Lint, type-check, test and build in one command. This is what CI runs. |
| `pnpm android:sync` | Build the web bundle and sync it into the Android project. |
| `pnpm android:debug` | Build an installable debug APK. |
| `pnpm android:release` | Build a release APK, signed when the signing variables are set. |
| `pnpm android:lint` | Run Android Lint. |
| `pnpm android:icons` | Regenerate Android launcher icons and splash screens. |
| `pnpm android:open` | Open the Android project in Android Studio. |

Regenerate the favicon, app icons and social image after changing the pixel artwork:

```bash
python3 -m pip install pillow
curl -sL -o /tmp/fonts/PressStart2P-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf
python3 scripts/generate-icons.py /tmp/fonts/PressStart2P-Regular.ttf
```

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Space` | Play or pause the song. In arrangement focus, pick up or drop a block. |
| `←` / `→` | Move the selected arrangement block by one bar. |
| `Escape` | Cancel an arrangement move. |
| `1`–`4`, `Q`–`R`, `A`–`F`, `Z`–`V` | Trigger the 16 sampler pads. |
| `Delete` / `Backspace` | Delete the selected note in the piano roll. |
| `Cmd/Ctrl + Z` | Undo. |
| `Cmd/Ctrl + Shift + Z` or `Ctrl + Y` | Redo. |

## How it works

```mermaid
flowchart LR
  UI[React workspace] --> Provider[StudioProvider]
  UI --> Riffs[Riff library]
  Riffs --> Provider
  Provider --> History[Undo history]
  Provider --> Storage[Project storage]
  Provider --> Engine[Web Audio engine]
  Engine --> Voices[Synth and sample voices]
  Voices --> FX[Per-channel FX buses]
  FX --> Speakers[Destination]
  Engine --> Offline[OfflineAudioContext render]
  Offline --> WAV[16-bit WAV download]
```

The song is plain serializable state. Playback converts arrangement blocks into timed note events, schedules them on a `BaseAudioContext`, and the same scheduling code runs against an `OfflineAudioContext` for WAV export. The sampler keeps decoded `AudioBuffer` objects in memory only; project files and browser storage keep sample metadata and a `sampleId`, never raw audio.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module boundaries, the audio graph and the state flow. Read [docs/MUSIC-GENERATOR.md](docs/MUSIC-GENERATOR.md) for the research behind the riff library and mixer. Read [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md) for the file schema.

## Project files and privacy

- **No audio leaves the browser.** Imports are decoded locally. Share links contain note and arrangement data only.
- **Microphone access is opt-in.** The browser asks for permission the first time you press Record. `Permissions-Policy` on the deployment allows microphone access for this origin only.
- **Local projects are not backups.** `localStorage` can be cleared by the browser, private windows or site-data settings. Export JSON for anything you care about.
- **Sample audio is session-only.** After importing a project on another device, re-import its sample WAV files. The Projects screen lists channels that need attention.
- **Share links are not encrypted.** Anyone with the link can read the song data. Do not put private information in a song name.

The project file format is documented and validated with Zod on import. Invalid or oversized files are rejected with a readable error instead of partially loading.

## Browser support

Chipboy Studio targets current evergreen browsers with Web Audio, `AudioContext`, `OfflineAudioContext`, `MediaRecorder` and ES2020 modules.

| Browser | Playback | Export | Sampler import | Microphone |
| --- | --- | --- | --- | --- |
| Chrome / Edge (recent) | Yes | Yes | Yes | Yes |
| Firefox (recent) | Yes | Yes | Yes | Yes |
| Safari 16.4+ | Yes | Yes | Yes | Yes, after a user gesture |
| Mobile Safari / Chrome | Yes | Yes | Yes | Yes, where the OS permits |

`MediaRecorder` support varies on older mobile browsers. Importing a WAV file is always available as a fallback.

## Deployment

The build is a static SPA. Any static host works. The repository includes:

- `vercel.json` with SPA rewrites, cache headers and a restrictive Content Security Policy.
- `public/_headers` with the same policy for Netlify and compatible hosts.
- `.github/workflows/deploy-pages.yml` for GitHub Pages.

For Vercel, import the repository and keep the default build command `pnpm build` and output directory `dist`. For Netlify, use the same command and directory; `public/_headers` is copied into the build. For GitHub Pages, enable **Settings → Pages → Source: GitHub Actions** and run the deploy workflow; it sets `VITE_BASE_PATH` to the repository name and adds a `404.html` fallback.

Android releases are built by `.github/workflows/release.yml`. The workflow runs the full check, builds a signed APK from the repository secrets, verifies the signature and attaches both the APK and the static ZIP to the GitHub release.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for custom domains, base paths, headers and troubleshooting.

## F-Droid

The repository ships F-Droid-compatible metadata:

- `fastlane/metadata/android/en-US/` with the title, summary, description, changelog, icon, feature graphic and screenshots.
- `fdroid/io.github.onesislord.chipboy.yml`, a ready-to-copy build recipe for the [fdroiddata](https://gitlab.com/fdroid/fdroiddata) repository.

Chipboy Studio is MIT licensed, has no tracking, no ads and no network dependency. The Android build uses only free and open-source libraries and can be built from source with the Android SDK and the committed pnpm lockfile. The recipe passes `fdroid lint`, and the clean build from the `v1.2.0` tag produces an unsigned APK with no internet permission.

Run `pnpm fdroid:lint` after editing the recipe. The fdroiddata merge request still has to be opened from a GitLab account; the repository does not store GitLab credentials. See [docs/FDROID.md](docs/FDROID.md) for the submission checklist and the exact merge request text.

## Testing and quality

```bash
pnpm check
```

The suite covers song timing and arrangement helpers, project normalization and storage, share-link encoding, riff validity and custom-riff storage, drum-machine patterns and song conversion, transpose and solo behavior, WAV headers and sample quantization, sample processing, expanded effect clamping and tails, instrument metadata and event scheduling. Audio tests use a small `AudioBuffer` polyfill so the real processing code runs under Node.

The CI workflow runs the same command on every push and pull request, plus a production build. A separate F-Droid workflow lints the `fdroiddata` recipe. Dependabot keeps npm and GitHub Actions dependencies current.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Android build and install](docs/ANDROID.md)
- [F-Droid compatibility and submission](docs/FDROID.md)
- [Third-party licenses](THIRD_PARTY_LICENSES.md)
- [Inspired by MTV Music Generator](docs/MUSIC-GENERATOR.md)
- [Beat lab and FX rack](docs/BEAT-LAB.md)
- [Project file format](docs/PROJECT_FORMAT.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Release guide](docs/RELEASING.md)
- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), keep changes focused, and run `pnpm check` before opening a pull request. For security reports, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License and credits

Released under the [MIT License](LICENSE).

Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) by Stefie Justprince, and [Nunito](https://fonts.google.com/specimen/Nunito) by Vernon Adams, all under the SIL Open Font License. Icons are drawn as pixel art in this repository. Built with [React](https://react.dev), [Vite](https://vite.dev), [Tailwind CSS](https://tailwindcss.com) and the [Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API).

Chipboy Studio is an independent project. It is not affiliated with Nintendo or any console manufacturer.
