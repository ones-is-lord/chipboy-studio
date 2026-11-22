# Deployment guide

Chipboy Studio builds to static files in `dist/`. It has no server-side code and no environment variables that contain secrets.

```bash
pnpm install --frozen-lockfile
pnpm build
```

Upload the contents of `dist/`. Serve `index.html` for unknown paths so the 404 screen can render at `/anything`.

## Vercel

The repository includes `vercel.json`.

1. Import the GitHub repository in Vercel.
2. Framework preset: **Vite**.
3. Build command: `pnpm build`.
4. Output directory: `dist`.
5. Deploy.

`vercel.json` adds:

- An SPA rewrite to `index.html`.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS.
- A Content Security Policy that allows same-origin scripts, inline styles required by React, `data:`/`blob:` images and media, and same-origin/blob connections.
- Immutable caching for hashed assets.

If you add an external API or font host, update the CSP before deploying.

## Netlify

The repository includes `public/_headers`, which Netlify copies into the build.

- Build command: `pnpm build`
- Publish directory: `dist`
- SPA fallback: `public/_redirects` contains `/* /index.html 200`. Netlify copies it into the build.

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`.

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Run the **Deploy to GitHub Pages** workflow, or push a tag such as `v1.0.0`.

The workflow builds with:

```bash
VITE_BASE_PATH=/<repository-name>/ pnpm build
```

It copies `dist/index.html` to `dist/404.html` so deep links work on Pages. The manifest and route check use the same base path.

If the repository is a user or organization site (`<name>.github.io`), change `VITE_BASE_PATH` to `/` in the workflow.

## Android release

The release workflow publishes three artifacts for a `v*` tag:

- `chipboy-studio-<tag>.zip` — the static web build.
- `chipboy-studio-<tag>.apk` — the signed Android release APK.
- The source archive GitHub adds automatically.

The workflow reads the signing keystore from repository secrets. See
[ANDROID.md](ANDROID.md) for the secret names and local signing steps. The
signature is checked with `apksigner` before upload.

F-Droid does not use this APK. It builds its own from the tag and signs it with
the F-Droid key. See [FDROID.md](FDROID.md).

## Cloudflare Pages, S3, nginx

- Build command: `pnpm build`
- Output directory: `dist`
- SPA fallback: route unknown paths to `/index.html`.
- Cache `assets/*` for a year with immutable caching. Do not cache `index.html` for long.

nginx example:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}

location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## Headers

The recommended production headers are in `vercel.json` and `public/_headers`. The important ones:

| Header | Value | Why |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob: data:; connect-src 'self' blob: https://raw.githubusercontent.com; worker-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` | Blocks third-party script injection while allowing the audio, canvas and user-initiated free-pack downloads. |
| `Permissions-Policy` | `camera=(), geolocation=(), microphone=(self)` | The sampler needs the microphone; nothing else does. |
| `X-Frame-Options` | `DENY` | Prevents clickjacking. |
| `X-Content-Type-Options` | `nosniff` | Stops MIME confusion. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Keeps share URLs out of third-party referrers. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS only. |

Do not add `unsafe-eval`; the app does not need it.

## Custom domain and social previews

- Set the domain in the host dashboard.
- Update the canonical URL in `index.html` if you add one.
- Social previews use `og-image.png` (1200×630). Some crawlers require an absolute URL; if yours does, replace `%BASE_URL%og-image.png` with the full URL in `index.html`.
- Update `homepage`, `repository` and `bugs` in `package.json` if the repository moves.

## Base paths

`VITE_BASE_PATH` controls the Vite base, the route check and the manifest scope. It must start and end with `/`:

```bash
VITE_BASE_PATH=/chipboy-studio/ pnpm build
```

Absolute asset URLs in `index.html` use `%BASE_URL%`, so they follow the same value. The manifest uses relative icon paths.

## Release checklist

- [ ] `pnpm check` passes locally.
- [ ] CI is green on the release commit.
- [ ] `CHANGELOG.md` has an entry for the version.
- [ ] `package.json` version matches the tag.
- [ ] `android/app/build.gradle` `versionCode` is new and `versionName` matches the tag.
- [ ] A production build loads with no console errors.
- [ ] Playback, WAV export and project import work in Chrome and Safari.
- [ ] The social preview image and manifest icons load.
- [ ] The deployed CSP does not block the microphone or audio blobs.
- [ ] The release workflow produced a signed APK and `apksigner verify` passed.
- [ ] The APK installs on a clean Android device and opens in airplane mode.
- [ ] The F-Droid changelog file exists for the new version code.
- [ ] The F-Droid recipe points at the new tag and version code.
