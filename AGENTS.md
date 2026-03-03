# AGENTS.md — gittui

Modern terminal git client built with Bun + Solid.js + OpenTUI.

## Build / Test / Typecheck

```bash
bun install                        # Install dependencies
bun test                           # Run all tests
bun test src/lib/__tests__/perf    # Run a single test file (prefix match)
bun test --grep "parses single"    # Run tests matching a description
bun run typecheck                  # tsc --noEmit (strict mode)
bun run dev                        # Run with HMR (--preload @opentui/solid/preload)
bun run build                      # Compile single binary for current platform
bun run build:current              # Cross-compile for current platform only
bun run build:all                  # Cross-compile for all 4 targets
```

No linter/formatter configured. TypeScript strict mode is the only static analysis.

## Runtime: Bun Only

- **Always** use `bun`, never `node`, `npm`, `npx`, `vite`, `jest`, or `vitest`.
- `Bun.file()` / `Bun.write()` instead of `node:fs` readFile/writeFile.
- `Bun.spawn()` for subprocesses. Read streams via `new Response(proc.stdout).text()`.
- `node:fs/promises` only for `mkdir`, `stat`, `rename` (no Bun equivalent).
- `node:os` and `node:path` are fine for `homedir()`, `join()`, `dirname()`.
- Bun auto-loads `.env` — never use `dotenv`.

## TypeScript Configuration

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- `verbatimModuleSyntax: true` — enforces `import type` for type-only imports
- `jsxImportSource: "@opentui/solid"` — NOT `solid-js`
- Path aliases: `@core/*`, `@ui/*`, `@state/*`, `@lib/*` (but relative paths are more common)

## Principles

- **SOLID, KISS, YAGNI, DRY** — follow these principles strictly in all code.
- **Declarative over imperative** — write declarative, scalable code. Never use imperative patterns
  where a declarative alternative exists (e.g. prefer `<For>`, `<Show>`, `createMemo` over manual
  loops, if-else chains, or mutable accumulators in UI code).
- **No `any`** — `any` is **strictly forbidden**. No `as any`, no `param: any`, no `any` anywhere.
  If TypeScript complains, the type is wrong — fix the type, don't silence the compiler.
  If a third-party library forces `any`, wrap it in a typed helper.
- **No magic strings or numbers** — extract all literals into named constants (`SCREAMING_SNAKE_CASE`).
  The only exceptions are: `0`, `1`, `-1`, `""`, `true`, `false`, and single-use format strings.

## Code Style

### Formatting
- No semicolons
- Double quotes for strings
- Trailing commas in multi-line arrays/objects/params
- 2-space indentation
- `function` declarations for top-level/exported/component functions
- Arrow functions only for callbacks, closures, and inline accessors

### File Naming
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Directories: lowercase, no hyphens (`core`, `ui`, `state`, `lib`)
- Tests: `src/<module>/__tests__/<name>.test.ts` (colocated `__tests__/` dirs)

### Imports
- **Always** include `.ts` / `.tsx` extensions in relative imports
- Separate `import type` statements — never mix `import { type Foo, bar }`
- Ordering: third-party packages first, then relative imports
- No barrel files (`index.ts`) in subdirectories — always import the specific file

### Types
- **Const object + type extraction** pattern — never use `enum`:
  ```typescript
  export const FILE_STATUS = {
    MODIFIED: "M",
    ADDED: "A",
    DELETED: "D",
  } as const
  export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS]
  ```
- Const objects: `SCREAMING_SNAKE_CASE`. Derived types: `PascalCase`.
- `interface` for object shapes — never `type` aliases for objects.
- Props interfaces: named `{Component}Props`, defined in the component file.
- Non-null assertions (`!`) only after array indexing where `noUncheckedIndexedAccess` applies.

### Naming
- Variables/functions: `camelCase`
- Components: `PascalCase` (e.g. `FileTree`, `StatusBar`)
- Constants: `SCREAMING_SNAKE_CASE`
- Types/interfaces: `PascalCase`

### Section Headers
Use box-drawing comment separators to organize file sections:
```typescript
// ── Queries ───────────────────────────────────────────────────
// ── Mutations ─────────────────────────────────────────────────
```

### File Headers
Every file starts with a one-line descriptive comment:
```typescript
// src/core/git/parser.ts
// Porcelain parsers for git CLI output
```

## Error Handling

- Custom error classes extend `Error` and set `this.name`:
  `GitCommandError` (git failures), `ShellTimeoutError` (timeouts)
- Catch blocks use: `err instanceof Error ? err.message : String(err)`
- Bare `catch {}` only for non-critical paths (e.g. silent fallback on optional data)
- Log errors via `logError()` from `src/lib/logger.ts` (writes to `~/.config/gittui/gittui.log`, never stdout)
- UI views wrapped in `ViewBoundary` error boundaries for graceful degradation

