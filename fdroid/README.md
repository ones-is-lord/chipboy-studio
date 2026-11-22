# F-Droid recipe

`io.github.onesislord.chipboy.yml` is a copy-ready metadata file for the
[fdroiddata](https://gitlab.com/fdroid/fdroiddata) repository.

## Validation

The recipe passes `fdroid lint` with `fdroidserver` 2.4.5. The same clean build
steps were run from the `v1.2.0` tag and produced an unsigned APK with
`versionCode 2`, `versionName 1.2.0`, and no `INTERNET` permission.

From the repository root:

```bash
pip install fdroidserver
pnpm fdroid:lint
```

## Submit

Copy the recipe to `metadata/io.github.onesislord.chipboy.yml` in a fork of
`fdroiddata`, then run:

```bash
fdroid lint io.github.onesislord.chipboy
fdroid rewritemeta io.github.onesislord.chipboy
```

Commit with `New App: io.github.onesislord.chipboy`, push a branch named
`io.github.onesislord.chipboy`, and open a merge request against
`fdroiddata:master` with the `New App` label.

The ready-to-paste merge request body is in [`MR_BODY.md`](MR_BODY.md). The
full checklist and buildserver notes are in [../docs/FDROID.md](../docs/FDROID.md).

The GitHub account `ones-is-lord` has no matching public GitLab account, so the
merge request must be opened by the account owner. No GitLab credentials are
stored in this repository.
