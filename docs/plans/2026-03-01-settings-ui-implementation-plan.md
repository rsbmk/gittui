# Settings UI — Implementation Plan

Based on [Settings UI Design](./2026-03-01-settings-ui-design.md).

## Overview

Add a `settings` tab (key `6`) that exposes all 13 `GuitConfig` fields through an interactive UI with live apply + TOML persistence. Five phases, each independently committable.

---

## Phase 1 — Tab Registration + Empty Shell

**Goal**: Wire `settings` into the tab system so pressing `6` shows an empty Settings view. Validates that the plumbing works end-to-end before building any settings UI.

### Files to modify

#### `src/state/ui.ts`
- Add `SETTINGS: "settings"` to the `TAB_ID` const object
- Add `TAB_ID.SETTINGS` to the end of the `TAB_ORDER` array
- The `TabId` type derives automatically from the const object — no extra change needed

```typescript
export const TAB_ID = {
  FILES: "files",
  BRANCHES: "branches",
  COMMITS: "commits",
  STASH: "stash",
  PRS: "prs",
  SETTINGS: "settings",
} as const
```

#### `src/state/keybindings.ts`
- Add key `6` → `switchTab:settings` to both `VIM_BINDINGS` and `EMACS_BINDINGS` global sections (after the `5` → `switchTab:prs` entry)

```typescript
{ key: "6", action: "switchTab:settings", context: "global", description: "Settings tab" },
```

#### `src/ui/layout/global-keys.tsx`
- Add `"6": TAB_ID.SETTINGS` to the `KEY_TO_TAB` mapping
- Add a `case TAB_ID.SETTINGS: return 0` to `currentListLength()`, `getSelectedIndex()`, and a no-op to `setCurrentSelectedIndex()` (settings uses its own navigation — Phase 3)

#### `src/ui/layout/main-panel.tsx`
- Import `SettingsView` from `../views/settings.tsx`
- Add `{ id: TAB_ID.SETTINGS, label: "Settings" }` to the `TABS` array
- Add a `<Match when={activeTab() === TAB_ID.SETTINGS}>` block wrapping `<ViewBoundary name="Settings"><SettingsView /></ViewBoundary>`

#### `src/ui/layout/sidebar.tsx`
- Add a `<Show when={activeTab() === TAB_ID.SETTINGS}>` block that renders `<SettingsSidebar />` from `../components/settings/section-sidebar.tsx`
- For this phase, render a placeholder: `<text fg="#6c7086"> Settings sections</text>`

#### `src/ui/layout/keybinding-bar.tsx`
- Add `settings: ["switchPanel", "quit"]` to `PRIORITY_ACTIONS`

### New files

#### `src/ui/views/settings.tsx`
- Empty shell component following the view pattern:

```typescript
// src/ui/views/settings.tsx
// Settings tab view — interactive config editor with live preview

export function SettingsView() {
  return (
    <box flexDirection="column" flexGrow={1}>
      <text fg="#6c7086"> Settings view (coming soon)</text>
    </box>
  )
}
```

### Patterns to follow
- `TAB_ID` const object pattern from `src/state/ui.ts:8-14` — add entry, type derives automatically
- `<Switch>/<Match>` dispatch in `src/ui/layout/main-panel.tsx:41-67` — add new `<Match>` case
- `<Show when={...}>` conditional in `src/ui/layout/sidebar.tsx:88-155` — add new `<Show>` block
- `KEY_TO_TAB` mapping in `src/ui/layout/global-keys.tsx:98-104` — add number key mapping

### Verification
```bash
bun run typecheck        # No type errors
bun run dev              # Press 6 → empty Settings tab appears, tab bar shows "Settings"
```

---

## Phase 2 — Field Definitions + Config Mutation

**Goal**: Define all 13 config fields declaratively with their control types, options, and ranges. Add `updateConfigField()` to `src/state/config.ts` that updates the signal, persists to TOML, and dispatches field-specific side effects. This is the data layer — no UI controls yet.

### New types

#### `src/ui/views/settings-fields.ts`

Define the `FieldDef` interface and all section definitions:

