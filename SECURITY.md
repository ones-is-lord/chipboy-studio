# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| < 1.0 | No |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Describe the issue with enough detail to reproduce it.

If private reporting is unavailable, contact the maintainers through the repository's listed contact and ask for a private channel. Do not include exploit details in a public issue.

## What to include

- The affected version or commit.
- Browser and operating system.
- A minimal reproduction: project file, share link or exact steps.
- The impact you believe is possible.
- Any suggested fix, if you have one.

## Scope

Chipboy Studio is a static client-side app. Relevant reports include:

- Cross-site scripting through imported project data, song names or sample names.
- Unsafe URL handling in share links or downloads.
- Content Security Policy bypasses in the shipped configuration.
- Denial of service through crafted project files or audio metadata.
- Privacy leaks: audio, project data or microphone streams leaving the device.
- Dependency vulnerabilities with a reachable path in the built app.

Out of scope:

- Reports that require a compromised browser extension or a rooted device.
- Self-XSS that requires the victim to paste code into developer tools.
- Missing security headers on a host that ignores the provided configuration.
- Denial of service by rendering an intentionally enormous song beyond the documented limits.

## Response

Maintainers aim to acknowledge a report within a few days, agree on a disclosure timeline, and credit the reporter unless they prefer otherwise. Fixes are released as a patch version with a note in [CHANGELOG.md](CHANGELOG.md).

## Safe defaults

- No account, backend or analytics.
- Audio is decoded and processed locally.
- Project files are validated and size-limited.
- The recommended deployment headers include a restrictive CSP and a microphone-only permissions policy.
- The app does not use `eval`, remote scripts or third-party trackers.
