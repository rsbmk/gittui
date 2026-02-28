# guit — Implementation Plan

**Date**: 2026-02-27
**Source**: [Design Document](./2026-02-27-guit-design.md)
**Stack**: TypeScript + Solid.js + OpenTUI (`@opentui/solid`) + Bun

---

## Conventions

Before touching a single file, internalize these:

| Rule | Detail |
|------|--------|
| **Component naming** | OpenTUI Solid uses `snake_case` JSX: `<tab_select>`, `<scroll_box>`, `<ascii_font>`, `<line_number>` |
| **Reactivity** | Solid signals and stores — NO useState, NO virtual DOM. `createSignal()`, `createStore()`, `createEffect()` |
| **Git backend** | ALL git operations go through `Bun.spawn()` → parse stdout → update store. Never use a git JS library. |
| **GitHub backend** | ALL GH operations go through `gh` CLI with `--json` flags. |
| **Keyboard** | `useKeyboard` hook from `@opentui/solid`. Handler receives `KeyEvent` with `.name` property. |
| **Layout** | OpenTUI uses flexbox via `<box>` props: `flexDirection`, `flexGrow`, `padding`, `border`, etc. |
| **Diff rendering** | OpenTUI `<diff>` component: unified/split view, syntax highlighting built-in. |
| **Dialogs** | `@opentui-ui/dialog` — `DialogProvider`, `useDialog()` hook for confirm/alert/choice/prompt. |
| **Config** | TOML parsed with `smol-toml`. Located at `~/.config/guit/config.toml`. |
| **Themes** | JSON files at `~/.config/guit/themes/<name>.json`. Built-in themes bundled in `src/lib/themes/`. |

---

## Phase 0 — Foundation (Week 1)

### Goal
Standing app with layout shell, shell executor, and basic git status flowing into Solid stores.

### 0.1 — Project Scaffold

**Dependencies to install:**
```bash
bun init
bun add @opentui/core @opentui/solid
bun add -d typescript @types/bun
```

**Files to create:**

#### `tsconfig.json`
```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@core/*": ["src/core/*"],
      "@ui/*": ["src/ui/*"],
      "@state/*": ["src/state/*"],
      "@lib/*": ["src/lib/*"]
    }
  },
  "include": ["src/**/*"]
}
```

#### `package.json` — key fields
```jsonc
{
  "name": "guit",
  "version": "0.1.0",
  "type": "module",
  "bin": { "guit": "./src/index.ts" },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build --compile --outfile=guit src/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```

#### `src/index.ts` — Entry point
- Parse CLI args (repo path, `--help`, `--version`)
- Verify current directory is a git repo (`git rev-parse --is-inside-work-tree`)
- Call `render(App)` from `@opentui/solid`

**Acceptance criteria:**
- [x] `bun run dev` launches a blank terminal UI
- [x] `bun run typecheck` passes
- [x] Running outside a git repo prints error and exits

---

### 0.2 — Shell Executor (`src/lib/shell.ts`)

The foundational utility every core module depends on.

```typescript
// src/lib/shell.ts
export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  ok: boolean
}

export interface ExecOptions {
  cwd?: string
  timeout?: number  // ms, default 30_000
  env?: Record<string, string>
}

export async function exec(cmd: string[], opts?: ExecOptions): Promise<ExecResult>
export function execSync(cmd: string[], opts?: ExecOptions): ExecResult
```

**Key implementation details:**
- Uses `Bun.spawn()` with `stdout: "pipe"`, `stderr: "pipe"`
- Collects output via `new Response(proc.stdout).text()`
- Throws `ShellError` on timeout or non-zero exit (unless caller opts out)
- `cwd` defaults to `process.cwd()`
- All git commands go through `exec(["git", ...args])`

**File:** `src/lib/shell.ts`

**Test file:** `src/lib/__tests__/shell.test.ts`
- Test successful command (`echo hello`)
- Test failed command (non-zero exit)
- Test timeout behavior

**Acceptance criteria:**
- [x] `exec(["git", "status"])` returns parsed ExecResult
- [x] Timeout kills the process after N ms
- [x] Tests pass with `bun test`

---

### 0.3 — Git Type Definitions (`src/core/git/types.ts`)

```typescript
// src/core/git/types.ts

export type FileStatus = "M" | "A" | "D" | "R" | "C" | "U" | "?"

export interface GitFile {
  path: string
  status: FileStatus
  staged: boolean
  oldPath?: string        // for renames
}

export interface GitStatus {
  branch: string
  upstream?: string
  ahead: number
  behind: number
  staged: GitFile[]
  unstaged: GitFile[]
  untracked: GitFile[]
}

export interface GitCommit {
  hash: string
  shortHash: string
  author: string
  email: string
  date: string           // ISO 8601
  relativeDate: string   // "2 hours ago"
  message: string
  body: string
  refs: string[]         // branch/tag names
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
  upstream?: string
  ahead: number
  behind: number
  lastCommit: string     // short hash
}

export interface GitStash {
  index: number
  message: string
  branch: string
  date: string
}

export interface DiffHunk {
  header: string          // @@ -10,6 +10,8 @@
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
  lines: DiffLine[]
}

export interface DiffLine {
  type: "add" | "delete" | "context"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface FileDiff {
  path: string
  oldPath?: string
  hunks: DiffHunk[]
  binary: boolean
  raw: string             // full diff string for <diff> component
}
```

**File:** `src/core/git/types.ts`

**Acceptance criteria:**
- [x] All types compile with strict mode
- [x] Types cover status, diff, commit, branch, stash domains

---

### 0.4 — Git Porcelain Parsers (`src/core/git/parser.ts`)

Parse `git status --porcelain=v2 --branch` and `git diff` output into typed structures.

```typescript
// src/core/git/parser.ts

export function parseStatus(output: string): GitStatus
export function parseDiff(output: string): FileDiff[]
export function parseLog(output: string): GitCommit[]
export function parseBranches(output: string): GitBranch[]
export function parseStash(output: string): GitStash[]
```

