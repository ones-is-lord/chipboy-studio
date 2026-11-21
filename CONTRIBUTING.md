# Contributing to Chipboy Studio

Thanks for helping make the little console better. This guide covers the practical parts: setup, tests, style and pull requests.

## Before you start

- Search existing issues and pull requests.
- For a large feature or a behavior change, open an issue first so the approach can be agreed before you write a lot of code.
- For security issues, do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).

## Set up

```bash
git clone https://github.com/ones-is-lord/chipboy-studio.git
cd chipboy-studio
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The app runs at <http://localhost:8080>. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for host allowlists, base paths and test details.

Android changes also need JDK 21 and the Android SDK. Build the APK with:

```bash
pnpm android:sync
pnpm android:debug
```

See [docs/ANDROID.md](docs/ANDROID.md) for signing and device install steps.

## Make a change

1. Create a branch from `main`:

   ```bash
   git checkout -b fix/arrangement-overlap
   ```

2. Keep the change focused. Avoid drive-by refactors and unrelated formatting.
3. Add or update tests for behavior changes.
4. Update documentation when the public behavior, project format or deployment changes.
5. Run the full check:

   ```bash
   pnpm check
   ```

6. Commit with a clear message. Conventional Commits are welcome but not required:

   ```text
   fix(arrangement): reject overlapping multi-bar clips

   The drop handler now validates the destination before mutating the song.
   ```

7. Open a pull request against `main`. Fill in the template and include screenshots for UI changes.

## What good looks like

- **Small and readable.** Prefer a clear function over a clever one.
- **Real code paths in tests.** Do not mock the domain modules; they are pure and fast. Audio tests may use the `AudioBuffer` polyfill in `src/test/setup.ts`.
- **Accessible controls.** Use real buttons, labels and focus states. Keep `prefers-reduced-motion` working.
- **No hidden network calls.** Audio and project data stay on the device.
- **No new runtime dependencies without a reason.** The bundle is intentionally small.
- **No secrets in the repository.** There are no server secrets. Never commit a keystore, signing password or signed APK. Use the documented environment variables or GitHub Actions secrets.

## Code style

- TypeScript, double quotes, semicolons, two-space indentation.
- Components in `src/components/`, one concern per file.
- Routes in `src/App.tsx`, pages in `src/pages/`.
- Domain logic in `src/lib/`, hooks in `src/hooks/`.
- Tailwind classes for layout and spacing; shared console styles live in `src/globals.css`.
- Keep comments for non-obvious invariants and trade-offs, not for restating code.

## Testing expectations

| Change | Expected coverage |
| --- | --- |
| Song timing, arrangement or note helpers | Unit test in `src/lib/song.test.ts` |
| Project schema, storage or share links | Unit test in `src/lib/project.test.ts` |
| WAV encoding or sample processing | Unit test in `src/lib/wav.test.ts` or `sample-processing.test.ts` |
| Audio scheduling | Unit test in `src/lib/audio-engine.test.ts` |
| UI behavior | Manual browser check plus screenshots in the pull request |
| Android shell, permissions or native share | Manual APK install on a device or emulator, plus `pnpm android:lint` |

If a bug is fixed, add a regression test where the logic is testable. If the bug is purely visual, describe the before and after and include screenshots.

## Pull request checklist

- [ ] The change is focused and described.
- [ ] `pnpm check` passes.
- [ ] `pnpm audit` reports no known vulnerabilities.
- [ ] New behavior has tests or a clear manual verification note.
- [ ] Documentation is updated when needed.
- [ ] UI changes include screenshots at desktop and mobile widths.
- [ ] No secrets, credentials or personal data are included.
- [ ] The pull request does not introduce a third-party tracker or upload path.

## Review process

A maintainer reviews for correctness, accessibility, performance and fit with the project. Reviews are collaborative: ask questions, push back with reasoning, and update the branch rather than opening a second pull request for the same change.

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
