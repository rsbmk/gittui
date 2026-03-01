# Settings UI Design

Expose all `GuitConfig` fields through an interactive Settings tab so users can modify configuration from the UI with live preview. The TOML config file remains the source of truth for portability.

## Decisions

- **New tab**: `settings` (key `6`) — consistent with the existing tab system
- **Layout**: Sidebar (sections) + main panel (fields) — same pattern as all other views
- **Live apply**: Changes update the Solid signal instantly and persist to TOML. No save button.
- **Keybindings custom overrides**: Not editable from UI (TOML only). Only the preset selector is exposed.
- **AI agent selector**: Runs `which` detection on mount, marks unavailable agents with `✗`.
- **Config file access**: Shows path at bottom of sidebar, `e` opens in `$EDITOR` (fallback `vi`).

## Config Fields (13 total, 5 sections)

### `[general]` — 4 fields

| Field | Control | Options/Range |
|---|---|---|
| `theme` | cycle | `default-dark`, `catppuccin-mocha`, `nord`, `tokyo-night` |
| `sidebar_width` | stepper | 15–60, step 5 |
| `sidebar_collapsed` | toggle | — |
| `default_tab` | cycle | `files`, `branches`, `commits`, `stash`, `prs` |

### `[keybindings]` — 1 field (exposed)

| Field | Control | Options/Range |
|---|---|---|
| `preset` | cycle | `vim`, `emacs`, `custom` |

`custom` overrides are TOML-only (key-value editor is out of scope).

### `[diff]` — 4 fields

| Field | Control | Options/Range |
|---|---|---|
| `view` | cycle | `unified`, `split` |
| `context_lines` | stepper | 1–20, step 1 |
| `word_diff` | toggle | — |
| `show_line_numbers` | toggle | — |

### `[github]` — 1 field

| Field | Control | Options/Range |
|---|---|---|
| `auto_fetch_prs` | toggle | — |

### `[ai]` — 2 fields

| Field | Control | Options/Range |
|---|---|---|
| `agent` | cycle | Installed agents (detected via `which`) + `none` |
| `commit_prompt` | readonly | Shows path or `(default)` |

## Controls

**Toggle** (`[✓]` / `[ ]`): For booleans. Enter or Space toggles.

**Cycle selector** (`◂ value ▸`): For enum-like fields. Enter or left/right arrows cycle through options.

**Number stepper** (`◂ 30 ▸`): For numeric fields with min/max/step. Left/right or +/- to adjust.

**Readonly**: Displays value but not editable. For fields better edited in TOML (e.g., file paths).

## Visual Layout

```
┌─ Settings ──────────────────────────────────────────────────┐
│ Sidebar (w=20)       │ Main Panel                          │
│                      │                                     │
│ ▸ General            │ Theme        ◂ catppuccin-mocha ▸   │
│   Keybindings        │ Sidebar Width        ◂ 30 ▸        │
│   Diff               │ Sidebar Collapsed       [ ]        │
│   GitHub             │ Default Tab     ◂ files ▸          │
│   AI                 │                                     │
│                      │                                     │
│                      │                                     │
│ ~/.config/guit/      │                                     │
│   config.toml        │                                     │
│ [e] open in editor   │                                     │
└──────────────────────┴─────────────────────────────────────┘
```

## Navigation

- **Sidebar**: `j`/`k` moves between sections, `Enter`/`l` focuses main panel
- **Main panel**: `j`/`k` moves between fields, `h` returns to sidebar
- **Controls**: `Enter`/`Space` toggles booleans, `Enter`/`←`/`→` cycles selectors, `←`/`→`/`+`/`-` adjusts steppers

## Data Flow

```
User interacts with control
  → updateConfigField(section, field, value)
  → setConfig() updates Solid signal (instant UI reaction)
  → saveConfig() writes to ~/.config/guit/config.toml
  → Side effects dispatched per field
```

### Side Effects

| Field | Effect |
|---|---|
| `theme` | `loadTheme()` → `setTheme()` (full app re-render with new colors) |
| `sidebar_width` | `setSidebarWidth()` (instant layout change) |
| `sidebar_collapsed` | `setSidebarVisible(!collapsed)` (toggle sidebar) |
| `default_tab` | Persist only (applies on next launch) |
| `preset` | `initKeybindings(newPreset, custom)` (reload keybinding registry) |
| `diff.*` | Persist only (diff view reads from `config()` signal) |
| `github.*` | Persist only |
| `ai.agent` | Persist only |

## Field Definition (Declarative)

```typescript
interface FieldDef {
  key: string
  label: string
  type: "toggle" | "cycle" | "stepper" | "readonly"
  options?: string[]
  range?: { min: number; max: number; step: number }
  getValue: () => unknown
  formatValue?: (v: unknown) => string
}
```

Each section defines its fields as an array of `FieldDef`. The `ConfigField` component renders the correct control based on `type`.

## File Structure

### New files

```
src/ui/views/settings.tsx                — SettingsView orchestrator
src/ui/components/settings/
  section-sidebar.tsx                    — Section list with j/k navigation
  config-field.tsx                       — Generic field row (label + control)
  toggle-control.tsx                     — [✓]/[ ] for booleans
  cycle-control.tsx                      — ◂ value ▸ for enums
  stepper-control.tsx                    — ◂ N ▸ for numbers with range
```

### Modified files

```
src/state/ui.ts                          — Add "settings" to TAB_ID + TAB_ORDER
src/state/config.ts                      — Add updateConfigField() with side effects
src/state/keybindings.ts                 — Add key "6" → switchTab:settings
src/ui/layout/main-panel.tsx             — Add <Match> for settings tab
src/ui/layout/sidebar.tsx                — Add <Match> for settings tab
src/ui/layout/keybinding-bar.tsx         — Add settings to PRIORITY_ACTIONS
```

## Error Handling

- **`saveConfig()` failure**: Show `showStatusMessage("Failed to save config")`. Signal already updated; file not. User can retry or edit TOML manually.
- **Theme not found**: `loadTheme()` falls back to `default-dark`. No extra handling needed.
- **AI agent uninstalled**: Shows as `(not found)`, user can change to another.
- **`$EDITOR` undefined**: Fallback to `vi`. Spawn failure shows status message.
- **Values out of range**: Steppers clamp to defined min/max.
- **Config file deleted externally**: `ensureConfigDir()` + `Bun.write()` recreates it on save.