**Key implementation details:**

**`parseStatus`** parses porcelain v2 format:
```
# branch.oid abc123
# branch.head main
# branch.upstream origin/main
# branch.ab +2 -1
1 M. N... 100644 100644 100644 abc123 def456 src/app.ts
1 .M N... 100644 100644 100644 abc123 def456 src/lib.ts
? src/new-file.ts
```
- Line prefix `1` = tracked, `?` = untracked, `2` = renamed
- Column 1 of XY = staged status, column 2 = unstaged status
- `.` means no change in that column

**`parseLog`** parses `git log --format='%H%x00%h%x00%an%x00%ae%x00%aI%x00%ar%x00%s%x00%b%x00%D%x1e'`
- Fields separated by NULL byte (`%x00`)
- Records separated by record separator (`%x1e`)

**`parseDiff`** parses unified diff output:
- Split on `diff --git` boundaries
- Extract hunk headers (`@@ ... @@`)
- Classify lines as add/delete/context
- Store raw diff string per file for `<diff>` component

**Test file:** `src/core/git/__tests__/parser.test.ts`
- Fixture strings for each git output format
- Edge cases: binary files, renames, empty status

**Acceptance criteria:**
- [x] `parseStatus` correctly separates staged/unstaged/untracked
- [x] `parseDiff` extracts hunks with line numbers
- [x] `parseLog` handles multi-line commit bodies
- [x] All parsers have fixture-based tests

---

### 0.5 — Git Commands (`src/core/git/commands.ts`)

Typed wrappers that call `exec()` and pipe through parsers.

```typescript
// src/core/git/commands.ts

export async function getStatus(cwd?: string): Promise<GitStatus>
export async function getDiff(path?: string, staged?: boolean): Promise<FileDiff[]>
export async function getLog(opts?: { limit?: number; author?: string; grep?: string; path?: string }): Promise<GitCommit[]>
export async function getBranches(): Promise<GitBranch[]>
export async function getStashList(): Promise<GitStash[]>

// Mutations
export async function stageFile(path: string): Promise<void>
export async function unstageFile(path: string): Promise<void>
export async function stageAll(): Promise<void>
export async function discardFile(path: string): Promise<void>
export async function commit(message: string): Promise<string>  // returns hash
export async function checkout(branch: string): Promise<void>
export async function createBranch(name: string, from?: string): Promise<void>
export async function deleteBranch(name: string, force?: boolean): Promise<void>
export async function mergeBranch(branch: string): Promise<void>
export async function rebaseBranch(onto: string): Promise<void>
export async function cherryPick(hash: string): Promise<void>
export async function revertCommit(hash: string): Promise<void>
export async function stashSave(message?: string): Promise<void>
export async function stashApply(index: number): Promise<void>
export async function stashPop(index: number): Promise<void>
export async function stashDrop(index: number): Promise<void>
export async function stageHunk(patchContent: string): Promise<void>
```

**Key details:**
- `stageHunk` uses `git apply --cached` with stdin pipe
- `getLog` builds `--format` string with NULL separators
- `getDiff` calls `git diff` (unstaged) or `git diff --cached` (staged)
- All mutations call `getStatus()` afterwards to refresh state

**File:** `src/core/git/commands.ts`

**Acceptance criteria:**
- [x] Each function maps to exactly one git CLI invocation
- [x] Return types match the types from `types.ts`
- [x] Errors bubble up with the git stderr message

---

### 0.6 — Solid Stores (`src/state/`)

#### `src/state/repo.ts` — Repository State
```typescript
import { createStore } from "solid-js/store"

interface RepoState {
  status: GitStatus | null
  diff: FileDiff[]
  commits: GitCommit[]
  branches: GitBranch[]
  stashes: GitStash[]
  loading: boolean
  error: string | null
}

const [repo, setRepo] = createStore<RepoState>({ ... })

// Actions
export async function refreshStatus(): Promise<void>
export async function refreshDiff(path?: string, staged?: boolean): Promise<void>
export async function refreshCommits(): Promise<void>
export async function refreshBranches(): Promise<void>
export async function refreshStashes(): Promise<void>
export async function refreshAll(): Promise<void>

export { repo, setRepo }
```

#### `src/state/ui.ts` — UI State
```typescript
import { createSignal } from "solid-js"

export type TabId = "files" | "branches" | "commits" | "stash" | "prs"

export const [activeTab, setActiveTab] = createSignal<TabId>("files")
export const [sidebarVisible, setSidebarVisible] = createSignal(true)
export const [sidebarWidth, setSidebarWidth] = createSignal(30)
export const [activePanel, setActivePanel] = createSignal<"sidebar" | "main">("sidebar")
export const [selectedFile, setSelectedFile] = createSignal<string | null>(null)
export const [searchQuery, setSearchQuery] = createSignal("")
export const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false)
```

#### `src/state/keybindings.ts` — Keybinding Registry
```typescript
export interface Keybinding {
  key: string                        // "space", "ctrl+b", "c"
  action: string                     // "stage", "commit", "toggleSidebar"
  context: string                    // "files", "branches", "global"
  description: string                // "Stage selected file"
}

export const [keybindings, setKeybindings] = createSignal<Keybinding[]>(defaultKeybindings)
export function findBinding(key: string, context: string): Keybinding | undefined
export function executeBinding(binding: Keybinding): void
```

**Acceptance criteria:**
- [x] `refreshStatus()` calls git, parses, and updates the store
- [x] Changing `activeTab` signal triggers UI re-render
- [x] Keybinding lookup works for both global and context-specific bindings

---

### 0.7 — Layout Shell (`src/ui/layout/`)

