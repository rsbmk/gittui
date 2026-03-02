# Syntax Highlighting Design

## Goal

Add syntax highlighting to all code and diff views across guit using OpenTUI's built-in tree-sitter integration. Support 5 predefined themes, a configurable theme selector, and partial token overrides via TOML.

## Research Summary

### How other tools do it

| Tool | Engine | Approach |
|---|---|---|
| **delta** | `syntect` (Rust, TextMate grammars) | Processes each diff line, applies syntax colors as foreground over diff background colors |
| **bat** | `syntect` (same as delta) | Full file highlighting |
| **lazygit** | Delegates to `delta` or `diff-so-fancy` | No built-in highlighting — pipes to external pager |
| **opencode** | OpenTUI `<diff>` + tree-sitter | Uses OpenTUI's native `<diff>` component which already supports syntax highlighting |

### Key finding

OpenTUI's `<diff>` component already accepts `filetype` and `syntaxStyle` props. Internally it uses **tree-sitter** (same engine as Neovim, Helix, Zed) for parsing and token coloring. We are simply not passing these props.

```typescript
// Already in node_modules/@opentui/core/renderables/Diff.d.ts
interface DiffRenderableOptions {
  diff?: string
  filetype?: string
  syntaxStyle?: SyntaxStyle
  treeSitterClient?: TreeSitterClient
  // ...existing color props we already use
}
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where highlighting appears | Everywhere — all current and future code/diff views | Consistent UX |
| Highlighting engine | OpenTUI built-in tree-sitter | Zero external deps, already available |
| Predefined themes | Catppuccin Mocha, Dracula, Nord, GitHub Dark, One Dark | Popular, covers warm/cool/neutral preferences |
| Default theme | `catppuccin-mocha` | Matches existing app color scheme |
| Custom themes | Partial override of active theme tokens via TOML | Flexibility without complexity |
| Filetype detection | By file extension | Covers 99% of cases, instant, zero overhead |
| Config field | `syntax_theme = "catppuccin-mocha"` / `"none"` to disable | Single field, simple |
| Settings UI | Cycle field in Diff section | Consistent with existing settings pattern |

## Architecture

### New files

```
src/lib/syntax/
  themes.ts            — 5 predefined themes as Record<string, StyleDefinition>
  filetype-map.ts      — extension → filetype mapping (ts, py, go, rs, etc.)
  create-style.ts      — buildSyntaxStyle(themeName, overrides?) → SyntaxStyle
```

### Modified files

```
src/core/config/schema.ts     — Add syntax_theme to DiffConfig, add SyntaxOverrides type
src/core/config/defaults.ts   — Default syntax_theme = "catppuccin-mocha"
src/state/config.ts           — Reactive SyntaxStyle signal derived from config
src/ui/views/diff.tsx          — Pass filetype + syntaxStyle to <diff>
src/ui/views/settings-fields.ts — Add syntax_theme cycle field to Diff section
```

### Data flow

```
config.toml
  └─ syntax_theme = "catppuccin-mocha"
  └─ [syntax.overrides] keyword = "#ff7b72"
       │
       ▼
state/config.ts (reactive signal)
  └─ buildSyntaxStyle(themeName, overrides)
       │
       ▼
SyntaxStyle.fromStyles(mergedStyles)
       │
       ▼
<diff filetype={ext} syntaxStyle={style} />
       │
       ▼
OpenTUI tree-sitter (internal parsing + coloring)
```

### Filetype detection

Simple extension-based mapping. The `filetype` is derived from the file path in the diff:

```typescript
const EXTENSION_MAP: Record<string, string> = {
  ts: "typescript", tsx: "tsx",
  js: "javascript", jsx: "jsx",
  py: "python",
  go: "go",
  rs: "rust",
  rb: "ruby",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c", h: "c",
  cpp: "cpp", hpp: "cpp",
  cs: "c_sharp",
  css: "css", scss: "css",
  html: "html",
  json: "json",
  yaml: "yaml", yml: "yaml",
  toml: "toml",
  md: "markdown",
  sh: "bash", bash: "bash", zsh: "bash",
  sql: "sql",
  lua: "lua",
  zig: "zig",
  dockerfile: "dockerfile",
  // ...extend as needed
}

