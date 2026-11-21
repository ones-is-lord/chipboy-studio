# F-Droid recipe

`io.github.onesislord.chipboy.yml` is a copy-ready metadata file for the
[fdroiddata](https://gitlab.com/fdroid/fdroiddata) repository.

Copy it to `metadata/io.github.onesislord.chipboy.yml` in a fork of
`fdroiddata`, then run:

```bash
fdroid lint io.github.onesislord.chipboy
fdroid rewritemeta io.github.onesislord.chipboy
```

Open a merge request against `fdroiddata:master`. F-Droid builds and signs its
own APK from the tag in the recipe.

The full checklist, store listing layout and buildserver notes are in
[../docs/FDROID.md](../docs/FDROID.md).