#### `src/app.tsx` — Root Component
```tsx
import { render } from "@opentui/solid"
import { StatusBar } from "./ui/layout/status-bar"
import { Sidebar } from "./ui/layout/sidebar"
import { MainPanel } from "./ui/layout/main-panel"
import { KeybindingBar } from "./ui/layout/keybinding-bar"
import { GlobalKeyHandler } from "./ui/layout/global-keys"

const App = () => {
  onMount(() => refreshAll())

  return (
    <box flexDirection="column" width="100%" height="100%">
      <StatusBar />
      <box flexDirection="row" flexGrow={1}>
        <Show when={sidebarVisible()}>
          <Sidebar />
        </Show>
        <MainPanel />
      </box>
      <KeybindingBar />
      <GlobalKeyHandler />
    </box>
  )
}

render(App)
```

#### `src/ui/layout/status-bar.tsx`
- Shows: app name (`guit`), current branch, change counters (`+3 ~2 -1`), current time
- Reads from `repo.status` store reactively
- Fixed height (1 row), full width
- Pattern: `<box flexDirection="row" height={1}><text>...</text></box>`

#### `src/ui/layout/sidebar.tsx`
- Two sections: UNSTAGED and STAGED (from `repo.status`)
- Uses `<scrollbox>` for overflow
- Each file shows status icon (M/A/D/?) and path
- Active file highlighted with `selection` color
- Uses `<select>` or manual `<box>` items with focus management
- Width from `sidebarWidth()` signal

#### `src/ui/layout/main-panel.tsx`
- Contains `<tab_select>` with tabs: Files, Branches, Commits, Stash, PRs
- Renders active view based on `activeTab()` using `<Switch>`/`<Match>`
- `flexGrow={1}` to fill remaining space

#### `src/ui/layout/keybinding-bar.tsx`
- Bottom bar showing contextual keybindings
- Reads active context from `activeTab()` + `activePanel()`
- Fixed height (1 row)
- Format: `[key] Action  [key] Action  [key] Action`

#### `src/ui/layout/global-keys.tsx`
- Invisible component that calls `useKeyboard()` from `@opentui/solid`
- Handles global bindings: Tab (panel switch), Ctrl+B (sidebar toggle), 1-5 (tab switch), ?, :, /
- Delegates context-specific keys to `findBinding()` from keybinding registry

**Acceptance criteria:**
- [x] App renders 3-panel layout (status bar, content area, keybinding bar)
- [x] Sidebar shows file list from `git status`
- [x] Tab bar renders and switches between tabs
- [x] Ctrl+B toggles sidebar visibility
- [x] Number keys 1-5 switch tabs

---

## Phase 1 — Files & Diff (Weeks 2-3)

### Goal
Complete Files tab: working tree, staging area, diff viewer, stage/unstage, commit flow.

### 1.1 — File Tree Component (`src/ui/components/file-tree.tsx`)

Reusable file list with sections.

```tsx
interface FileTreeProps {
  files: GitFile[]
  title: string                    // "UNSTAGED" or "STAGED"
  selectedIndex: number
  onSelect: (file: GitFile) => void
}
```

**Key details:**
- Renders inside a `<scrollbox>`
- Each item: `<box>` with status icon + file path
- Status icons colored: M=yellow, A=green, D=red, ?=gray
- Selected item gets `selection` background color
- j/k navigation handled by parent via `selectedIndex` prop

**File:** `src/ui/components/file-tree.tsx`

**Acceptance criteria:**
- [x] Renders list of files with colored status icons
- [x] Highlights selected file
- [x] Scrolls when list exceeds viewport

---

### 1.2 — Diff View (`src/ui/views/diff.tsx`)

```tsx
interface DiffViewProps {
  fileDiff: FileDiff | null
  mode: "unified" | "split"        // from config
}
```

**Key details:**
- Uses OpenTUI `<diff>` component for rendering
- Pass `fileDiff.raw` (raw diff string) to `<diff content={...}>`
- Supports unified and split view via config
- Wraps in `<scrollbox>` for long diffs
- Hunk navigation: `n` (next hunk), `p` (previous hunk)
- Current hunk highlighted

**File:** `src/ui/views/diff.tsx`

**Acceptance criteria:**
- [x] Renders diff with syntax highlighting (via `<diff>`)
- [x] Hunk navigation works with n/p keys
- [x] Toggles unified/split view

---

### 1.3 — Files Tab View (`src/ui/views/files.tsx`)

The main Files tab orchestrating sidebar selection + diff panel.

**Key details:**
- When a file is selected in sidebar → fetch its diff → show in main panel
- `Space` on a file: calls `stageFile()` or `unstageFile()` depending on section
- `a`: calls `stageAll()`
- `d`: opens confirm dialog → calls `discardFile()`
- `c`: opens commit modal
- After any mutation: `refreshStatus()` to update store

**Keybindings (context: "files"):**

| Key | Action | Function |
|-----|--------|----------|
| `Space` | Stage/unstage selected file | `stageFile()` / `unstageFile()` |
| `a` | Stage all files | `stageAll()` |
| `d` | Discard changes | `discardFile()` (with confirm) |
| `c` | Open commit dialog | Show commit modal |
| `n` | Next hunk (in diff) | Scroll to next hunk |
| `p` | Previous hunk (in diff) | Scroll to previous hunk |
| `Enter` | Toggle expand file diff | Show/hide inline diff |

**File:** `src/ui/views/files.tsx`

**Acceptance criteria:**
- [x] Selecting a file loads its diff in the main panel
- [x] Space stages/unstages and refreshes the list
- [x] `a` stages everything
- [x] `d` shows confirmation before discarding

---

### 1.4 — Commit Modal (`src/ui/components/commit-modal.tsx`)

Dialog for composing commit messages.

**Key details:**
- Uses `@opentui-ui/dialog` pattern: `useDialog().prompt()`
- Layout: staged files preview (top) + `<textarea>` for message (bottom)
- `Ctrl+Enter` to confirm commit
- `Escape` to cancel
- Validates: non-empty message, at least one staged file
- On confirm: calls `commit(message)` → `refreshStatus()` → close dialog

