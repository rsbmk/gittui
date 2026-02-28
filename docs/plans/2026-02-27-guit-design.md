# guit - Modern Terminal Git Client

**Date**: 2026-02-27
**Status**: Approved

## Overview

`guit` is a modern terminal UI application for managing git repositories, inspired by lazygit but with a focus on superior UX through a modern TUI framework. It covers the full git workflow (working tree, branches, commits, stash) plus GitHub PR integration (reviews, comments, merge) via the `gh` CLI.

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Type safety, single language for entire app |
| UI Framework | Solid.js (OpenTUI binding) | Fine-grained reactivity via signals, no virtual DOM overhead |
| TUI Renderer | OpenTUI | Built-in `<diff>`, `<code>`, `<line_number>`, `<markdown>` components. Flexbox layout system |
| Runtime | Bun | Fast startup, native `Bun.spawn()` for shell commands, `bun build --compile` for binary distribution |
| Git Backend | Shell exec (git CLI) | Universal compatibility, predictable output, easy to debug |
| GitHub | `gh` CLI | Handles auth, simple JSON output, covers PR/review/comment workflows |
| Config Format | TOML | Human-friendly, standard for CLI tools |
| Theme Format | JSON | Easy to parse, machine-friendly for color definitions |

## Architecture

```
src/
├── app.tsx                   # Root component, layout, routing
├── index.ts                  # Entry point, CLI arg parsing
│
├── core/                     # Business logic (no UI)
│   ├── git/                  # Typed wrappers over git CLI
│   │   ├── commands.ts       # status, diff, log, branch, stash, etc.
│   │   ├── parser.ts         # Porcelain output parsers
│   │   └── types.ts          # GitFile, GitCommit, GitBranch, etc.
│   ├── github/               # gh CLI integration
│   │   ├── commands.ts       # pr list, pr view, pr review
│   │   ├── parser.ts         # JSON output parser
│   │   └── types.ts          # PR, Review, Comment types
│   └── config/               # App configuration
│       ├── schema.ts         # Config schema definition
│       ├── loader.ts         # Reads from ~/.config/guit/
│       └── defaults.ts       # Default values
│
├── ui/                       # Solid + OpenTUI components
│   ├── layout/               # App shell
│   │   ├── sidebar.tsx       # Collapsible sidebar
│   │   ├── main-panel.tsx    # Main content area with tabs
│   │   ├── status-bar.tsx    # Top bar (branch, counters, time)
│   │   └── command-palette.tsx
│   ├── views/                # One per tab
│   │   ├── files.tsx         # Working tree / staging
│   │   ├── diff.tsx          # Diff viewer
│   │   ├── branches.tsx      # Branch management
│   │   ├── commits.tsx       # Commit log
│   │   ├── stash.tsx         # Stash management
│   │   └── pull-requests.tsx # PR list + review
│   └── components/           # Reusable pieces
│       ├── file-tree.tsx
│       ├── commit-list.tsx
│       ├── branch-list.tsx
│       └── pr-card.tsx
│
├── state/                    # Solid stores (single source of truth)
│   ├── repo.ts              # Repository state
│   ├── ui.ts                # UI state (active tab, sidebar, etc.)
│   └── keybindings.ts       # Keybinding registry
│
└── lib/                     # Utilities
    ├── shell.ts             # Bun.spawn wrapper
    ├── theme.ts             # Theme system
    └── logger.ts            # Logging
```

### Key Principle: core/ vs ui/

- `core/` contains pure business logic with no UI imports. Fully testeable in isolation.
- `ui/` contains Solid components that read from `state/` stores and dispatch actions to `core/`.
- `state/` is the glue: Solid signals/stores that hold the app state. Updated by core logic, consumed by UI via reactivity.

### Data Flow

```
User Input -> Keybinding Registry -> Action
                                       |
                               Git/GitHub Command (Bun.spawn)
                                       |
                               Parse Output -> Update Solid Store
                                       |
                               Solid Reactivity -> Re-render UI
```

## Layout

