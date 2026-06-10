# Security policy

## Supported versions

Only the latest release receives security updates. Older releases are
expected to be upgraded; back-porting is not provided.

| Version | Supported |
|---------|-----------|
| latest  | yes       |
| older   | no        |

## Reporting a vulnerability

Please use GitHub's [private vulnerability reporting](https://github.com/seppulcro/k0/security/advisories/new)
rather than a public issue. A maintainer will respond within a few days.

If you cannot use private reporting, email the address on the maintainer's
GitHub profile with the subject `[k0 security]`.

## Scope

k0 captures keyboard input via OS-native APIs:

- **Linux** — `/dev/input/event*` via `evdev` (requires user in `input` group)
- **macOS** — `CGEventTap` via `rdev` (requires Input Monitoring TCC grant)
- **Windows** — not yet implemented

Of particular interest:

- Code in `src-tauri/src/` that handles raw input events or invokes IOKit /
  evdev APIs.
- Tauri command handlers (`#[tauri::command]`) — these cross the IPC
  boundary from the webview.
- The matcha-based webview UI — XSS via imported `.yaml` / `.svg` keymaps.

## Supply chain

- All GitHub Actions are pinned and managed by [Renovate](renovate.json).
- The toolchain (Node, pnpm, Rust) is pinned in `.tool-versions` +
  `package.json` `packageManager` so local and CI are bit-identical.
- The release pipeline (`.github/workflows/release.yml`) is the only
  workflow with write permissions; it builds on `v*` tag push from `main`.
- Repo settings: squash-only merges, branch deleted on merge, secret
  scanning + push protection enabled, Dependabot security updates enabled.
- PRs run [`ci.yml`](.github/workflows/ci.yml) which includes:
  - `gitleaks` (pattern-based secret scan)
  - `trufflesecurity/trufflehog` with `--only-verified` (verifies leaked
    secrets are live — defense-in-depth on top of gitleaks)
  - `actions/dependency-review-action` (blocks PRs that introduce
    high-severity CVE deps)
  - `actionlint` (validates workflow YAML)
  - `step-security/harden-runner` in audit mode (logs all CI egress so
    future supply-chain attacks via compromised actions are detectable)
- OpenSSF Scorecard runs weekly: [`scorecard.yml`](.github/workflows/scorecard.yml).
