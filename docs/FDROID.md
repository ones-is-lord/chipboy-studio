# F-Droid compatibility and submission

F-Droid is an app store and a client, not a build target you fork into the app.
The compatibility work is:

1. A free-and-open-source Android build that F-Droid can reproduce.
2. Store metadata in the `fastlane/metadata/android/` layout.
3. A build recipe for the [`fdroiddata`](https://gitlab.com/fdroid/fdroiddata)
   repository.

All three are in this repository. `fdroid/io.github.onesislord.chipboy.yml` is
the ready-to-copy recipe.

## Submission status

| Step | Status |
| --- | --- |
| FOSS licence and public source | Ready |
| Fastlane listing and screenshots | Ready |
| `fdroiddata` recipe | Ready |
| `fdroid lint` | Clean with `fdroidserver` 2.4.5 |
| Clean build from the `v1.2.0` tag | Pass; unsigned 1.2.0 APK produced |
| `v1.3.0` recipe entry | Ready (`versionCode 3`); clean build runs after tagging `v1.3.0` |
| GitLab account and `fdroiddata` fork | Ready: `ones-is-lord/fdroiddata` |
| Merge request to `fdroid/fdroiddata` | Opened: [!58500](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/58500) |
| `fdroiddata` CI | Pass: lint, rewritemeta, tools, build and `check apk` |

The merge request is open at
[`fdroid/fdroiddata!58500`](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/58500).
The fork is at [`ones-is-lord/fdroiddata`](https://gitlab.com/ones-is-lord/fdroiddata).
The repository does not store GitLab credentials. See
[Submit to F-Droid](#submit-to-f-droid) for the exact request and the update
workflow.

## Compatibility checklist

| Requirement | Status |
| --- | --- |
| OSI-approved licence | MIT (`LICENSE`) |
| Source code public | GitHub |
| No proprietary dependencies | React, Capacitor, Radix UI, Tailwind and Lucide are open source |
| No Google Play Services | Not used |
| No tracking, ads or analytics | None |
| Works without a network | Yes for the core studio; only the optional free-pack downloader uses the network |
| No anti-features | None |
| Buildable from source | `pnpm install --frozen-lockfile`, `pnpm build`, `cap sync android`, Gradle |
| Reproducible dependency graph | `pnpm-lock.yaml` is committed |
| Fastlane metadata | `fastlane/metadata/android/en-US/` |
| Font licences | Full OFL texts in `licenses/`, summary in `THIRD_PARTY_LICENSES.md` |
| Signed by F-Droid | The recipe builds an unsigned release APK; F-Droid signs it |
| Version code increases | `3` for `1.3.0`; bump for every release |

The app requests microphone, vibration, audio-settings and internet
permissions. Microphone is optional and only used when the user taps Record.
Vibration is used for light haptic feedback. Internet is used only by the
optional free-pack browser, which fetches CC0 audio from
`raw.githubusercontent.com` when the user taps Add or Preview. Android
backup is disabled, so projects stay on the device unless the user exports or
shares them.

## Store listing files

```
fastlane/metadata/android/en-US/
├── title.txt
├── short_description.txt
├── full_description.txt
├── changelogs/3.txt
├── changelogs/2.txt
└── images/
    ├── icon.png
    ├── featureGraphic.png
    └── phoneScreenshots/
        ├── 1.png
        └── 2.png
```

F-Droid reads these files directly from the app repository. Keep the changelog
filename equal to the Android `versionCode`.

## Local validation

Run the lightweight recipe linter from the repository root:

```bash
pip install fdroidserver
pnpm fdroid:lint
```

The script copies the recipe into a temporary metadata tree and runs
`fdroid lint`. The current recipe passes with no warnings.

To reproduce the F-Droid build from a clean checkout:

```bash
git clone --depth=1 --branch v1.2.0 \
  https://github.com/ones-is-lord/chipboy-studio.git /tmp/chipboy-fdroid
cd /tmp/chipboy-fdroid
pnpm install --frozen-lockfile
pnpm build
pnpm exec cap sync android
cd android
./gradlew assembleRelease
```

The expected output is
`android/app/build/outputs/apk/release/app-release-unsigned.apk` with
`versionCode 2`, `versionName 1.2.0`, and no `INTERNET` permission (the 1.3.0
build adds `INTERNET` for optional downloads). This was verified against the
`v1.2.0` tag on 2026-11-22.

To check whether F-Droid will see a newer version, run this from a full
`fdroiddata` checkout:

```bash
fdroid checkupdates --allow-dirty io.github.onesislord.chipboy
```

With `v1.2.0` tagged and the recipe at `1.2.0`, the check should find no update.

## Submit to F-Droid

F-Droid's canonical metadata repository is on GitLab:

<https://gitlab.com/fdroid/fdroiddata>

1. Create a GitLab account if you do not have one. The current GitHub account
   `ones-is-lord` does not have a matching public GitLab account.
2. Fork `fdroid/fdroiddata` on GitLab.
3. Clone your fork.
4. Copy `fdroid/io.github.onesislord.chipboy.yml` to
   `metadata/io.github.onesislord.chipboy.yml` in the fork.
5. Run the linter from the `fdroiddata` checkout:

   ```bash
   fdroid lint io.github.onesislord.chipboy
   fdroid rewritemeta io.github.onesislord.chipboy
   ```

6. Commit with the `New App` label convention and push to your fork:

   ```bash
   git checkout -b io.github.onesislord.chipboy
   git add metadata/io.github.onesislord.chipboy.yml
   git commit -m "New App: io.github.onesislord.chipboy"
   git push origin io.github.onesislord.chipboy
   ```

7. Open a merge request against `fdroid/fdroiddata:master` with:

   - **Title:** `New App: io.github.onesislord.chipboy`
   - **Labels:** `New App`
   - **Body:** copy [`fdroid/MR_BODY.md`](../fdroid/MR_BODY.md), or use:

     ```markdown
     This merge request was created by an AI agent (OpenHands) on behalf of @ones-is-lord.

     Adds Chipboy Studio, a local-first chiptune studio with optional CC0 audio downloads.

     - Source: https://github.com/ones-is-lord/chipboy-studio
     - Licence: MIT
     - Version: 1.3.0 (versionCode 3)
     - Tag: v1.3.0
     - Build: Capacitor 8 + Vite 8 + Gradle, unsigned release APK
     - Offline: the core studio is fully offline and all instruments/fonts are bundled. The optional free-pack browser uses INTERNET to fetch CC0 audio only on user action.
     - Metadata: fastlane listing and screenshots in the upstream repository
     - Local checks: `fdroid lint` clean; the last verified clean build from `v1.2.0` succeeded
     ```

8. Answer the maintainers' questions. The first review can take days or weeks.

A GitHub fork of `fdroiddata` is not used for submission. The canonical project
is on GitLab, and F-Droid's build pipeline reads metadata from there.

## Recipe notes

The recipe uses `subdir: android`, so `init` and `prebuild` run inside the
Android project directory. The commands use `pnpm --dir ..` to operate on the
repository root.

```yaml
subdir: android
sudo:
  - apt-get update
  - apt-get install -y -t trixie openjdk-21-jdk-headless curl
  - curl -fsSLo /tmp/node.tar.gz https://nodejs.org/dist/v22.23.5/node-v22.23.5-linux-x64.tar.gz
  - echo "c54118104acc524633b5abe106bbf44a53126ec8b4e5fa105cb92b5d7de8a1a1  /tmp/node.tar.gz" | sha256sum -c -
  - tar -xzf /tmp/node.tar.gz --strip-components=1 -C /usr/local
  - npm install -g pnpm@12.21.0
init: pnpm --dir .. install --frozen-lockfile
prebuild:
  - pnpm --dir .. build
  - pnpm --dir .. exec cap sync android
gradle:
  - yes
```

The build produces `app/build/outputs/apk/release/app-release-unsigned.apk`.
F-Droid signs it with the F-Droid key, so do not upload the GitHub release APK
as the F-Droid artifact.

The `scanignore` entry keeps the scanner out of `node_modules`, which is
generated during `init`.

The F-Droid summary lives in
`metadata/io.github.onesislord.chipboy/en-US/summary.txt`, not in the YAML.
`fdroiddata`'s `make-summary-translatable.py` check rejects a `Summary:` key.

The app bundles three OFL fonts through Fontsource. The complete licence texts
are in [`licenses/`](../licenses/) and summarized in
[`THIRD_PARTY_LICENSES.md`](../THIRD_PARTY_LICENSES.md).

## Buildserver notes

The recipe installs OpenJDK 21 from Debian `trixie` with `sudo`. Capacitor 8
requires Node.js 22 or newer, but `trixie` ships Node.js 20 and the buildserver
does not expose `forky`. The recipe downloads the official Node.js 22.23.5
Linux x64 tarball, verifies its SHA-256, and extracts it into `/usr/local`. This
avoids both the image's default Node.js and a NodeSource pipe.

`npm install -g pnpm` runs as root so the binary lands in `/usr/local/bin` and
is on the build user's `PATH`. Check the current buildserver image before
changing this. Keep the core app offline; the only network call is the
optional, user-initiated free-pack download.

## Updating a published app

For each release:

1. Bump `versionCode` and `versionName` in `android/app/build.gradle`.
2. Add a `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt` file.
3. Add a new `Builds` entry to
   `fdroid/io.github.onesislord.chipboy.yml` with the new tag and version code.
4. Update `CurrentVersion` and `CurrentVersionCode`.
5. Open a new `fdroiddata` merge request, or let the existing one update.

F-Droid's `AutoUpdateMode: Version` and `UpdateCheckMode: Tags` let it find new
tags automatically after the recipe is accepted.

## Why this is not a fork of the F-Droid client

The F-Droid client is a separate Android app for browsing repositories. Forking
it would not make Chipboy Studio installable from F-Droid. The useful fork is a
fork of `fdroiddata` with the recipe above. If you want a private F-Droid
repository instead, you can host the signed APK and an `index-v1.jar` yourself;
that is a different project from this app and is not required for the public
store.
