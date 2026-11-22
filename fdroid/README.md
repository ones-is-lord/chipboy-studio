# F-Droid recipe

`io.github.onesislord.chipboy.yml` is a copy-ready metadata file for the
[fdroiddata](https://gitlab.com/fdroid/fdroiddata) repository.

## Validation

The recipe passes `fdroid lint` and a no-op `fdroid rewritemeta` with
`fdroidserver` 2.4.5. `pnpm fdroid:lint` also checks the 80-character summary
limit and the no-trailing-period rule. The last fully verified clean build used
the `v1.2.0` tag and produced an unsigned APK with `versionCode 2` and
`versionName 1.2.0`. The recipe now includes a `1.3.0` build entry
(`versionCode 3`); rerun the clean build after tagging `v1.3.0`.

The app declares `INTERNET` because the optional free-pack browser downloads
CC0 audio on demand. The core studio, all built-in sounds and all fonts are
bundled and work without a connection.

From the repository root:

```bash
pip install fdroidserver
pnpm fdroid:lint
```

## Submit

Copy the recipe to `metadata/io.github.onesislord.chipboy.yml` and the summary
to `metadata/io.github.onesislord.chipboy/en-US/summary.txt` in a fork of
`fdroiddata`, then run:

```bash
fdroid lint io.github.onesislord.chipboy
fdroid rewritemeta io.github.onesislord.chipboy
```

Commit with `New app: Chipboy Studio`, push a branch named `chipboy-studio`,
and open a merge request against `fdroiddata:master` with the `New App` label.

The ready-to-paste merge request body is in [`MR_BODY.md`](MR_BODY.md). The
full checklist and buildserver notes are in [../docs/FDROID.md](../docs/FDROID.md).

The merge request is open at
[`fdroid/fdroiddata!58500`](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/58500).
Its CI is green: `fdroid lint`, `fdroid rewritemeta`, the metadata tools, the
`fdroid build` APK build and `check apk` all pass.
The fork is at [`ones-is-lord/fdroiddata`](https://gitlab.com/ones-is-lord/fdroiddata).
No GitLab credentials are stored in this repository.
