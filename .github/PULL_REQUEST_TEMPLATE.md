## What changed

<!-- A short, plain-language summary. -->

## Why

<!-- The problem, request or bug this addresses. Link issues with "Closes #123". -->

## How to verify

<!-- Steps a reviewer can follow, including any test files or commands. -->

1.
2.
3.

## Screenshots

<!-- Required for UI changes. Include desktop and a narrow viewport. Before/after is ideal. -->

| Before | After |
| --- | --- |
|  |  |

## Checklist

- [ ] `pnpm check` passes locally.
- [ ] Android changes build with `pnpm android:debug` and pass `pnpm android:lint`.
- [ ] New behavior has tests, or this pull request explains why it cannot be unit-tested.
- [ ] Documentation is updated when public behavior, project format or deployment changes.
- [ ] UI changes include screenshots and work with `prefers-reduced-motion`.
- [ ] Android changes include a device or emulator check, including offline behavior when relevant.
- [ ] No secrets, credentials, keystores or personal data are included.
- [ ] No third-party tracker, upload path or remote script is introduced.
- [ ] The change is focused; unrelated refactors are in a separate pull request.

## Notes for reviewers

<!-- Optional: trade-offs, follow-ups, or areas that need extra attention. -->
