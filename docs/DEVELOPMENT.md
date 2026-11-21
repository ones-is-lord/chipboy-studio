# Development guide

## Prerequisites

- Node.js **20.19** or newer (Node 24 is used in CI).
- pnpm **12**, declared through `packageManager` in `package.json`.
- A browser with Web Audio. Chrome, Firefox or Safari 16.4+ are good targets.
- Python 3 with Pillow, only if you regenerate icons.

## Install

```bash
git clone https://github.com/ones-is-lord/chipboy-studio.git
cd chipboy-studio
corepack enable
pnpm install --frozen-lockfile
```

If Corepack cannot write to its global directory:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

## Run

```bash
pnpm dev
```

The dev server listens on <http://localhost:8080>. Browsers require a user gesture before audio can start, so press Play or a key once after the page loads.

### Preview hosts and tunnels

Vite rejects unknown `Host` headers by default. Add the hostnames you use:

```bash
VITE_ALLOWED_HOSTS=localhost,my-preview.example.com pnpm dev
```

Comma-separate multiple hosts. The same variable also allows hosts on `pnpm preview`; production hosting does not use it.

### Base path

For a subdirectory deployment, build with a base path:

```bash
VITE_BASE_PATH=/chipboy-studio/ pnpm build
```

The route check and manifest follow `import.meta.env.BASE_URL`. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Or run all four:

```bash
pnpm check
```

CI runs `pnpm check` on every push and pull request. A pull request should not be merged with a failing check.

### Tests

Vitest runs in Node. There is no DOM test runner by default; component behavior is verified in a real browser. The audio tests use a tiny `AudioBuffer` polyfill in `src/test/setup.ts`, so the real processing functions execute instead of mocks.

Run one file:

```bash
pnpm test src/lib/project.test.ts
```

Run in watch mode:

```bash
pnpm test:watch
```

When adding a test, prefer real domain functions and small fixtures. Do not mock `project.ts`, `wav.ts` or the sample-processing functions; they are pure and fast.

### Lint and formatting

ESLint covers TypeScript, React hooks and fast refresh. There is no separate formatter; match the surrounding style (double quotes, semicolons, two-space indentation, trailing commas in multiline literals).

## Source layout

```text
src/
  components/        UI, one concern per file
  components/ui/     shadcn/ui primitives kept by the app
  hooks/             playback and undo history
  lib/               pure domain modules and their tests
  pages/             route components
  test/              Vitest setup and audio fixtures
  App.tsx            route check, providers and error boundary
  globals.css        console theme, pixel fonts, motion
```

The app has one real screen and a 404 fallback. `src/App.tsx` compares `window.location.pathname` with `import.meta.env.BASE_URL`, so no router dependency is needed. Pages live in `src/pages/`.

## Audio development tips

- The audio engine is split into `scheduleVoice` (one note) and `renderSong` (whole arrangement). Test a single voice by calling `scheduleVoice` with an `OfflineAudioContext`.
- `stepSeconds(song)` is the single source of timing truth. Do not duplicate the BPM math.
- `songEvents(song)` is pure. Inspect it in a test or a temporary console log when an arrangement plays the wrong notes.
- Sample playback uses `playbackRate`, not resampling on the main thread. Changing pitch does not change duration.
- The offline render and live playback share the same scheduling path. If export sounds different from playback, compare the effect bus and the master gain first.
- Riffs are plain note data plus a preset ID. Add built-ins in `src/lib/riffs.ts`; never put an `AudioBuffer` in a riff or in `localStorage`.
- Rendering is capped at five minutes. Long songs are truncated with a toast.

## Regenerating artwork

The favicon, app icons and social image are generated from one 32×32 pixel grid in `scripts/generate-icons.py`.

```bash
python3 -m pip install pillow
mkdir -p /tmp/fonts
curl -sL -o /tmp/fonts/PressStart2P-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf
python3 scripts/generate-icons.py /tmp/fonts/PressStart2P-Regular.ttf
```

Outputs:

- `public/favicon.svg`
- `public/favicon.ico` (16, 32 and 48 px)
- `public/apple-touch-icon.png`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/og-image.png`

The in-app sprites live in `src/components/PixelArt.tsx`. They are plain SVG rectangles, not image files, so they stay crisp at any size and need no network request.

## Adding a preset

1. Add an entry to `instruments` in `src/lib/instruments.ts`.
2. Give it a unique `id`, a category, a `voice` and synth parameters.
3. Run `pnpm test`. The instrument test checks unique IDs and valid voices.
4. Preview it in the Instruments tab. The waveform drawing uses the same parameters as the engine.

## Adding a project field

1. Add the field to the Zod schema in `src/lib/project.ts`.
2. Add a normalization rule with a safe default.
3. Update `docs/PROJECT_FORMAT.md`.
4. Add a round-trip test in `src/lib/project.test.ts`.
5. Bump `PROJECT_VERSION` only if old files would be interpreted differently.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Blocked request. This host is not allowed.` | Vite host check | Set `VITE_ALLOWED_HOSTS`. |
| No sound | Audio context not started | Press Play or a pad once. Check the tab is not muted. |
| Export is silent | Master or channel volume at zero, or no arranged blocks | Check the mixer and arrangement. |
| Sample channel is silent after loading | Sample audio is not stored in project files | Re-import the WAV in the Sampler. |
| `QuotaExceededError` on save | `localStorage` is full | Delete old slots or export JSON. |
| Icons or manifest 404 on a subpath | Build without a base path | Set `VITE_BASE_PATH` and rebuild. |
| Fonts look like a fallback | Font CSS blocked by CSP or the network | Fonts are self-hosted; check the built `assets` directory. |