```bash
bun add @opentui-ui/dialog
```

**File:** `src/ui/components/commit-modal.tsx`

**Acceptance criteria:**
- [x] Modal shows list of staged files
- [x] `<textarea>` accepts multi-line commit message
- [x] Ctrl+Enter commits, Escape cancels
- [x] Empty message shows validation error
- [x] After commit, status refreshes and modal closes

---

### 1.5 — Hunk-Level Staging

Advanced feature: stage individual hunks, not just whole files.

**Key details:**
- When diff is shown, each hunk is independently selectable
- `Space` on a hunk: generates patch from that hunk → `git apply --cached` via stdin
- `stageHunk(patchContent)` in `commands.ts` pipes patch to git stdin:
  ```typescript
  const proc = Bun.spawn(["git", "apply", "--cached"], {
    stdin: "pipe",
    cwd
  })
  proc.stdin.write(patchContent)
  proc.stdin.end()
  ```
- After staging a hunk, refresh diff to show remaining unstaged hunks

**File:** Additions to `src/ui/views/diff.tsx` and `src/core/git/commands.ts`

**Acceptance criteria:**
- [x] Individual hunks can be staged with Space
- [x] Diff refreshes showing only remaining unstaged changes
- [x] Works correctly with multiple hunks in same file

---

## Phase 2 — Branches, Commits & Stash (Weeks 3-4)

### Goal
Complete Branches, Commits, and Stash tabs with full CRUD operations.

### 2.1 — Branch List Component (`src/ui/components/branch-list.tsx`)

```tsx
interface BranchListProps {
  branches: GitBranch[]
  selectedIndex: number
  onSelect: (branch: GitBranch) => void
  filter: "local" | "remote" | "all"
}
```

**Key details:**
- Current branch marked with `*` or highlighted accent color
- Shows ahead/behind indicators: `↑2 ↓1`
- Remote branches grouped under remote name (origin/, upstream/)
- Filter toggle between local/remote/all
- Renders in `<scrollbox>`

**File:** `src/ui/components/branch-list.tsx`

**Acceptance criteria:**
- [x] Current branch visually distinct
- [x] Ahead/behind counters shown
- [x] Filter switches between local/remote

---

### 2.2 — Branches Tab View (`src/ui/views/branches.tsx`)

**Keybindings (context: "branches"):**

| Key | Action | Implementation |
|-----|--------|----------------|
| `Enter` | Checkout branch | `checkout(branch.name)` |
| `n` | New branch | Prompt dialog → `createBranch(name)` |
| `d` | Delete branch | Confirm dialog → `deleteBranch(name)` |
| `D` | Force delete | Confirm dialog → `deleteBranch(name, true)` |
| `m` | Merge into current | Confirm → `mergeBranch(branch.name)` |
| `r` | Rebase current onto | Confirm → `rebaseBranch(branch.name)` |
| `f` | Filter (local/remote/all) | Toggle filter signal |

**Key details:**
- After checkout/create/delete: `refreshBranches()` + `refreshStatus()`
- Merge/rebase: show result (success/conflict) in a dialog
- Conflict state: show conflicted files in sidebar with `U` status
- New branch prompt uses `useDialog().prompt()` with `<input>`

**File:** `src/ui/views/branches.tsx`

**Acceptance criteria:**
- [x] Enter checks out selected branch and updates status bar
- [x] `n` creates a new branch from current HEAD
- [x] `d` deletes with confirmation, `D` force-deletes
- [x] `m` and `r` show success/conflict result

---

### 2.3 — Commit List Component (`src/ui/components/commit-list.tsx`)

```tsx
interface CommitListProps {
  commits: GitCommit[]
  selectedIndex: number
  onSelect: (commit: GitCommit) => void
}
```

**Rendered format per row:**
```
abc1234  John Doe  2 hours ago  feat: add user auth
```

**Key details:**
- Short hash (accent color), author (muted), relative date (muted), message (fg)
- Refs shown as badges: `[main]` `[origin/main]` `[v1.0.0]`
- Renders in `<scrollbox>` with lazy loading (load more on scroll bottom)

**File:** `src/ui/components/commit-list.tsx`

**Acceptance criteria:**
- [x] Shows hash, author, date, message in aligned columns
- [x] Branch/tag refs shown as colored badges
- [x] Scrollable with keyboard navigation

---

### 2.4 — Commits Tab View (`src/ui/views/commits.tsx`)

**Keybindings (context: "commits"):**

| Key | Action | Implementation |
|-----|--------|----------------|
| `Enter` | View commit detail | Show files changed + diffs |
| `c` | Cherry-pick | Confirm → `cherryPick(hash)` |
| `r` | Revert | Confirm → `revertCommit(hash)` |
| `/` | Filter commits | Show search input (author, message, path) |

**Key details:**
- Commit detail view: split panel — file list (left) + diff (right)
- Reuses `<file-tree>` for changed files and `<diff>` for viewing
- Filter: `<input>` at top, filters `getLog({ grep, author, path })`
- `Escape` from detail view returns to commit list

**File:** `src/ui/views/commits.tsx`

**Acceptance criteria:**
- [x] Enter shows commit detail with file list and diffs
- [x] Cherry-pick and revert work with confirmation
- [x] Filter narrows commit list by author/message/path
- [x] Escape returns to list from detail view

---

### 2.5 — Stash Tab View (`src/ui/views/stash.tsx`)

**Keybindings (context: "stash"):**

| Key | Action | Implementation |
|-----|--------|----------------|
| `Enter` | View stash content | Show stash diff |
| `a` | Apply stash | `stashApply(index)` |
| `p` | Pop stash | `stashPop(index)` |
| `d` | Drop stash | Confirm → `stashDrop(index)` |
| `s` | Save new stash | Prompt message → `stashSave(msg)` |

