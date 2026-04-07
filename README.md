<div align="center">

<img src="./src-tauri/icons/Square150x150Logo.png" width="96" alt="k0 icon" />

# k0

**Live keyboard overlay for Linux, macOS & Windows**

A KeyCastr-inspired overlay that reads raw key events, highlights pressed keys on your keymap-drawer SVG, and switches layers in real-time — firmware-agnostic (QMK · ZMK · VIAL · anything).

[preview.webm](https://github.com/user-attachments/assets/f393e3d7-74d6-4cae-bf1d-44cd5dfb4945)

[![Release](https://img.shields.io/github/v/release/seppulcro/k0?style=flat-square)](https://github.com/seppulcro/k0/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/seppulcro/k0/release.yml?style=flat-square&label=CI)](https://github.com/seppulcro/k0/actions)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square)](./LICENSE)

</div>

---

## Features

- 🎹 **Real-time key highlights** — SVG keys light up on press via CSS class toggles, no DOM rebuilds
- 🗂️ **Automatic layer switching** — hold-tap detection with configurable tapping term
- 🎨 **8 themes** — Catppuccin × 4, Tokyo Night, Dracula, Nord, Gruvbox — live-applied
- ✨ **4 animations** — Snappy, Smooth, Bouncy, Instant
- 🔌 **Bring your own keymap** — drop a [keymap-drawer](https://github.com/caksoylar/keymap-drawer) YAML + SVG, nothing else needed
- 🪟 **Tiling WM friendly** — no hardcoded heights, fully resizable, transparent overlay window
- 🧪 **Browser mock mode** — full UI runs at `?mock` without Tauri for Playwright / agent testing

---

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/) + Tauri v2 CLI
- [Node.js](https://nodejs.org/) 22+ + [pnpm](https://pnpm.io/)
- **Linux only:** user must be in the `input` group:
  ```bash
  sudo usermod -aG input $USER  # then log out/in
  ```

### Install & run

```bash
pnpm install

# Dev — hot-reload frontend + Rust watch
pnpm tauri dev

# Production build
pnpm tauri build
```

---

## Bring your own keymap

Replace `assets/keymap.yaml` and `assets/keymap.svg` with output from [keymap-drawer](https://github.com/caksoylar/keymap-drawer):

```bash
keymap parse -z your_keymap.zmk.c > assets/keymap.yaml
keymap draw assets/keymap.yaml > assets/keymap.svg
```

k0 reads the YAML to derive:

| Field | Purpose |
|---|---|
| `t:` (tap label) | physical key → position mapping |
| `h:` (hold value matching a layer name) | marks key as a layer activator |

No manual config file needed — the YAML is the single source of truth.

---

## Settings

Open the **⚙** button (top-right of the overlay):

| Tab | What it does |
|---|---|
| **Devices** | Select `/dev/input/eventN` nodes. Devices sharing a `uniq` ID are grouped. Selection persisted. |
| **Theme** | 8 themes applied live via CSS custom properties. |
| **Input** | Hold–tap threshold slider (100–500 ms, default 200 ms). Persisted in `localStorage`. |
| **Console** | Live log stream from the Rust backend. |

---

## Mock mode & Playwright MCP

The full UI runs in any browser without Tauri — open:

```
http://localhost:5173?mock
```

`window.__k0mock` is exposed for scripted interaction:

```js
await __k0mock.typeSequence(['a','s','d','f'], 100)   // press keys
await __k0mock.holdLayer('nav')                        // activate a layer
await __k0mock.layerTour()                             // tour all layers
await __k0mock.demo()                                  // full key demo
```

**Playwright MCP** (`.vscode/mcp.json`) lets GitHub Copilot's browser tool interact with the overlay directly for agentic testing and recording.

```bash
pnpm test           # run Playwright smoke tests (headless)
pnpm test:ui        # open Playwright UI
pnpm record-demo    # re-record assets/preview.webm
```

---

## Code quality

```bash
pnpm biome check src/          # lint + format check
pnpm biome check --write src/  # auto-fix
cd src-tauri && cargo check    # Rust type check
pnpm run build                 # full Vite build
```

> **Rule:** fix the error, don't suppress the rule.

**VS Code:** install the [Biome extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) — format-on-save and organise-imports-on-save are pre-configured.

### Agentic dev loop

```
edit → biome fix → build check → cargo check → tauri dev
```

When using an AI agent, always validate with `pnpm biome check src/` + `pnpm run build` + `cargo check` before shipping.

---

## Releases

Builds publish automatically on `v*` tags pushed to `main`.

| Platform | Runner | Artifact |
|---|---|---|
| Linux | ubuntu-22.04 | `.deb` + `.AppImage` |
| macOS arm64 | macos-latest | `.dmg` |
| macOS x86_64 | macos-13 | `.dmg` |
| Windows | windows-latest | `.msi` + `.exe` |

---

## Contributing

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<description>` | `feat/layer-animation` |
| Bug fix | `fix/<description>` | `fix/svg-parse-error` |
| Chore | `chore/<description>` | `chore/bump-v0.3.0` |

Never put version numbers in `feat/` or `fix/` branch names.

### Release flow

```
feat/* or fix/*  →  PR → squash merge → main
                                          ↓
                          chore/bump-vX.Y.Z  →  PR → merge → main
                                                                ↓
                                                    git tag vX.Y.Z → push → CI
```

```bash
# Cut a release
git checkout -b chore/bump-vX.Y.Z
# bump version in package.json + src-tauri/tauri.conf.json
git commit -am "chore: bump version → X.Y.Z"
git push origin chore/bump-vX.Y.Z
# open PR → merge → then:
git checkout main && git pull
git tag vX.Y.Z && git push origin vX.Y.Z
```

### SemVer

| Bump | When |
|---|---|
| `patch` | bug fixes, chores, deps |
| `minor` | new features, UI changes |
| `major` | breaking config/API changes |

---

## Changelog

### v0.2.2
- Browser mock mode (`?mock`) — full UI without Tauri, `window.__k0mock` simulator
- Playwright smoke tests + MCP browser config (`.vscode/mcp.json`)
- `pnpm record-demo` script — reproducible 2K demo recording
- CI: macOS x86_64 runner fixed to `macos-13` (native Intel)
- CI: explicit `rust-target` matrix key
- README overhaul

### v0.2.1
- macOS CI: arm64 + x86_64 split into separate native runners
- Gitflow enforced: version-bump-via-PR, branch naming conventions

### v0.2.0
- matcha.css integration with theme var bridging
- Settings panel: Devices, Theme, Input, Console tabs
- SVG overlay fix: `div.innerHTML` parse (Tauri WebView MIME workaround)
- Responsive flex layout, permanently resizable window
- CI/CD: Linux + macOS + Windows via `tauri-action`

### v0.1.0
- Initial release: evdev Rust backend, SVG layer switching, raw key event capture
