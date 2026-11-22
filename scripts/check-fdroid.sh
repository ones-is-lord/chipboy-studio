#!/usr/bin/env bash
set -euo pipefail

if ! command -v fdroid >/dev/null 2>&1; then
  echo "fdroidserver is required: pip install fdroidserver" >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

app_id="io.github.onesislord.chipboy"
mkdir -p "$work/metadata/$app_id/en-US"
cp "$root/fdroid/$app_id.yml" "$work/metadata/"
cp "$root/fdroid/en-US/summary.txt" "$work/metadata/$app_id/en-US/"
printf 'categories:\n  - Multimedia\n' > "$work/config.yml"

summary="$(cat "$root/fdroid/en-US/summary.txt")"
if [ "${#summary}" -gt 80 ]; then
  echo "summary.txt is longer than 80 characters" >&2
  exit 1
fi
case "$summary" in
  *.) echo "summary.txt must not end with a period" >&2; exit 1 ;;
esac

cd "$work"
fdroid lint "$app_id"
cp "metadata/$app_id.yml" before.yml
fdroid rewritemeta "$app_id"
diff -u before.yml "metadata/$app_id.yml"