**Key details:**
- List shows: `stash@{0}: On main: WIP message` with date
- Enter shows the diff of stash contents (reuses `<diff>`)
- `s` prompt: `<input>` for optional message, defaults to git auto-message
- After any mutation: `refreshStashes()`

**File:** `src/ui/views/stash.tsx`

**Acceptance criteria:**
- [x] List shows all stashes with messages and dates
- [x] Enter shows stash diff
- [x] Apply/pop/drop/save all work and refresh the list

---

## Phase 3 — Config & Themes (Weeks 4-5)

### Goal
TOML config loading, JSON theme system, configurable keybindings, command palette.

### 3.1 — Config Schema & Defaults (`src/core/config/`)

```bash
bun add smol-toml
```

#### `src/core/config/schema.ts`
```typescript
export interface GuitConfig {
  general: {
    theme: string               // theme name (file stem)
    sidebar_width: number
    sidebar_collapsed: boolean
    default_tab: TabId
  }
  keybindings: {
    preset: "vim" | "emacs" | "custom"
    custom: Record<string, string>  // action → key
  }
  diff: {
    view: "unified" | "split"
    context_lines: number
    word_diff: boolean
    show_line_numbers: boolean
  }
  github: {
    auto_fetch_prs: boolean
  }
}
```

#### `src/core/config/defaults.ts`
```typescript
export const defaultConfig: GuitConfig = {
  general: {
    theme: "catppuccin-mocha",
    sidebar_width: 30,
    sidebar_collapsed: false,
    default_tab: "files"
  },
  keybindings: {
    preset: "vim",
    custom: {}
  },
  diff: {
    view: "unified",
    context_lines: 3,
    word_diff: false,
    show_line_numbers: true
  },
  github: {
    auto_fetch_prs: true
  }
}
```

#### `src/core/config/loader.ts`
```typescript
import { parse } from "smol-toml"

const CONFIG_DIR = join(homedir(), ".config", "guit")
const CONFIG_FILE = join(CONFIG_DIR, "config.toml")

export async function loadConfig(): Promise<GuitConfig>    // deep merge with defaults
export async function saveConfig(config: GuitConfig): Promise<void>
export function ensureConfigDir(): void                     // mkdir -p on first run
```

**Key details:**
- `loadConfig()` reads TOML, parses, deep-merges with defaults (user only overrides what they specify)
- First run: creates `~/.config/guit/` and writes default `config.toml`
- Config is loaded once at startup and stored in a Solid signal
- Config signal: `src/state/config.ts` — `const [config, setConfig] = createSignal<GuitConfig>(defaultConfig)`

**Test file:** `src/core/config/__tests__/loader.test.ts`
- Test parsing valid TOML
- Test deep merge with defaults
- Test missing file creates defaults

**Acceptance criteria:**
- [x] Config loads from `~/.config/guit/config.toml`
- [x] Missing keys fall back to defaults
- [x] First run creates config directory and file
- [x] Invalid TOML shows clear error message

---

### 3.2 — Theme System (`src/lib/theme.ts` + `src/lib/themes/`)

#### `src/lib/theme.ts`
```typescript
import { RGBA, SyntaxStyle } from "@opentui/core"

export interface GuitTheme {
  name: string
  colors: {
    bg: string; fg: string; accent: string
    success: string; warning: string; error: string; muted: string
    border: string; selection: string
    diff_add_bg: string; diff_del_bg: string
    diff_add_fg: string; diff_del_fg: string
  }
  syntax: {
    keyword: string; string: string; number: string; comment: string
    function: string; type: string; variable: string; operator: string
  }
}

export function loadTheme(name: string): GuitTheme
export function toSyntaxStyle(theme: GuitTheme): SyntaxStyle   // converts to OpenTUI SyntaxStyle
export function getColor(key: keyof GuitTheme["colors"]): string  // reactive getter from current theme
```

#### Built-in theme files (`src/lib/themes/`)
- `default-dark.json`
- `catppuccin-mocha.json`
- `nord.json`
- `tokyo-night.json`

**Key details:**
- Built-in themes are bundled JSON files imported at build time
- Custom themes loaded from `~/.config/guit/themes/<name>.json`
- `loadTheme()` checks custom dir first, then falls back to built-in
- Theme is a Solid signal: `const [theme, setTheme] = createSignal<GuitTheme>(...)` in `src/state/config.ts`
- `toSyntaxStyle()` converts theme syntax colors to OpenTUI's `SyntaxStyle.fromStyles()` format

**Acceptance criteria:**
- [x] Built-in themes load and apply colors to all components
- [x] Custom themes from config dir override built-ins
- [x] `SyntaxStyle` conversion works for `<code>` and `<diff>` components
- [x] All 4 built-in theme JSON files exist with valid schemas

---

### 3.3 — Keybinding Presets

#### `src/state/keybindings.ts` — Enhanced

**Vim preset (default):**
```typescript
const vimBindings: Keybinding[] = [
  // Global
  { key: "1", action: "switchTab:files", context: "global", description: "Files tab" },
  { key: "2", action: "switchTab:branches", context: "global", description: "Branches tab" },
  { key: "3", action: "switchTab:commits", context: "global", description: "Commits tab" },
  { key: "4", action: "switchTab:stash", context: "global", description: "Stash tab" },
  { key: "5", action: "switchTab:prs", context: "global", description: "PRs tab" },
  { key: "tab", action: "switchPanel", context: "global", description: "Switch panel" },
  { key: "ctrl+b", action: "toggleSidebar", context: "global", description: "Toggle sidebar" },
  { key: "?", action: "showHelp", context: "global", description: "Help" },
  { key: ":", action: "commandPalette", context: "global", description: "Command palette" },
  { key: "/", action: "search", context: "global", description: "Search" },
  { key: "q", action: "quit", context: "global", description: "Quit" },

  // Files
  { key: "space", action: "stage", context: "files", description: "Stage/unstage" },
  { key: "a", action: "stageAll", context: "files", description: "Stage all" },
  { key: "c", action: "commit", context: "files", description: "Commit" },
  { key: "d", action: "discard", context: "files", description: "Discard changes" },

  // Navigation
  { key: "j", action: "moveDown", context: "global", description: "Move down" },
  { key: "k", action: "moveUp", context: "global", description: "Move up" },
  { key: "g", action: "moveTop", context: "global", description: "Go to top" },
  { key: "G", action: "moveBottom", context: "global", description: "Go to bottom" },
  // ...
]
```

