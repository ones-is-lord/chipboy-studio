#!/usr/bin/env bash
set -euo pipefail

if ! command -v fdroid >/dev/null 2>&1; then
  echo "fdroidserver is required: pip install fdroidserver" >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

mkdir -p "$work/metadata"
cp "$root/fdroid/io.github.onesislord.chipboy.yml" "$work/metadata/"
printf 'categories:\n  - Multimedia\n' > "$work/config.yml"

cd "$work"
fdroid lint io.github.onesislord.chipboy
