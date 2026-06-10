# Contributing to k0

Thanks for considering a contribution. The rules below match what CI
enforces; if you follow them, your PR will land smoothly.

## Toolchain

Versions are pinned. Use a polyglot version manager that reads
`.tool-versions` ([mise](https://mise.jdx.dev), [asdf](https://asdf-vm.com),
or [vfox](https://vfox.dev)) — pnpm is pinned via `packageManager` in
`package.json` and resolved automatically by Corepack.

```bash
mise install     # or `asdf install` / `vfox install`
corepack enable  # picks up pnpm@10.15.0 from package.json
```

Linux only: be in the `input` group (`sudo usermod -aG input $USER`,
then log out / in).

## Local development

```bash
pnpm install         # installs hooks via `prepare` script
pnpm tauri dev       # hot reload — Tauri + Vite
```

Browser mock mode (no Tauri runtime needed) — open
`http://localhost:5173?mock` and use `window.__k0mock` to drive the UI.

## Pre-commit / pre-push hooks

`pnpm install` installs [lefthook](https://lefthook.dev) hooks via the
`prepare` script. They run the same checks CI enforces, so failures
locally mirror failures in PR review.

| Hook       | Runs                                              |
|------------|---------------------------------------------------|
| pre-commit | `pnpm biome check` on staged files, `cargo check` |
| pre-push   | `pnpm run build`                                   |

Skip in emergencies with `LEFTHOOK=0 git commit ...` — but expect the
PR check to fail.

## Validation before pushing

```bash
pnpm biome check src/        # lint + format check
pnpm biome check --write src/  # auto-fix what's fixable
cargo check --manifest-path src-tauri/Cargo.toml
pnpm run build
```

Rule: **fix the error, don't suppress the rule**.

## Branch naming

| Type     | Pattern                  | Example                        |
|----------|--------------------------|--------------------------------|
| Feature  | `feat/<description>`     | `feat/layer-animation`         |
| Bug fix  | `fix/<description>`      | `fix/svg-parse-error`          |
| Chore    | `chore/<description>`    | `chore/pin-toolchain`          |

Never put version numbers in `feat/` or `fix/` branch names. Version
numbers belong in `chore/bump-vX.Y.Z` only.

## Release flow

```
feat/* or fix/*  →  PR → squash merge → main
                                          ↓
                          chore/bump-vX.Y.Z  →  PR → squash merge → main
                                                                       ↓
                                                            git tag vX.Y.Z → push → CI
```

```bash
git checkout -b chore/bump-vX.Y.Z
# bump version in package.json + src-tauri/tauri.conf.json
git commit -am "chore: bump version → X.Y.Z"
git push origin chore/bump-vX.Y.Z
gh pr create --base main --fill
# review → merge → then:
git checkout main && git pull
git tag vX.Y.Z && git push origin vX.Y.Z
```

| Bump  | When                                |
|-------|-------------------------------------|
| patch | bug fixes, chores, dep updates      |
| minor | new features, UI changes            |
| major | breaking config / API changes       |

## PR review

- [CodeRabbit](https://www.coderabbit.ai) reviews every PR automatically
  (free for public repos). Address its comments or explain why not.
- [Renovate](https://docs.renovatebot.com) opens dependency-update PRs;
  major updates require approval via the dependency dashboard.
- All PRs must pass `ci.yml`:
  - per-OS matrix: biome + vite build + cargo check
  - `gitleaks` + `trufflehog --only-verified` (secret leak detection)
  - `actions/dependency-review` (blocks vulnerable deps)
  - `actionlint` (validates workflow YAML)
  - `step-security/harden-runner` (CI egress audit)
- Squash merge only. The merge commit takes the PR title; the body is
  the PR description — write good PR descriptions.

## Security

See [SECURITY.md](./SECURITY.md). Use private vulnerability reports for
anything that isn't safe to discuss in public.