**Emacs preset:** Ctrl-based navigation (Ctrl+n/p for down/up, etc.)

**Custom:** Loaded from `config.keybindings.custom`, merged over preset.

**Key details:**
- `findBinding(key, context)` checks context-specific first, then falls back to "global"
- `executeBinding(binding)` dispatches to the correct action handler
- Action handlers live in a registry map: `Record<string, () => void | Promise<void>>`

**Acceptance criteria:**
- [x] Vim and emacs presets provide full keybinding coverage
- [x] Custom bindings from config override preset bindings
- [x] Context-specific bindings take priority over global

---

### 3.4 — Command Palette (`src/ui/layout/command-palette.tsx`)

**Key details:**
- Triggered by `:` key
- Fuzzy search over all available commands (actions from keybinding registry)
- Uses `<input>` for search + `<select>` for filtered results
- Each result shows: command name, keybinding, description
- `Enter` executes command, `Escape` closes
- Implemented as a dialog overlay using `useDialog()`

```tsx
// Pattern:
const dialog = useDialog()

// In global key handler:
if (key.name === ":") {
  await dialog.prompt({
    content: (ctx) => <CommandPaletteContent onSelect={(action) => {
      executeBinding(action)
      ctx.resolve(undefined)
    }} onCancel={ctx.dismiss} />
  })
}
```

**File:** `src/ui/layout/command-palette.tsx`

**Acceptance criteria:**
- [x] `:` opens command palette overlay
- [x] Typing filters commands by fuzzy match
- [x] Enter executes selected command
- [x] Escape closes without action
- [x] Shows keybinding shortcut next to each command

---

### 3.5 — Help Overlay (`src/ui/layout/help-overlay.tsx`)

**Key details:**
- Triggered by `?` key
- Full-screen overlay showing all keybindings grouped by context
- Uses `<scrollbox>` for overflow
- Sections: Global, Files, Branches, Commits, Stash, PRs
- Shows key + description in two columns
- `Escape` or `?` closes

**File:** `src/ui/layout/help-overlay.tsx`

**Acceptance criteria:**
- [x] `?` toggles help overlay
- [x] All keybindings shown grouped by context
- [x] Scrollable for long lists
- [x] Escape closes

---

## Phase 4 — GitHub PRs (Weeks 5-6)

### Goal
Full GitHub PR workflow: list, view, review, comment, merge — all via `gh` CLI.

### 4.1 — GitHub Types (`src/core/github/types.ts`)

```typescript
export interface PullRequest {
  number: number
  title: string
  body: string
  state: "open" | "closed" | "merged"
  draft: boolean
  author: string
  branch: string
  baseBranch: string
  url: string
  createdAt: string
  updatedAt: string
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null
  labels: string[]
  assignees: string[]
  reviewers: string[]
  additions: number
  deletions: number
  changedFiles: number
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN"
}

export interface PRReview {
  id: number
  author: string
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING"
  body: string
  submittedAt: string
}

export interface PRComment {
  id: number
  author: string
  body: string
  path: string
  line: number
  side: "LEFT" | "RIGHT"
  createdAt: string
  diffHunk: string
}

export interface PRFile {
  path: string
  status: "added" | "removed" | "modified" | "renamed"
  additions: number
  deletions: number
  patch: string   // diff content
}
```

**File:** `src/core/github/types.ts`

---

### 4.2 — GitHub Commands & Parser (`src/core/github/`)

#### `src/core/github/commands.ts`
```typescript
export async function isGhAvailable(): Promise<boolean>
export async function listPRs(state?: "open" | "closed" | "all"): Promise<PullRequest[]>
export async function getPRDetail(number: number): Promise<PullRequest>
export async function getPRFiles(number: number): Promise<PRFile[]>
export async function getPRReviews(number: number): Promise<PRReview[]>
export async function getPRComments(number: number): Promise<PRComment[]>
export async function createReview(number: number, event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", body: string): Promise<void>
export async function addComment(number: number, body: string, path: string, line: number): Promise<void>
export async function mergePR(number: number, method: "squash" | "merge" | "rebase"): Promise<void>
```

**Key details:**
- All commands use `exec(["gh", "pr", ...args, "--json", fields])`
- JSON field lists specified per command:
  ```typescript
  const PR_FIELDS = "number,title,body,state,isDraft,author,headRefName,baseRefName,url,createdAt,updatedAt,reviewDecision,labels,assignees,reviewRequests,additions,deletions,changedFiles,mergeable"
  ```
- `gh pr list --json ${PR_FIELDS}` → parse JSON directly (no custom parser needed for GH)
- `gh pr diff <number>` for raw diff content
- `gh pr review <number> --approve --body "LGTM"` for reviews

#### `src/core/github/parser.ts`
```typescript
// Minimal — gh outputs JSON directly, just map field names
export function mapPR(raw: Record<string, unknown>): PullRequest
export function mapReview(raw: Record<string, unknown>): PRReview
export function mapComment(raw: Record<string, unknown>): PRComment
export function mapFile(raw: Record<string, unknown>): PRFile
```

**Acceptance criteria:**
- [x] `listPRs()` returns typed PR array
- [x] `getPRDetail()` returns full PR with all fields
- [x] `createReview()` submits review via gh CLI
- [x] `addComment()` posts inline comment
- [x] `mergePR()` merges with selected strategy
- [x] `isGhAvailable()` returns false gracefully when gh not installed

---

### 4.3 — PR Store (`src/state/prs.ts`)

