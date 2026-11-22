# Releasing

Chipboy Studio ships as a static site and an Android APK. A release is a git tag, a verified production build, a signed APK and a GitHub release that contains both artifacts.

## Versioning

The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Major** — a breaking project-file change, a removed feature or a change that requires users to re-export projects.
- **Minor** — new instruments, riffs, workspace modes or other backwards-compatible features.
- **Patch** — fixes that do not change the project format or public workflow.

The version lives in `package.json` and at the top of `CHANGELOG.md`. Project files carry their own schema version, which is independent of the app version.

## Checklist

1. Update `CHANGELOG.md`. Move items from `Unreleased` into a dated version section and add migration notes if the project format changed.
2. Set the same version in `package.json`.
3. Bump `versionCode` and `versionName` in `android/app/build.gradle`. `versionCode` must be a new integer.
4. Add `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`.
5. Add a `Builds` entry for the new tag to `fdroid/io.github.onesislord.chipboy.yml` and update `CurrentVersion` and `CurrentVersionCode`.
6. Run the full gate:

   ```bash
   corepack pnpm install --frozen-lockfile
   corepack pnpm check
   ```

7. Smoke-test the production build:

   ```bash
   corepack pnpm preview
   ```

   Check playback, the Riffs workspace, project save/load and WAV export in a browser.
8. Build and verify the Android release locally:

   ```bash
   source ~/.chipboy-signing/signing.env
   corepack pnpm android:release
   "$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose \
     android/app/build/outputs/apk/release/app-release.apk
   ```

9. Install the APK on a device and check that it opens and plays in airplane mode.
10. Commit the release changes.
11. Tag and push:

   ```bash
   git tag v1.3.0
   git push origin main
   git push origin v1.3.0
   ```

## What the tag triggers

- **Release** (`.github/workflows/release.yml`) runs `pnpm check`, builds and signs the APK, verifies the signature, packages `dist/` as `chipboy-studio-vX.Y.Z.zip`, and creates a GitHub release with the ZIP, the APK and generated notes.
- **Android** (`.github/workflows/android.yml`) builds a debug APK on every push to `main` and every pull request.
- **Deploy to GitHub Pages** (`.github/workflows/deploy-pages.yml`) builds with the repository base path and publishes the site.

The Pages workflow can be run manually from the Actions tab. The release workflow runs only when a `v*` tag is pushed.

The release zip is built with the default `/` base path. For a subdirectory deployment, run `VITE_BASE_PATH=/your-path/ pnpm build` before zipping.

## After the release

- Confirm the GitHub release has the zip and APK assets.
- Confirm the APK is signed: download it and run `apksigner verify --verbose chipboy-studio-vX.Y.Z.apk`.
- Confirm the Pages deployment points at the new build.
- If this is the first release for a new F-Droid recipe, open the fdroiddata merge request described in [FDROID.md](FDROID.md).
- If the project format changed, update [PROJECT_FORMAT.md](PROJECT_FORMAT.md) and mention the migration in the release notes.
- Do not delete old tags. Users may link to them and GitHub Pages deployments keep a history.
