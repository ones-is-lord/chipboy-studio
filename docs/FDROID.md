# F-Droid compatibility and submission

F-Droid is an app store and a client, not a build target you fork into the app.
The compatibility work is:

1. A free-and-open-source Android build that F-Droid can reproduce.
2. Store metadata in the `fastlane/metadata/android/` layout.
3. A build recipe for the [`fdroiddata`](https://gitlab.com/fdroid/fdroiddata)
   repository.

All three are in this repository. `fdroid/io.github.onesislord.chipboy.yml` is
the ready-to-copy recipe.

## Compatibility checklist

| Requirement | Status |
| --- | --- |
| OSI-approved licence | MIT (`LICENSE`) |
| Source code public | GitHub |
| No proprietary dependencies | React, Capacitor, Radix UI, Tailwind and Lucide are open source |
| No Google Play Services | Not used |
| No tracking, ads or analytics | None |
| Works without a network | Yes; all assets are bundled |
| No anti-features | None |
| Buildable from source | `pnpm install --frozen-lockfile`, `pnpm build`, `cap sync android`, Gradle |
| Reproducible dependency graph | `pnpm-lock.yaml` is committed |
| Fastlane metadata | `fastlane/metadata/android/en-US/` |
| Signed by F-Droid | The recipe builds an unsigned release APK; F-Droid signs it |
| Version code increases | `2` for `1.2.0`; bump for every release |

The app requests microphone, vibration and audio-settings permissions. It does
not request internet permission. Microphone is optional and only used when the
user taps Record. Vibration is used for light haptic feedback. Android backup is
disabled, so projects stay on the device unless the user exports or shares them.

## Store listing files

```
fastlane/metadata/android/en-US/
├── title.txt
├── short_description.txt
├── full_description.txt
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

## Submit to F-Droid

F-Droid's canonical metadata repository is on GitLab:

<https://gitlab.com/fdroid/fdroiddata>

1. Create a GitLab account if you do not have one.
2. Fork `fdroid/fdroiddata` on GitLab.
3. Clone your fork.
4. Copy `fdroid/io.github.onesislord.chipboy.yml` to
   `metadata/io.github.onesislord.chipboy.yml` in the fork.
5. Run the linter from the `fdroiddata` checkout:

   ```bash
   fdroid lint io.github.onesislord.chipboy
   fdroid rewritemeta io.github.onesislord.chipboy
   ```

6. Commit, push to your fork and open a merge request against
   `fdroid/fdroiddata:master`.
7. Answer the maintainers' questions. The first review can take days or weeks.

A GitHub fork of `fdroiddata` is not used for submission. The canonical project
is on GitLab, and F-Droid's build pipeline reads metadata from there.

## Recipe notes

The recipe uses `subdir: android`, so `init` and `prebuild` run inside the
Android project directory. The commands use `pnpm --dir ..` to operate on the
repository root.

```yaml
subdir: android
init:
  - npm install -g pnpm@12.21.0
  - pnpm --dir .. install --frozen-lockfile
prebuild:
  - pnpm --dir .. build
  - pnpm --dir .. exec cap sync android
gradle:
  - assembleRelease
```

The build produces `app/build/outputs/apk/release/app-release-unsigned.apk`.
F-Droid signs it with the F-Droid key, so do not upload the GitHub release APK
as the F-Droid artifact.

The `scanignore` entries keep the scanner out of `node_modules` and `dist`,
which are generated during `init` and `prebuild`.

## Buildserver notes

The recipe installs Node.js 22 and OpenJDK 21 with `sudo`. F-Droid's buildserver
must provide Node.js 20.19 or newer for Vite 8 and pnpm 12. The recipe pins
Node.js 22 so the build does not depend on the image's default Node.js:

```yaml
sudo:
  - apt-get update
  - apt-get install -y curl ca-certificates openjdk-21-jdk-headless
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs
```

Check the current buildserver image before changing this. Avoid adding a
network call to the app itself; the app must stay offline.

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
