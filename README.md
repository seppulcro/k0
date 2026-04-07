![icon](./src-tauri/icons/Square150x150Logo.png)

# k0 — Keyboard Overlay

A live keyboard overlay inspired by KeyCastr. Reads raw key events from `/dev/input/eventN`, highlights pressed keys, and switches layers automatically — fully keyboard-agnostic (QMK, ZMK, VIAL, or any firmware).

[preview.webm](https://github.com/user-attachments/assets/19f71773-af21-4d52-9328-ae64dc4c1f35)

---

## How it works

1. Drop a [keymap-drawer](https://github.com/caksoylar/keymap-drawer) `.yaml` + rendered `.svg` into `assets/`
2. k0 parses the YAML to derive key positions, layer activators, and hold-tap config
3. Raw key events come from `/dev/input/eventN` via the `evdev` Rust crate
4. SVG keys are highlighted live with CSS class toggles — no DOM rebuilds

---

## Getting started

```bash
# Install dependencies
pnpm install

# Dev (hot-reload frontend + Rust watch)
pnpm tauri dev

# Production build
pnpm tauri build
```

> **Linux:** your user must be in the `input` group to read `/dev/input/event*`:
> ```bash
> sudo usermod -aG input $USER  # then log out/in
> ```

---

## Code quality — Biome

This project uses [Biome](https://biomejs.dev) for formatting and linting (replaces ESLint + Prettier).

```bash
# Check all files
pnpm biome check src/

# Fix auto-fixable issues
pnpm biome check --write src/

# Apply unsafe (but correct) fixes too
pnpm biome check --fix --unsafe src/
```

**VS Code:** install the [Biome extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) — the `.vscode/settings.json` in this repo enables **format-on-save** and **organise-imports-on-save** automatically.

The rule: **fix the error, don't suppress the rule.**

---

## Agentic dev loop

When using an AI coding agent (e.g. GitHub Copilot CLI in fleet mode):

1. **Always run `pnpm biome check src/`** after edits — zero errors required before shipping
2. **Run `pnpm run build`** to catch TypeScript and bundler errors
3. **Run `cargo check`** inside `src-tauri/` to catch Rust errors
4. Start dev with `pnpm tauri dev` — Vite HMR handles frontend changes; Rust changes trigger a recompile

A clean iteration cycle is: edit → biome fix → build check → cargo check → tauri dev.

---

## Settings

Open the **⚙** button (top-right of the overlay):

| Section | What it does |
|---|---|
| **Input Devices** | Select which `/dev/input/eventN` nodes to capture. Devices sharing a `uniq` ID (e.g. all Cheapino interfaces) are grouped together. Selection is persisted. |
| **Theme** | 8 themes: Catppuccin × 4, Tokyo Night, Dracula, Nord, Gruvbox. Applied live to the SVG via CSS custom properties. |
| **Transition** | Key highlight animation: Snappy (80ms), Smooth (200ms), Bouncy (spring), Instant (0ms). |
| **Hold–tap threshold** | How long a key must be held before activating a layer (slider + number input, 100–500 ms). Default is 200 ms — the QMK / ZMK / VIAL default. Persisted in `localStorage`. |

---

## Bring your own keymap

Replace `assets/keymap.yaml` and `assets/keymap.svg` with output from [keymap-drawer](https://github.com/caksoylar/keymap-drawer). k0 reads the YAML to extract:

- `t:` (tap label) → physical key position mapping
- `h:` (hold value) → if it matches a layer name, that key is a layer activator

No manual config file needed — the YAML is the single source of truth.

## Releases

Builds are published automatically via GitHub Actions on `v*` tags.

| Platform | Artifact |
|---|---|
| Linux | `.deb` + `.AppImage` |
| macOS | Universal `.dmg` (x86_64 + arm64) |

### Changelog

#### v0.2.0
- Full matcha.css integration — theme vars bridge to matcha (`--accent`, `--muted`, `--bd-muted`)
- Settings panel: Devices, Theme, Input, Console tabs
- Semantic HTML: `<details>`/`<summary>` device groups, `<fieldset>` inputs, `<menu>` tabs
- SVG overlay fix: `div.innerHTML` parse avoids Tauri WebView MIME error
- Responsive flex layout — no hardcoded heights, tiling WM friendly
- Window permanently resizable; `setSize` replaces toggle-resizable chain
- CI/CD: Linux + macOS release builds via `tauri-action`

#### v0.1.0
- Initial release: evdev Rust backend, SVG layer switching, raw key event capture