## Testing

- Framework: `bun:test` — import `{ test, expect, describe, beforeEach, afterEach }`
- Use `test()`, not `it()`
- Only `core/` and `lib/` have tests (pure logic, no UI tests)
- Test isolation via path override functions (`setConfigPaths()`, `setLogPath()`) — not mocks
- Use temp dirs with `mkdtemp` + cleanup in `afterEach` for filesystem tests
- Concrete test data, no fakers or random generators
- Always test edge cases (empty input, missing fields)

## Solid.js Patterns (NOT React)

- `createSignal` for scalar UI state, `createStore` for complex/nested state
- Store updates via path setter: `setRepo("loading", true)`
- `<Show when={...}>`, `<For each={...}>`, `<Switch>/<Match>` — never ternaries in JSX
- `onMount` for init, `onCleanup` for teardown
- Access props as `props.x` — never destructure props
- Components are named exports (`export function Foo`), not default exports
- `createEffect` for async side effects triggered by signal changes

## OpenTUI (Terminal UI)

- JSX primitives: `<box>`, `<text>`, `<scrollbox>`, `<diff>`, `<input>`, `<textarea>`
- **NOT HTML** — no `<div>`, `<span>`, `<p>`, `<button>`
- Multi-word intrinsics use snake_case: `<tab_select>`, `<ascii_font>`
- Layout via flexbox props: `flexDirection`, `flexGrow`, `width`, `height`, `gap`, `padding`
- Colors via `fg`/`bg` props on `<text>` — `<span>` does NOT support colors
- `<input>` uses `value` prop + `onInput` for change events (passes `string`).
  **Never** use `onContentChange` on `<input>` — it passes a `ContentChangeEvent` object, not a string.
- `<textarea>` uses `initialValue` + `onContentChange` (passes `string` in Solid bindings),
  or the `ref` + `ref.plainText` pattern
- Dialogs via `@opentui-ui/dialog/solid`: `useDialog()`, `useDialogKeyboard()`
- **Always** add `flexShrink={0}` to boxes with fixed dimensions (explicit `width`/`height`)
  sitting alongside `flexGrow={1}` siblings — prevents OpenTUI flex engine from collapsing them

## Architecture

```
src/
  index.ts              # CLI entry point
  app.tsx               # Root component (DialogProvider, overlays)
  core/                 # Business logic — NO ui/ or state/ imports
    git/                # Git CLI wrappers, parsers, types
    github/             # GitHub CLI (gh) wrappers, parsers, types
    config/             # TOML config (schema, defaults, loader) — ~/.config/gittui/config.toml
    ai/                 # AI commit message generation via terminal agents (Claude, OpenCode, etc.)
  ui/                   # Solid.js components
    components/         # Reusable presentational components (ScrollList, FileTree, etc.)
    layout/             # App shell (sidebar, status bar, keybindings, global keys)
    views/              # One per tab (files, branches, commits, stash, PRs, settings)
  state/                # Signals + stores — imports from core/ and lib/
  lib/                  # Pure utilities (shell, logger, perf, theme)
scripts/                # Build + install scripts
```

**Dependency flow**: `core/` and `lib/` are leaf modules. `state/` depends on `core/` + `lib/`.
`ui/` depends on all three. `core/` never imports from `ui/` or `state/`.

- Git operations: `Bun.spawn()` via `exec()` in `src/lib/shell.ts` — never JS git libraries
- GitHub operations: `gh` CLI with `--json` flags — never GitHub REST client libraries
- Config: TOML via `smol-toml` — loaded from `~/.config/gittui/config.toml`, merged with defaults
- Action registry (`src/state/actions.ts`): views register dialog handlers at mount,
  `global-keys.tsx` dispatches to them — decouples keyboard handling from view code

## Skills

Always load relevant skills before writing code. Multiple skills can apply at once.

| Skill | Trigger | Description |
|-------|---------|-------------|
| `opentui` | OpenTUI components, `<box>`, `<text>`, `<input>`, layout | Comprehensive OpenTUI reference — components, layout, keyboard, animations, testing |
| `terminal-ui` | TUI performance, CLI prompts, rendering | Terminal UI performance and UX guidelines for TypeScript apps |
| `interface-design` | Dashboards, admin panels, apps, tools | Interface design for interactive products (NOT marketing) |
| `systematic-debugging` | Bugs, test failures, unexpected behavior | Debug protocol: find root cause BEFORE proposing fixes |
| `verification-before-completion` | About to claim work is done | Run verification commands and confirm output before success claims |
