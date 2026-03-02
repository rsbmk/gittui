# Syntax Highlighting — Implementation Plan

Add syntax highlighting to all diff views using OpenTUI's built-in tree-sitter. The `<diff>` component already accepts `filetype` and `syntaxStyle` props — we just need to create the `SyntaxStyle` object from our theme definitions and wire everything together. Five predefined themes, partial overrides via TOML, and a Settings UI cycle field.

## Scope

- **In**: Filetype detection, 5 syntax themes, SyntaxStyle creation, diff.tsx wiring, config schema + defaults, Settings UI field, partial TOML overrides, unit tests
- **Out**: `<code>` component for full file viewing (future feature), custom theme JSON files, tree-sitter parser configuration

## Action items

- [ ] **1. Create filetype detection module** — `src/lib/syntax/filetype-map.ts`. Export `getFiletype(filePath: string): string | undefined` that maps file extensions to tree-sitter language names. Cover: ts/tsx, js/jsx, py, go, rs, rb, java, kt, swift, c/h, cpp/hpp, cs, css/scss, html, json, yaml/yml, toml, md, sh/bash/zsh, sql, lua, zig, dockerfile. Return `undefined` for unknown extensions.

- [ ] **2. Create 5 syntax theme definitions** — `src/lib/syntax/themes.ts`. Export each theme as `Record<string, StyleDefinition>` using `RGBA.fromHex()` from `@opentui/core`. Themes: `CATPPUCCIN_MOCHA`, `DRACULA`, `NORD`, `GITHUB_DARK`, `ONE_DARK`. Also export `SYNTAX_THEME_NAMES` const array and `SYNTAX_THEME` const object for the names. Each theme must define at minimum: `keyword`, `keyword.import`, `keyword.operator`, `string`, `comment`, `number`, `boolean`, `constant`, `function`, `function.call`, `type`, `constructor`, `variable`, `variable.member`, `property`, `operator`, `punctuation`, `punctuation.bracket`, `punctuation.delimiter`, `default`.

- [ ] **3. Create SyntaxStyle builder** — `src/lib/syntax/create-style.ts`. Export `buildSyntaxStyle(themeName: string, overrides?: Record<string, string>): SyntaxStyle | undefined`. Returns `undefined` when `themeName === "none"`. Looks up the theme definition, applies hex overrides by converting them to `RGBA.fromHex()`, then calls `SyntaxStyle.fromStyles(merged)`. Unknown theme names fall back to `catppuccin-mocha`.

- [ ] **4. Update config schema** — `src/core/config/schema.ts`. Add `syntax_theme: string` to `DiffConfig`. Add new optional top-level `SyntaxConfig` interface with `overrides: Record<string, string>` and add `syntax?: SyntaxConfig` to `GuitConfig`.

- [ ] **5. Update config defaults** — `src/core/config/defaults.ts`. Add `syntax_theme: "catppuccin-mocha"` to `diff` section. Add `syntax: { overrides: {} }` to top level.

- [ ] **6. Wire SyntaxStyle into state** — `src/state/config.ts`. Import `buildSyntaxStyle` and `SyntaxStyle` type. Create a derived reactive signal `syntaxStyle` that calls `buildSyntaxStyle(config().diff.syntax_theme, config().syntax?.overrides)`. Export it. Add side effect in `updateConfigField` for `syntax_theme` changes to rebuild the style. Initialize in `initConfig()`.

- [ ] **7. Wire filetype + syntaxStyle into DiffView** — `src/ui/views/diff.tsx`. Import `getFiletype` and the `syntaxStyle` signal from state. Derive `filetype` from `fileDiff().path` using `getFiletype`. Pass both `filetype` and `syntaxStyle()` as props to the `<diff>` component. Only pass when `syntaxStyle()` is not undefined (i.e., not "none").

- [ ] **8. Add Settings UI field** — `src/ui/views/settings-fields.ts`. Add a `CYCLE` field for `syntax_theme` in the `diff` section with options: `["catppuccin-mocha", "dracula", "nord", "github-dark", "one-dark", "none"]`.

- [ ] **9. Write unit tests** — `src/lib/__tests__/filetype-map.test.ts` and `src/lib/__tests__/syntax-style.test.ts`. Test `getFiletype`: known extensions, unknown extension returns undefined, no extension returns undefined, case insensitivity, dotfiles. Test `buildSyntaxStyle`: returns SyntaxStyle for valid theme, returns undefined for "none", falls back to catppuccin-mocha for unknown theme, applies overrides correctly.

- [ ] **10. Typecheck + manual verification** — Run `bun run typecheck`. Manually verify highlighting works on TypeScript, Python, Go, and Rust diffs with each theme. Verify "none" disables highlighting. Verify TOML overrides apply.

## Open questions

- Does OpenTUI's tree-sitter automatically download/cache parser WASM files, or do we need to configure `TreeSitterClient`? If the `<diff>` component handles this internally (likely since it accepts `filetype` directly), no extra setup needed.
- How does `SyntaxStyle.fromStyles()` handle missing token names gracefully? The `default` token should cover fallback but we should verify.