```typescript
// src/ui/views/settings-fields.ts
// Declarative field definitions for the settings view

import type { GuitConfig } from "../../core/config/schema.ts"

// ── Field Types ──────────────────────────────────────────────

export const FIELD_TYPE = {
  TOGGLE: "toggle",
  CYCLE: "cycle",
  STEPPER: "stepper",
  READONLY: "readonly",
} as const

export type FieldType = (typeof FIELD_TYPE)[keyof typeof FIELD_TYPE]

// ── Field Definition ─────────────────────────────────────────

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  section: string
  options?: string[]
  range?: { min: number; max: number; step: number }
  getValue: (config: GuitConfig) => unknown
  formatValue?: (v: unknown) => string
}

// ── Section Definition ───────────────────────────────────────

export interface SectionDef {
  id: string
  label: string
  fields: FieldDef[]
}
```

Define all 5 sections with their fields:

- **General** (4 fields): `theme` (cycle, options from `getBuiltinThemeNames()`), `sidebar_width` (stepper, 15–60 step 5), `sidebar_collapsed` (toggle), `default_tab` (cycle, `["files","branches","commits","stash","prs"]`)
- **Keybindings** (1 field): `preset` (cycle, `["vim","emacs","custom"]`)
- **Diff** (4 fields): `view` (cycle), `context_lines` (stepper, 1–20 step 1), `word_diff` (toggle), `show_line_numbers` (toggle)
- **GitHub** (1 field): `auto_fetch_prs` (toggle)
- **AI** (2 fields): `agent` (cycle, populated dynamically), `commit_prompt` (readonly)

Export a `SETTINGS_SECTIONS` array and a `getAllFields()` helper.

### Files to modify

#### `src/state/config.ts`
- Add `updateConfigField(section, field, value)` function
- Implementation:
  1. Clone current config via `structuredClone(config())`
  2. Set `clone[section][field] = value`
  3. Call `setConfig(clone)` (instant UI reaction)
  4. Call `saveConfig(clone)` (async, fire-and-forget with error handling)
  5. Dispatch side effects based on which field changed:
     - `general.theme` → `loadTheme(value)` then `setTheme(result)`
     - `general.sidebar_width` → `setSidebarWidth(value)`
     - `general.sidebar_collapsed` → `setSidebarVisible(!value)`
     - `keybindings.preset` → `initKeybindings(value, config().keybindings.custom)`
     - All other fields → persist only (no immediate side effect)
  6. Catch `saveConfig` errors → `showStatusMessage("Failed to save config")`

```typescript
export async function updateConfigField(
  section: keyof GuitConfig,
  field: string,
  value: unknown,
): Promise<void> {
  const prev = config()
  const next = structuredClone(prev)
  ;(next[section] as Record<string, unknown>)[field] = value
  setConfig(next)

  // Side effects
  if (section === "general" && field === "theme") {
    const themeData = await loadTheme(value as string)
    setTheme(themeData)
  }
  if (section === "general" && field === "sidebar_width") {
    setSidebarWidth(value as number)
  }
  if (section === "general" && field === "sidebar_collapsed") {
    setSidebarVisible(!(value as boolean))
  }
  if (section === "keybindings" && field === "preset") {
    initKeybindings(value as KeybindingPreset, next.keybindings.custom)
  }

  try {
    await saveConfig(next)
  } catch {
    showStatusMessage("Failed to save config")
  }
}
```

### New tests