```typescript
import { createStore } from "solid-js/store"

interface PRState {
  list: PullRequest[]
  selected: PullRequest | null
  files: PRFile[]
  reviews: PRReview[]
  comments: PRComment[]
  loading: boolean
  error: string | null
  ghAvailable: boolean
}

export const [prs, setPRs] = createStore<PRState>({ ... })

export async function refreshPRs(): Promise<void>
export async function selectPR(number: number): Promise<void>   // loads detail + files + reviews + comments
export async function submitReview(event: string, body: string): Promise<void>
export async function submitComment(body: string, path: string, line: number): Promise<void>
export async function merge(method: string): Promise<void>
```

---

### 4.4 — PR Card Component (`src/ui/components/pr-card.tsx`)

```tsx
interface PRCardProps {
  pr: PullRequest
  selected: boolean
}
```

**Rendered format:**
```
#42  feat: add user auth                           John Doe
     draft · review-required · +120 -45 · 8 files  2h ago
```

**Key details:**
- PR number in accent color
- Status badges: draft (muted), approved (green), changes-requested (red), review-required (yellow)
- Stats: additions (green), deletions (red), file count
- Selected state: `selection` background

**File:** `src/ui/components/pr-card.tsx`

---

### 4.5 — Pull Requests Tab View (`src/ui/views/pull-requests.tsx`)

**Layout when PR selected:**
```
+--PR list (left)--+--PR detail (right)--+
| #42 feat: auth   | ## Description      |
| #41 fix: typo    | Add OAuth2 login... |
| #40 docs: readme | ### Files (8)       |
|                   | M src/auth.ts +50-2 |
|                   | A src/oauth.ts +120 |
+-------------------+--------------------+
```

**Keybindings (context: "prs"):**

| Key | Action | Implementation |
|-----|--------|----------------|
| `Enter` | View PR detail | `selectPR(number)` |
| `r` | Submit review | Dialog: approve/request-changes/comment + body |
| `c` | Add inline comment | Navigate to diff line → input comment body |
| `m` | Merge PR | Choice dialog: squash/merge/rebase |
| `o` | Open in browser | `exec(["gh", "pr", "view", "--web", number])` |
| `Escape` | Back to list | Clear selected PR |

**Key details:**
- PR list on left, detail on right (split view)
- Detail view shows: description (rendered with `<markdown>`), files list, review status
- Selecting a file in detail shows its diff with inline PR comments overlaid
- Comments shown as annotated lines in diff view
- Review dialog: `<select>` for event type + `<textarea>` for body
- Check `ghAvailable` on mount — show "gh CLI not found" message if missing

**File:** `src/ui/views/pull-requests.tsx`

**Acceptance criteria:**
- [x] PR list shows all open PRs with status badges
- [x] Enter shows PR detail with description (markdown), files, reviews
- [x] File selection shows diff with inline comments
- [x] Review submission works (approve/request-changes/comment)
- [x] Merge dialog offers squash/merge/rebase options
- [x] Graceful message when `gh` CLI not installed

---

## Phase 5 — Distribution & Polish (Weeks 6-7)

### Goal
Multi-platform binary builds, install channels, help system, performance tuning.

### 5.1 — Build System

#### `scripts/build.ts`
```typescript
const TARGETS = [
  { platform: "darwin", arch: "arm64" },
  { platform: "darwin", arch: "x64" },
  { platform: "linux", arch: "x64" },
  { platform: "linux", arch: "arm64" },
] as const

for (const target of TARGETS) {
  await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: `./dist/${target.platform}-${target.arch}`,
    target: "bun",
    compile: true,
    naming: "guit",
  })
}
```

**Key details:**
- `bun build --compile` creates self-contained executable
- No Node.js needed to run
- Built-in themes bundled via import
- `package.json` scripts:
  ```json
  {
    "build": "bun build --compile --outfile=guit src/index.ts",
    "build:all": "bun run scripts/build.ts"
  }
  ```

**File:** `scripts/build.ts`

**Acceptance criteria:**
- [x] `bun run build` produces working `guit` binary
- [x] Binary runs without Bun installed
- [x] All 4 platform targets build successfully

---

### 5.2 — Homebrew Tap

#### `homebrew-tap/Formula/guit.rb`
```ruby
class Guit < Formula
  desc "Modern terminal git client"
  homepage "https://github.com/guit-cli/guit"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER"
    else
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-darwin-x64.tar.gz"
      sha256 "PLACEHOLDER"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-linux-arm64.tar.gz"
      sha256 "PLACEHOLDER"
    else
      url "https://github.com/guit-cli/guit/releases/download/v#{version}/guit-linux-x64.tar.gz"
      sha256 "PLACEHOLDER"
    end
  end

  def install
    bin.install "guit"
  end

  test do
    assert_match "guit", shell_output("#{bin}/guit --version")
  end
end
```

**File:** `homebrew-tap/Formula/guit.rb`

---

### 5.3 — Install Script

#### `scripts/install.sh`
```bash
#!/bin/sh
set -e

REPO="guit-cli/guit"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

LATEST=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed 's/.*"v\(.*\)".*/\1/')
URL="https://github.com/${REPO}/releases/download/v${LATEST}/guit-${OS}-${ARCH}.tar.gz"

echo "Installing guit v${LATEST} (${OS}-${ARCH})..."
curl -fsSL "$URL" | tar xz -C /usr/local/bin
echo "guit installed to /usr/local/bin/guit"
```

**File:** `scripts/install.sh`

---

### 5.4 — npm Package Config

#### `package.json` additions
```jsonc
{
  "bin": { "guit": "./src/index.ts" },
  "files": ["src/", "dist/"],
  "publishConfig": { "access": "public" }
}
```

**Key details:**
- npm install runs via `bun` since entry is `.ts`
- Consider a `postinstall` script that compiles if Bun is available

---

### 5.5 — GitHub Actions CI/CD

