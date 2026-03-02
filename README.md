# gittui

A modern terminal git client built with TypeScript, Solid.js, and OpenTUI. Covers the full git workflow — working tree, branches, commits, stash — plus GitHub PR integration via the `gh` CLI.

```
+-------------------------------------------------------------+
|  gittui                      main . +3 ~2 -1    12:34       |
+----------+--------------------------------------------------+
|          |  Files | Branches | Commits | Stash | PRs         |
| FILES    +--------------------------------------------------+
|          |                                                   |
| M app.ts |  --- a/src/app.ts                                |
| A new.ts |  +++ b/src/app.ts                                |
| D old.ts |  @@ -10,6 +10,8 @@                               |
|          |   import { foo } from './foo'                      |
| STAGED   |  +import { bar } from './bar'                     |
|          |  +import { baz } from './baz'                     |
| M util.ts|   const x = 1                                     |
|          |                                                   |
+----------+--------------------------------------------------+
| [Space] Stage  [c] Commit  [Tab] Switch panel  [?] Help      |
+-------------------------------------------------------------+
```

## Features

- **Files & Diff** — Stage/unstage files and individual hunks, commit with message, discard changes, unified and split diff view
- **Branches** — List local/remote, checkout, create, delete, merge, rebase, filter by local/remote/all
- **Commits** — Log with detail view, cherry-pick, revert, filter by author/message/path
- **Stash** — Save, apply, pop, drop, view stash content as diff
- **Pull Requests** — List PRs, view detail with files/reviews/comments, submit reviews (approve/request changes/comment), merge (squash/merge/rebase), open in browser. Requires [`gh` CLI](https://cli.github.com)
- **Command palette** — `:` to search and execute any action
- **Help overlay** — `?` to see all keybindings for the current context
- **Configurable** — TOML config, vim/emacs presets, custom keybindings, 4 built-in themes
- **First-run welcome** — Guided keybinding overview on first launch

## Installation

### Homebrew (macOS / Linux)

```bash
brew tap rsbmk/gittui https://github.com/rsbmk/gittui
brew install gittui
```

### curl (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/rsbmk/gittui/main/scripts/install.sh | sh
```

To install to a custom directory:

```bash
GITTUI_INSTALL_DIR=~/.local/bin curl -fsSL https://raw.githubusercontent.com/rsbmk/gittui/main/scripts/install.sh | sh
```

### npm

```bash
# Requires Bun to be installed
npm install -g gittui
```

### Build from Source

Requires [Bun](https://bun.sh) v1.3+.

```bash
git clone https://github.com/rsbmk/gittui.git
cd gittui
bun install

# Run directly
bun run dev

# Compile a standalone binary
bun run build           # Binary for current platform → ./gittui
bun run build:current   # Same, via build script
bun run build:all       # Cross-compile for all 4 targets → ./dist/
```

Build targets: `darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`. The compiled binary is self-contained — no Bun or Node.js needed to run it.

## Usage

```bash
gittui              # Open in current directory
gittui /path/to/repo  # Open in a specific repository
gittui --help       # Show help
gittui --version    # Show version
```

gittui must be run inside a git repository.

## Keybindings

### Global

| Key | Action |
|-----|--------|
| `1` - `5` | Switch tab (Files, Branches, Commits, Stash, PRs) |
| `j` / `k` | Move down / up |
| `Tab` | Switch between sidebar and main panel |
| `Ctrl+b` | Toggle sidebar |
| `:` | Command palette |
| `?` | Help overlay |
| `q` | Quit |

### Files

| Key | Action |
|-----|--------|
| `Space` | Stage / unstage file (in sidebar) or stage hunk (in main panel) |
| `a` | Stage all files |
| `c` | Commit staged changes |
| `d` | Discard changes |
| `n` / `p` | Next / previous hunk |

### Branches

| Key | Action |
|-----|--------|
| `Enter` | Checkout branch |
| `n` | Create new branch |
| `d` / `D` | Delete / force delete branch |
| `m` | Merge selected into current |
| `r` | Rebase current onto selected |
| `f` | Cycle filter: local / remote / all |

### Commits

| Key | Action |
|-----|--------|
| `Enter` | View commit detail (files + diff) |
| `c` | Cherry-pick commit |
| `r` | Revert commit |
| `Esc` | Close detail view |

### Stash

| Key | Action |
|-----|--------|
| `Enter` | View stash content |
| `s` | Save new stash |
| `a` | Apply stash |
| `p` | Pop stash |
| `d` | Drop stash |

### Pull Requests

| Key | Action |
|-----|--------|
| `Enter` | View PR detail |
| `r` | Submit review |
| `m` | Merge PR |
| `o` | Open in browser |
| `v` | View file diff |
| `f` | Cycle filter: open / closed / all |
| `Esc` | Close detail view |

All keybindings are customizable — see [Configuration](#configuration).

## Configuration

gittui stores its config at `~/.config/gittui/config.toml`. A default file is created on first launch.

```toml
[general]
theme = "catppuccin-mocha"     # Theme name (built-in or custom)
sidebar_width = 30
sidebar_collapsed = false
default_tab = "files"          # files | branches | commits | stash | prs

[keybindings]
preset = "vim"                 # vim | emacs | custom

[keybindings.custom]
# Override individual actions:
# stage = "s"
# commit = "ctrl+c"

[diff]
view = "unified"               # unified | split
context_lines = 3
word_diff = false
show_line_numbers = true

[github]
auto_fetch_prs = true
```

### Themes

Four built-in themes: `catppuccin-mocha` (default), `default-dark`, `nord`, `tokyo-night`.

Custom themes are JSON files placed in `~/.config/gittui/themes/<name>.json`:

```json
{
  "name": "My Theme",
  "colors": {
    "bg": "#1e1e2e",
    "fg": "#cdd6f4",
    "accent": "#89b4fa",
    "success": "#a6e3a1",
    "warning": "#f9e2af",
    "error": "#f38ba8",
    "muted": "#6c7086",
    "border": "#45475a",
    "selection": "#313244",
    "diff_add_bg": "#1a3a2a",
    "diff_del_bg": "#3a1a1a",
    "diff_add_fg": "#a6e3a1",
    "diff_del_fg": "#f38ba8"
  }
}
```

Then set `theme = "my-theme"` in your config.

## Requirements

- **git** — any recent version
- **gh** (optional) — [GitHub CLI](https://cli.github.com) for the Pull Requests tab. Install and run `gh auth login` to authenticate

## Development

```bash
bun install                # Install dependencies
bun run dev                # Run with hot reload
bun test                   # Run all tests (81 tests)
bun run typecheck          # TypeScript strict mode check
```

### Project Structure

```
src/
  index.ts              # CLI entry point
  app.tsx               # Root component
  core/                 # Business logic (no UI imports)
    git/                # Git CLI wrappers, parsers, types
    github/             # GitHub CLI wrappers, parsers, types
    config/             # TOML config schema, defaults, loader
  ui/                   # Solid.js + OpenTUI components
    components/         # Reusable: file tree, commit list, PR cards, etc.
    layout/             # App shell: sidebar, status bar, keybindings, global keys
    views/              # One per tab: files, branches, commits, stash, PRs
  state/                # Solid signals + stores
  lib/                  # Utilities: shell, logger, perf, theme
scripts/                # Build + install scripts
```

### Tech Stack

| Component | Choice |
|-----------|--------|
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript (strict mode) |
| UI Framework | [Solid.js](https://solidjs.com) |
| TUI Renderer | [OpenTUI](https://github.com/anomalyco/opentui) |
| Git Backend | git CLI via `Bun.spawn()` |
| GitHub | `gh` CLI |
| Config | TOML ([smol-toml](https://github.com/nicolo-ribaudo/smol-toml)) |

## License

MIT