#### `src/state/__tests__/config-update.test.ts`
- Test `updateConfigField` updates the signal correctly for each field type
- Test side effects fire (mock `setSidebarWidth`, verify it's called)
- Test `saveConfig` error path shows status message
- Use `setConfigPaths()` with a temp dir to avoid touching real config
- Follow the pattern from existing core tests: `beforeEach` creates temp dir, `afterEach` cleans up

### Patterns to follow
- Const object + type extraction for `FIELD_TYPE` — same as `FILE_STATUS` in `src/core/git/types.ts`
- `structuredClone` + `setConfig` pattern — already used in `global-keys.tsx:303-306`
- `saveConfig` from `src/core/config/loader.ts:90` — async, fire-and-forget
- `showStatusMessage` from `src/state/ui.ts:82` — for error feedback
- `loadTheme` + `setTheme` chain from `src/state/config.ts:61-62`

### Verification
```bash
bun run typecheck
bun test src/state/__tests__/config-update
```

---

## Phase 3 — Settings Controls (UI Components)

**Goal**: Build the three interactive control components (`ToggleControl`, `CycleControl`, `StepperControl`) plus the `ConfigField` row wrapper and `SectionSidebar` navigator. These are pure presentational components — they receive values and callbacks, no direct config access.

### New files

#### `src/ui/components/settings/toggle-control.tsx`
- Renders `[✓]` or `[ ]`
- Props: `value: boolean`, `focused: boolean`, `onToggle: () => void`
- When focused, highlight with `color("accent")`
- Keyboard: Enter or Space toggles (handled by parent, not this component)

```typescript
interface ToggleControlProps {
  value: boolean
  focused: boolean
}

export function ToggleControl(props: ToggleControlProps) {
  return (
    <text fg={props.focused ? color("accent") : color("fg")}>
      {props.value ? "[✓]" : "[ ]"}
    </text>
  )
}
```

#### `src/ui/components/settings/cycle-control.tsx`
- Renders `◂ value ▸`
- Props: `value: string`, `options: string[]`, `focused: boolean`
- When focused, arrows are highlighted with `color("accent")`

```typescript
interface CycleControlProps {
  value: string
  options: string[]
  focused: boolean
}

export function CycleControl(props: CycleControlProps) {
  return (
    <box flexDirection="row">
      <text fg={props.focused ? color("accent") : color("muted")}>{"◂ "}</text>
      <text fg={props.focused ? color("accent") : color("fg")}>{props.value}</text>
      <text fg={props.focused ? color("accent") : color("muted")}>{" ▸"}</text>
    </box>
  )
}
```

#### `src/ui/components/settings/stepper-control.tsx`
- Renders `◂ N ▸`
- Props: `value: number`, `min: number`, `max: number`, `focused: boolean`
- Same visual as cycle but for numbers

```typescript
interface StepperControlProps {
  value: number
  min: number
  max: number
  focused: boolean
}

export function StepperControl(props: StepperControlProps) {
  return (
    <box flexDirection="row">
      <text fg={props.focused ? color("accent") : color("muted")}>{"◂ "}</text>
      <text fg={props.focused ? color("accent") : color("fg")}>{String(props.value)}</text>
      <text fg={props.focused ? color("accent") : color("muted")}>{" ▸"}</text>
    </box>
  )
}
```

#### `src/ui/components/settings/config-field.tsx`
- Generic field row: renders label (left-aligned) + control (right-aligned)
- Props: `field: FieldDef`, `value: unknown`, `focused: boolean`
- Uses `<Switch>/<Match>` on `field.type` to render the correct control
- `formatValue` applied when present (e.g. for `commit_prompt` showing path or "(default)")
- Readonly fields render plain text with `color("muted")`

```typescript
interface ConfigFieldProps {
  field: FieldDef
  value: unknown
  focused: boolean
}

export function ConfigField(props: ConfigFieldProps) {
  const displayValue = () => {
    const v = props.value
    return props.field.formatValue ? props.field.formatValue(v) : String(v ?? "")
  }

  return (
    <box flexDirection="row" width="100%">
      <text fg={props.focused ? color("accent") : color("fg")}>
        {props.focused ? " ▸ " : "   "}{props.field.label}
      </text>
      <box flexGrow={1} />
      <Switch>
        <Match when={props.field.type === FIELD_TYPE.TOGGLE}>
          <ToggleControl value={props.value as boolean} focused={props.focused} />
        </Match>
        <Match when={props.field.type === FIELD_TYPE.CYCLE}>
          <CycleControl
            value={displayValue()}
            options={props.field.options ?? []}
            focused={props.focused}
          />
        </Match>
        <Match when={props.field.type === FIELD_TYPE.STEPPER}>
          <StepperControl
            value={props.value as number}
            min={props.field.range?.min ?? 0}
            max={props.field.range?.max ?? 100}
            focused={props.focused}
          />
        </Match>
        <Match when={props.field.type === FIELD_TYPE.READONLY}>
          <text fg={color("muted")}>{displayValue()}</text>
        </Match>
      </Switch>
    </box>
  )
}
```

#### `src/ui/components/settings/section-sidebar.tsx`
- Renders the list of section names with j/k navigation marker `▸`
- Props: `sections: SectionDef[]`, `selectedIndex: number`, `onSelect: (idx: number) => void`
- Also renders config file path at bottom + `[e] open in editor` hint
- Uses `getConfigPaths()` from `src/core/config/loader.ts` for the path display

```typescript
interface SectionSidebarProps {
  sections: SectionDef[]
  selectedIndex: number
}

export function SectionSidebar(props: SectionSidebarProps) {
  const { configFile } = getConfigPaths()

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="column" flexGrow={1}>
        <For each={props.sections}>
          {(section, idx) => (
            <text fg={idx() === props.selectedIndex ? color("accent") : color("fg")}>
              {idx() === props.selectedIndex ? " ▸ " : "   "}{section.label}
            </text>
          )}
        </For>
      </box>
      <box flexDirection="column">
        <text fg={color("muted")}> {configFile}</text>
        <text fg={color("muted")}> <text fg={color("accent")}>[e]</text> open in editor</text>
      </box>
    </box>
  )
}
```

### Patterns to follow
- Props interface named `{Component}Props`, defined in same file — e.g. `SectionSidebarProps`
- Access `props.x` without destructuring — Solid.js convention per AGENTS.md
- `color()` accessor from `src/state/config.ts:51` for all theme colors
- `<Switch>/<Match>` for type dispatch — same as `main-panel.tsx:41`
- `<For each={...}>` for lists — same as `sidebar.tsx:149`
- No semicolons, double quotes, trailing commas

### Verification
```bash
bun run typecheck       # All new component files type-check
bun run dev             # Visual: components don't crash (rendered by Phase 4)
```

---

## Phase 4 — Settings View Orchestration + Keyboard Navigation

**Goal**: Wire the `SettingsView` component to render sections in the sidebar and fields in the main panel. Add keyboard navigation: j/k moves between fields, h/l switches sidebar↔main, Enter/Space/←/→ manipulates controls, `e` opens config in `$EDITOR`.

### Files to modify

#### `src/ui/views/settings.tsx` (rewrite from shell)
- Import `SETTINGS_SECTIONS` from `./settings-fields.ts`
- Local signals: `[sectionIndex, setSectionIndex]` (which section is highlighted in sidebar), `[fieldIndex, setFieldIndex]` (which field is focused in main panel), `[focus, setFocus]` for sidebar vs main panel
- Use `createEffect` to reset `fieldIndex` to 0 when `sectionIndex` changes
- Render `<SectionSidebar>` content for the sidebar via the `settings` branch in `sidebar.tsx`
- Render `<For each={currentSection().fields}>` with `<ConfigField>` for the main panel
- Export `settingsSectionIndex`, `setSettingsSectionIndex`, `settingsFieldIndex`, `setSettingsFieldIndex` for global-keys integration

Keyboard handling via the settings context in global-keys:

```
Sidebar focused:
  j/k → move section index (clamp 0..sections.length-1)
  Enter/l → focus main panel, fieldIndex = 0
  e → open config in $EDITOR

Main panel focused:
  j/k → move field index (clamp 0..fields.length-1)
  h → focus sidebar
  Enter/Space → toggle (boolean), cycle next (cycle)
  ←/→ → cycle prev/next (cycle), step down/up (stepper)
  +/- → step up/down (stepper)
```

#### `src/ui/layout/sidebar.tsx`
- Replace the Phase 1 placeholder `<Show>` with the real `<SectionSidebar>` component
- Import `SectionSidebar` from `../components/settings/section-sidebar.tsx`
- Import `SETTINGS_SECTIONS` and settings index signals from `../views/settings.tsx`

#### `src/ui/layout/global-keys.tsx`
- Import settings-specific signals and field definitions
- Add `TAB_ID.SETTINGS` case to `currentListLength()` — returns field count for current section (main panel) or section count (sidebar)
- Add `TAB_ID.SETTINGS` case to `getSelectedIndex()` / `setCurrentSelectedIndex()` — route to settings-specific signals
- Add settings-specific key handlers for Enter/Space/←/→/+/- when `activeTab() === TAB_ID.SETTINGS && activePanel() === PANEL.MAIN`
- Add `e` key handler in settings tab for opening config in `$EDITOR`:

```typescript
// Open in $EDITOR
if (key.name === "e" && activeTab() === TAB_ID.SETTINGS) {
  const editor = process.env.EDITOR ?? "vi"
  const { configFile } = getConfigPaths()
  Bun.spawn([editor, configFile], { stdio: ["inherit", "inherit", "inherit"] })
  return
}
```

#### Control interaction logic (in global-keys or settings.tsx)

```typescript
function handleSettingsInteraction(action: "toggle" | "next" | "prev"): void {
  const section = SETTINGS_SECTIONS[sectionIndex()]
  const field = section?.fields[fieldIndex()]
  if (!field) return

  const currentValue = field.getValue(config())

  switch (field.type) {
    case FIELD_TYPE.TOGGLE:
      if (action === "toggle") {
        updateConfigField(field.section, field.key, !currentValue)
      }
      break

    case FIELD_TYPE.CYCLE: {
      const options = field.options ?? []
      const idx = options.indexOf(String(currentValue))
      const nextIdx = action === "prev"
        ? (idx - 1 + options.length) % options.length
        : (idx + 1) % options.length
      updateConfigField(field.section, field.key, options[nextIdx])
      break
    }

    case FIELD_TYPE.STEPPER: {
      const { min, max, step } = field.range ?? { min: 0, max: 100, step: 1 }
      const num = currentValue as number
      const next = action === "prev"
        ? Math.max(min, num - step)
        : Math.min(max, num + step)
      updateConfigField(field.section, field.key, next)
      break
    }
  }
}
```

Key mapping in GlobalKeyHandler:
- `Enter`/`Space` → `handleSettingsInteraction("toggle")` (for toggles) or `handleSettingsInteraction("next")` (for cycles)
- `→` / `+` → `handleSettingsInteraction("next")`
- `←` / `-` → `handleSettingsInteraction("prev")`

### Files to modify (summary)
- `src/ui/views/settings.tsx` — full orchestration component
- `src/ui/views/settings-fields.ts` — no changes (from Phase 2)
- `src/ui/layout/sidebar.tsx` — replace placeholder with real component
- `src/ui/layout/global-keys.tsx` — settings navigation + control interactions
- `src/ui/layout/keybinding-bar.tsx` — update settings priority actions:

```typescript
settings: ["switchPanel", "quit"],
```

### Patterns to follow
- `onMount` + `registerAction` / `onCleanup` + `unregisterAction` from `branches.tsx:102-115`
- `createSignal` for view-local state, exported for global-keys — same as `branches.tsx:25-26`
- `createEffect` for derived state reset — same as `files.tsx:28-46`
- `activePanel()` check for sidebar vs main in `global-keys.tsx:351-367`
- `Bun.spawn` for `$EDITOR` — same pattern as `src/lib/shell.ts`

### Verification
```bash
bun run typecheck
bun run dev
```

Manual test checklist:
- [ ] Press `6` → Settings tab with sections in sidebar, fields in main panel
- [ ] `j`/`k` navigates sections in sidebar, fields in main panel
- [ ] `Tab` / `h` / `l` switches between sidebar and main panel
- [ ] `Enter`/`Space` toggles booleans (`sidebar_collapsed`, `word_diff`, `show_line_numbers`, `auto_fetch_prs`)
- [ ] `←`/`→` cycles theme, preset, diff view, default_tab
- [ ] `←`/`→` / `+`/`-` adjusts sidebar_width (step 5) and context_lines (step 1)
- [ ] Theme change applies immediately (colors change)
- [ ] Sidebar width change applies immediately (layout shifts)
- [ ] Sidebar collapsed toggles sidebar visibility
- [ ] Keybinding preset change takes effect immediately (try switching to emacs, verify ctrl+n works)
- [ ] `e` opens config file in `$EDITOR`
- [ ] Config persists: restart guit and verify changes stuck

---

## Phase 5 — AI Agent Detection + Polish

**Goal**: Wire the AI agent cycle control to use live `which` detection, show availability markers, handle the `commit_prompt` readonly display, and add settings-specific keybinding hints. Final polish pass.

### Dynamic agent options

In `settings-fields.ts`, the AI `agent` field needs dynamic options based on `detectInstalledAgents()`. Options pattern:

- On `SettingsView` mount, call `detectInstalledAgents()` and store results in a signal
- Build the options array as `["none", ...installedIds]` with display formatting showing availability:
  - Installed: `claude` → `"claude"`
  - All known agents listed, unavailable ones shown as `"codex ✗"` in the formatter

```typescript
// In settings.tsx onMount:
const [installedAgents, setInstalledAgents] = createSignal<AgentDefinition[]>([])

onMount(async () => {
  const detected = await detectInstalledAgents()
  setInstalledAgents(detected)
})
```

The `agent` field's `options` and `formatValue` need to be dynamic — this means the field definitions for the AI section are computed, not static. Use a `createMemo` that rebuilds the AI section fields when `installedAgents` changes.

### Commit prompt display

The `commit_prompt` readonly field shows:
- `(default)` when `config().ai.commit_prompt` is `null`
- The file path when set

```typescript
formatValue: (v) => (v as string | null) ?? "(default)"
```

### Keybinding hints update

#### `src/ui/layout/keybinding-bar.tsx`
- Define `SETTINGS_BINDINGS` in keybindings.ts for the settings context:

```typescript
const SETTINGS_BINDINGS: Keybinding[] = [
  { key: "enter", action: "settingsToggle", context: "settings", description: "Toggle/Select" },
  { key: "left", action: "settingsPrev", context: "settings", description: "Previous" },
  { key: "right", action: "settingsNext", context: "settings", description: "Next" },
  { key: "e", action: "openEditor", context: "settings", description: "Edit config" },
]
```

- Update `PRIORITY_ACTIONS` in keybinding-bar:

```typescript
settings: ["settingsToggle", "settingsPrev", "settingsNext", "openEditor", "switchPanel", "quit"],
```

### Edge cases to handle
- **Theme not found**: `loadTheme()` already falls back to `default-dark` — no extra handling
- **Stepper clamping**: Always clamp to `[min, max]` — already handled by `Math.min`/`Math.max`
- **Agent "none" selected**: Set `config.ai.agent` to `null` when "none" is chosen
- **$EDITOR not set**: Fallback to `"vi"` — `process.env.EDITOR ?? "vi"`
- **Config file deleted**: `ensureConfigDir()` + `Bun.write()` in `saveConfig()` recreates it
- **saveConfig failure**: `showStatusMessage("Failed to save config")` — already in `updateConfigField`

### Files to modify
- `src/ui/views/settings.tsx` — add agent detection, commit_prompt display
- `src/ui/views/settings-fields.ts` — make AI section fields dynamic (or compute in view)
- `src/state/keybindings.ts` — add `SETTINGS_BINDINGS` array, include in both presets
- `src/ui/layout/keybinding-bar.tsx` — update `PRIORITY_ACTIONS` for settings

### Verification
```bash
bun run typecheck
bun run dev
```

Manual test checklist:
- [ ] AI agent cycle shows only installed agents + "none"
- [ ] Uninstalled agents not selectable
- [ ] `commit_prompt` shows `(default)` or the configured path
- [ ] Keybinding bar updates with settings-specific hints when on settings tab
- [ ] Full end-to-end: change theme → change sidebar width → toggle sidebar → switch keybinding preset → change diff context lines → all persist and apply live

---

## File Summary

### New files (7)
| File | Phase | Purpose |
|------|-------|---------|
| `src/ui/views/settings.tsx` | 1→4 | View orchestrator (shell in P1, full in P4) |
| `src/ui/views/settings-fields.ts` | 2 | Declarative field + section definitions |
| `src/ui/components/settings/toggle-control.tsx` | 3 | `[✓]`/`[ ]` boolean control |
| `src/ui/components/settings/cycle-control.tsx` | 3 | `◂ value ▸` enum selector |
| `src/ui/components/settings/stepper-control.tsx` | 3 | `◂ N ▸` numeric stepper |
| `src/ui/components/settings/config-field.tsx` | 3 | Generic field row (label + control) |
| `src/ui/components/settings/section-sidebar.tsx` | 3 | Section list with j/k nav |

### Modified files (7)
| File | Phase | Change |
|------|-------|--------|
| `src/state/ui.ts` | 1 | Add `SETTINGS` to `TAB_ID` + `TAB_ORDER` |
| `src/state/keybindings.ts` | 1, 5 | Add key `6` binding + settings context bindings |
| `src/state/config.ts` | 2 | Add `updateConfigField()` with side effects |
| `src/ui/layout/main-panel.tsx` | 1 | Add `<Match>` for settings tab |
| `src/ui/layout/sidebar.tsx` | 1, 4 | Add settings sidebar (placeholder → real) |
| `src/ui/layout/keybinding-bar.tsx` | 1, 5 | Add settings to `PRIORITY_ACTIONS` |
| `src/ui/layout/global-keys.tsx` | 1, 4 | Add settings tab switching + field navigation |

### New test files (1)
| File | Phase | Purpose |
|------|-------|---------|
| `src/state/__tests__/config-update.test.ts` | 2 | Tests for `updateConfigField()` + side effects |

---

## Dependency Graph

```
Phase 1 (plumbing)
    ↓
Phase 2 (data layer)
    ↓
Phase 3 (UI controls) ← independent of Phase 2, but logically after
    ↓
Phase 4 (wiring) ← depends on Phase 2 + 3
    ↓
Phase 5 (polish) ← depends on Phase 4
```

Phases 2 and 3 have no code dependency on each other and could technically be built in parallel, but logically Phase 2 first ensures the data contract is stable before building UI that consumes it.