#### `.github/workflows/release.yml`
- Trigger: push tag `v*`
- Jobs:
  1. **Build**: matrix of `[darwin-arm64, darwin-x64, linux-x64, linux-arm64]`
  2. **Release**: create GitHub release, upload binaries
  3. **Publish**: `npm publish`
  4. **Homebrew**: update formula SHA256 in tap repo

#### `.github/workflows/ci.yml`
- Trigger: push to main, PRs
- Steps: typecheck, lint, test
- `bun test` for unit tests

**Acceptance criteria:**
- [x] Tags trigger automated release with binaries
- [x] CI runs typecheck and tests on PRs
- [x] npm package published automatically

---

### 5.6 — Polish & UX

#### Logger (`src/lib/logger.ts`)
```typescript
export function log(level: "debug" | "info" | "warn" | "error", message: string, data?: unknown): void
```
- Writes to `~/.config/guit/guit.log`
- Rotates at 10MB
- Debug level controlled by `GUIT_DEBUG=1` env var

#### Error Boundaries
- Wrap each view in error boundary
- Git command failures show user-friendly messages, not stack traces
- Network failures (gh CLI) show retry prompt

#### Performance
- `refreshStatus()` uses `git status --porcelain=v2 --branch` (fast porcelain mode)
- File diffs loaded lazily — only when file is selected
- Commit log pagination: load 50 at a time, fetch more on scroll
- PR list cached for 30 seconds, manual refresh with `R`
- Debounce rapid key presses (50ms)

#### First-Run Experience
- Detect first run (no config dir)
- Show welcome message with key bindings overview
- Create default config

**Acceptance criteria:**
- [x] Logger writes to file, respects debug level
- [x] Git errors show friendly messages
- [x] Lazy loading prevents startup lag
- [x] First run shows welcome and creates config

---

## File Creation Summary

### Phase 0 (15 files)
```
src/index.ts
src/app.tsx
src/lib/shell.ts
src/lib/theme.ts
src/lib/logger.ts
src/core/git/types.ts
src/core/git/parser.ts
src/core/git/commands.ts
src/state/repo.ts
src/state/ui.ts
src/state/keybindings.ts
src/ui/layout/status-bar.tsx
src/ui/layout/sidebar.tsx
src/ui/layout/main-panel.tsx
src/ui/layout/keybinding-bar.tsx
src/ui/layout/global-keys.tsx
```

### Phase 1 (4 files)
```
src/ui/components/file-tree.tsx
src/ui/views/files.tsx
src/ui/views/diff.tsx
src/ui/components/commit-modal.tsx
```

### Phase 2 (5 files)
```
src/ui/components/branch-list.tsx
src/ui/views/branches.tsx
src/ui/components/commit-list.tsx
src/ui/views/commits.tsx
src/ui/views/stash.tsx
```

### Phase 3 (7 files + 4 theme JSONs)
```
src/core/config/schema.ts
src/core/config/defaults.ts
src/core/config/loader.ts
src/state/config.ts
src/lib/themes/default-dark.json
src/lib/themes/catppuccin-mocha.json
src/lib/themes/nord.json
src/lib/themes/tokyo-night.json
src/ui/layout/command-palette.tsx
src/ui/layout/help-overlay.tsx
```

### Phase 4 (5 files)
```
src/core/github/types.ts
src/core/github/commands.ts
src/core/github/parser.ts
src/state/prs.ts
src/ui/components/pr-card.tsx
src/ui/views/pull-requests.tsx
```

### Phase 5 (5 files)
```
scripts/build.ts
scripts/install.sh
homebrew-tap/Formula/guit.rb
.github/workflows/ci.yml
.github/workflows/release.yml
```

### Test Files (created alongside each module)
```
src/lib/__tests__/shell.test.ts
src/core/git/__tests__/parser.test.ts
src/core/git/__tests__/commands.test.ts
src/core/config/__tests__/loader.test.ts
src/core/github/__tests__/commands.test.ts
src/state/__tests__/repo.test.ts
src/state/__tests__/keybindings.test.ts
```

---

## Dependency Summary

| Package | Phase | Purpose |
|---------|-------|---------|
| `@opentui/core` | 0 | Core TUI rendering engine |
| `@opentui/solid` | 0 | Solid.js bindings for OpenTUI |
| `@opentui-ui/dialog` | 1 | Dialog/modal system |
| `smol-toml` | 3 | TOML config file parsing |
| `typescript` (dev) | 0 | Type checking |
| `@types/bun` (dev) | 0 | Bun runtime types |

---

## Critical Patterns Reference

### Shell command execution
```typescript
import { exec } from "@lib/shell"
const result = await exec(["git", "status", "--porcelain=v2", "--branch"])
const status = parseStatus(result.stdout)
setRepo("status", status)
```

### Keyboard handling
```typescript
import { useKeyboard } from "@opentui/solid"

useKeyboard((key) => {
  const binding = findBinding(key.name, activeTab())
  if (binding) executeBinding(binding)
})
```

### Reactive store → UI
```typescript
// State
const [repo, setRepo] = createStore<RepoState>({ status: null, ... })

// Component reads reactively
const FileCount = () => (
  <text>Files: {repo.status?.unstaged.length ?? 0}</text>
)
```

### Dialog pattern (Solid + opentui-ui)
```typescript
const dialog = useDialog()

const confirmed = await dialog.confirm({
  content: (ctx) => (
    <box flexDirection="column">
      <text>Delete branch "{branch.name}"?</text>
      <box flexDirection="row" gap={2}>
        <text onMouseUp={ctx.dismiss}>[Cancel]</text>
        <text onMouseUp={() => ctx.resolve(true)}>[Delete]</text>
      </box>
    </box>
  ),
  fallback: false
})
```

### OpenTUI diff rendering
```tsx
<diff
  content={fileDiff.raw}
  view="unified"
  syntaxStyle={toSyntaxStyle(theme())}
  width="100%"
  height="100%"
/>
```