function getFiletype(filePath: string): string | undefined {
  const ext = filePath.split(".").pop()?.toLowerCase()
  return ext ? EXTENSION_MAP[ext] : undefined
}
```

### Theme structure

Each theme is a `Record<string, StyleDefinition>` mapping tree-sitter token names to colors:

```typescript
const CATPPUCCIN_MOCHA: Record<string, StyleDefinition> = {
  keyword:                { fg: RGBA.fromHex("#cba6f7"), bold: true },
  "keyword.import":       { fg: RGBA.fromHex("#cba6f7"), bold: true },
  "keyword.operator":     { fg: RGBA.fromHex("#89dceb") },
  string:                 { fg: RGBA.fromHex("#a6e3a1") },
  comment:                { fg: RGBA.fromHex("#6c7086"), italic: true },
  number:                 { fg: RGBA.fromHex("#fab387") },
  boolean:                { fg: RGBA.fromHex("#fab387") },
  constant:               { fg: RGBA.fromHex("#fab387") },
  function:               { fg: RGBA.fromHex("#89b4fa") },
  "function.call":        { fg: RGBA.fromHex("#89b4fa") },
  type:                   { fg: RGBA.fromHex("#f9e2af") },
  constructor:            { fg: RGBA.fromHex("#f9e2af") },
  variable:               { fg: RGBA.fromHex("#cdd6f4") },
  "variable.member":      { fg: RGBA.fromHex("#89b4fa") },
  property:               { fg: RGBA.fromHex("#89b4fa") },
  operator:               { fg: RGBA.fromHex("#89dceb") },
  punctuation:            { fg: RGBA.fromHex("#bac2de") },
  "punctuation.bracket":  { fg: RGBA.fromHex("#bac2de") },
  "punctuation.delimiter":{ fg: RGBA.fromHex("#9399b2") },
  default:                { fg: RGBA.fromHex("#cdd6f4") },
}
```

### TOML config example

```toml
[diff]
syntax_theme = "catppuccin-mocha"

# Optional: override individual tokens from the active theme
[syntax.overrides]
keyword = "#ff7b72"
string = "#a5d6ff"
comment = "#8b949e"
```

### Supported token names for overrides

```
keyword, keyword.import, keyword.operator
string, comment, number, boolean, constant
function, function.call, function.method.call
type, constructor
variable, variable.member, property
operator, punctuation, punctuation.bracket, punctuation.delimiter
default
```

### Available themes

| Name | Config value | Description |
|---|---|---|
| Catppuccin Mocha | `catppuccin-mocha` | Warm pastels on dark background (default) |
| Dracula | `dracula` | Classic dark with purple and green accents |
| Nord | `nord` | Cool blue tones |
| GitHub Dark | `github-dark` | GitHub's dark theme |
| One Dark | `one-dark` | Atom's classic balanced theme |
| None | `none` | Disable syntax highlighting |

## Settings UI

A new `CYCLE` field in the **Diff** section:

```typescript
{
  key: "syntax_theme",
  label: "Syntax Theme",
  type: FIELD_TYPE.CYCLE,
  section: "diff",
  options: ["catppuccin-mocha", "dracula", "nord", "github-dark", "one-dark", "none"],
  getValue: (c) => c.diff.syntax_theme,
}
```

## Performance

- Tree-sitter parsers are loaded lazily by OpenTUI on first use per filetype
- `SyntaxStyle` object is created once and reused (reactive signal only rebuilds on config change)
- No impact on startup time — highlighting happens when a diff is viewed
- File extension lookup is O(1) hash map

## Testing

- Unit tests for `getFiletype()` — extension mapping, edge cases (no extension, unknown extension)
- Unit tests for `buildSyntaxStyle()` — base theme, with overrides, unknown theme fallback
- Manual verification of each theme on representative diffs (TypeScript, Python, Go, Rust)