```
+-------------------------------------------------------------+
|  guit                        main . +3 ~2 -1    12:34       |
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

### Layout Components

1. **Status Bar (top)**: App name, current branch, change counters (+added, ~modified, -deleted), clock
2. **Sidebar (left, collapsible)**: File list with status indicators (M, A, D, R). Sections: UNSTAGED / STAGED. Toggle with `Ctrl+B`
3. **Tab Bar**: Context tabs: Files, Branches, Commits, Stash, PRs
4. **Main Panel**: Content changes based on active tab and sidebar selection
5. **Keybinding Bar (bottom)**: Contextual keybindings that change per panel/tab

### Navigation

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Switch between sidebar and main panel |
| `1-5` | Quick tab switch |
| `j/k` or arrows | Navigate within active panel |
| `Ctrl+B` | Toggle sidebar |
| `?` | Help overlay |
| `:` | Command palette |
| `/` | Search within active panel |

## Features by Tab

### Files (Working Tree)

- File list grouped by UNSTAGED / STAGED
- Selecting a file shows its diff with syntax highlighting (OpenTUI `<diff>`)
- `Space` to stage/unstage file, `a` to stage all
- `c` opens commit modal: textarea for message + staged files preview
- `d` discard changes (with confirmation)
- Hunk-level staging: navigate hunks with `n/p`, stage hunk with `Space`

### Branches

- Local and remote branch list with current branch indicator
- `Enter` checkout, `n` new branch, `d` delete
- `m` merge selected into current, `r` rebase current onto selected
- Simplified branch graph showing remote divergence

### Commits (Log)

- Commit list: short hash, author, relative date, message
- `Enter` for commit detail (files + diffs)
- `c` cherry-pick, `r` revert
- `i` interactive rebase from selected commit
- Filter by author, message, file

### Stash

- Stash list with message and date
- `Enter` to view content (diff)
- `a` apply, `p` pop, `d` drop
- `s` create new stash (optional message)

### Pull Requests (via gh CLI)

- List open PRs with status (draft, review requested, approved, changes requested)
- `Enter` for PR detail: description, commits, changed files
- View file diff with inline comments
- `r` leave review (approve, request changes, comment)
- `c` add inline comment at specific diff line
- `m` merge PR (squash, merge, rebase options)

## Configuration

### Config file: `~/.config/guit/config.toml`

```toml
[general]
theme = "catppuccin-mocha"
sidebar_width = 30
sidebar_collapsed = false
default_tab = "files"

[keybindings]
preset = "vim"  # vim | emacs | custom

[keybindings.custom]
stage = "space"
commit = "c"
toggle_sidebar = "ctrl+b"
next_tab = "shift+right"
prev_tab = "shift+left"

[diff]
view = "split"        # split | unified
context_lines = 3
word_diff = false
show_line_numbers = true

[github]
auto_fetch_prs = true
```

### Theme file: `~/.config/guit/themes/<name>.json`

```json
{
  "name": "Catppuccin Mocha",
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
  },
  "syntax": {
    "keyword": "#cba6f7",
    "string": "#a6e3a1",
    "number": "#fab387",
    "comment": "#6c7086",
    "function": "#89b4fa",
    "type": "#f9e2af",
    "variable": "#cdd6f4",
    "operator": "#89dceb"
  }
}
```

Built-in themes: default-dark, catppuccin-mocha, nord, tokyo-night.

## Distribution

| Channel | Method |
|---------|--------|
| Binary | `bun build --compile` per platform (darwin-arm64, darwin-x64, linux-x64, linux-arm64) |
| Homebrew | Custom tap: `brew install guit-cli/tap/guit` |
| Curl installer | `curl -fsSL https://guit.dev/install.sh \| sh` (detects OS/arch) |
| npm/pnpm | `npm install -g guit` |

## Implementation Phases

### Phase 0 - Foundation (Week 1)
- Bun + Solid.js + OpenTUI project scaffold
- Shell executor wrapper (Bun.spawn)
- Git command abstraction layer (status, diff)
- Basic layout: sidebar + main panel + status bar

### Phase 1 - Files & Diff (Weeks 2-3)
- Files tab: working tree, staging area
- Diff viewer with syntax highlighting
- Stage/unstage files and hunks
- Commit flow (message + preview)

### Phase 2 - Branches & Log (Weeks 3-4)
- Branches tab: list, checkout, create, delete, merge, rebase
- Commits tab: log viewer, commit detail, cherry-pick, revert
- Stash tab: list, apply, pop, drop, create

### Phase 3 - Config & Themes (Weeks 4-5)
- Config loader (TOML)
- Theme system (JSON)
- Configurable keybindings with presets
- Command palette

### Phase 4 - GitHub PRs (Weeks 5-6)
- PRs tab: list, detail, diff with comments
- Review flow: approve, request changes, comment
- Merge PR from terminal
- Inline comments on diff

### Phase 5 - Distribution & Polish (Weeks 6-7)
- `bun build --compile` multi-platform binaries
- Homebrew tap
- Curl install script
- npm package
- Help overlay, onboarding
