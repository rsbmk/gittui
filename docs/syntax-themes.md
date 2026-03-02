# Syntax Themes

gittui includes syntax highlighting for diffs powered by [tree-sitter](https://tree-sitter.github.io/tree-sitter/).
You can choose from 5 built-in themes, customize individual token colors, or disable highlighting entirely.

## Quick Start

### From the UI

Open gittui, go to the **Settings** tab (`5`), navigate to **Diff > Syntax Theme**, and cycle through the available themes with `Enter` or `l`.

### From the Config File

Edit `~/.config/gittui/config.toml`:

```toml
[diff]
syntax_theme = "catppuccin-mocha"
```

## Built-in Themes

| Theme              | Description                                      |
|--------------------|--------------------------------------------------|
| `catppuccin-mocha` | Warm pastel tones on a dark background (default) |
| `dracula`          | Classic purple/pink/green palette                |
| `nord`             | Cool arctic-blue tones                           |
| `github-dark`      | GitHub's dark mode colors                        |
| `one-dark`         | Atom One Dark inspired palette                   |
| `none`             | Disable syntax highlighting                      |

## Customizing a Theme

You can override individual token colors without creating a full theme.
Overrides apply **on top** of the selected theme — only the tokens you specify are replaced.

Edit `~/.config/gittui/config.toml`:

```toml
[diff]
syntax_theme = "dracula"

[syntax.overrides]
keyword = "#e06c75"
string = "#98c379"
comment = "#5c6370"
```

In this example, the Dracula theme is used as the base, but `keyword`, `string`, and `comment`
colors are replaced with custom values. All other tokens keep their Dracula defaults.

## Available Tokens

These are the tree-sitter token names you can customize. Each controls the color of a specific
syntax element:

| Token                  | What It Colors                              | Example                 |
|------------------------|---------------------------------------------|-------------------------|
| `keyword`              | Language keywords (bold)                    | `const`, `if`, `return` |
| `keyword.import`       | Import/export keywords                      | `import`, `from`        |
| `keyword.operator`     | Operator keywords                           | `in`, `typeof`, `new`   |
| `string`               | String literals                             | `"hello"`               |
| `comment`              | Comments (italic)                           | `// note`               |
| `number`               | Numeric literals                            | `42`, `3.14`            |
| `boolean`              | Boolean literals (bold)                     | `true`, `false`         |
| `constant`             | Named constants                             | `NULL`, `PI`            |
| `function`             | Function declarations (bold)                | `function foo()`        |
| `function.call`        | Function invocations                        | `foo()`                 |
| `function.method.call` | Method calls                                | `obj.foo()`             |
| `type`                 | Type names (bold)                           | `string`, `number`      |
| `constructor`          | Constructor names                           | `new Foo()`             |
| `variable`             | Variable names                              | `let x`                 |
| `variable.member`      | Object member access                        | `obj.x`                 |
| `property`             | Property names                              | `{ key: val }`          |
| `operator`             | Operators                                   | `+`, `===`, `=>`        |
| `punctuation`          | General punctuation                         | `(`, `)`, `;`           |
| `punctuation.bracket`  | Brackets                                    | `{`, `}`, `[`, `]`      |
| `punctuation.delimiter`| Delimiters (dim)                            | `,`, `.`                |
| `default`              | Fallback for unmatched tokens               | —                       |

> Token names use tree-sitter's naming convention. More specific tokens (e.g. `keyword.import`)
> take precedence over their parent (e.g. `keyword`) when both are defined.

## Creating a Custom Theme

To create a fully custom theme, use any built-in theme as a base and override all 19 tokens.

### Step-by-Step

1. **Pick a base theme** — choose the closest built-in theme as your starting point:

    ```toml
    [diff]
    syntax_theme = "nord"
    ```

2. **Override every token** under `[syntax.overrides]`:

    ```toml
    [syntax.overrides]
    keyword              = "#c678dd"
    "keyword.import"     = "#c678dd"
    "keyword.operator"   = "#56b6c2"
    string               = "#98c379"
    comment              = "#5c6370"
    number               = "#d19a66"
    boolean              = "#d19a66"
    constant             = "#d19a66"
    function             = "#61afef"
    "function.call"      = "#61afef"
    "function.method.call" = "#61afef"
    type                 = "#e5c07b"
    constructor          = "#e5c07b"
    variable             = "#abb2bf"
    "variable.member"    = "#61afef"
    property             = "#61afef"
    operator             = "#56b6c2"
    punctuation          = "#abb2bf"
    "punctuation.bracket"    = "#abb2bf"
    "punctuation.delimiter"  = "#abb2bf"
    default              = "#abb2bf"
    ```

3. **Restart gittui** or switch away and back to the diff view. Changes take effect when the config is reloaded.

### Full Example — "Solarized Dark" Custom Theme

```toml
[diff]
syntax_theme = "catppuccin-mocha"   # base doesn't matter when overriding all tokens

[syntax.overrides]
keyword              = "#859900"
"keyword.import"     = "#859900"
"keyword.operator"   = "#2aa198"
string               = "#2aa198"
comment              = "#586e75"
number               = "#d33682"
boolean              = "#cb4b16"
constant             = "#cb4b16"
function             = "#268bd2"
"function.call"      = "#268bd2"
"function.method.call" = "#268bd2"
type                 = "#b58900"
constructor          = "#b58900"
variable             = "#839496"
"variable.member"    = "#268bd2"
property             = "#268bd2"
operator             = "#859900"
punctuation          = "#839496"
"punctuation.bracket"    = "#657b83"
"punctuation.delimiter"  = "#586e75"
default              = "#839496"
```

## Tips

- **Colors must be hex format**: `#rrggbb` (6 digits). Short hex (`#rgb`) is not supported.
- **Token names with dots** must be quoted in TOML: `"function.call" = "#61afef"`.
- **Partial overrides are fine**: you don't have to override all 19 tokens. Any token not listed
  keeps the color from the base theme.
- **`none` disables highlighting entirely**: set `syntax_theme = "none"` and overrides are ignored.
- **The base theme only matters for non-overridden tokens**: if you override all 19 tokens,
  the base theme is irrelevant.

## Supported Languages

Syntax highlighting works automatically for 60+ file types based on the file extension.
Here are the most common ones:

| Language           | Extensions                         |
|--------------------|------------------------------------|
| TypeScript         | `.ts`, `.tsx`                      |
| JavaScript         | `.js`, `.jsx`, `.mjs`, `.cjs`      |
| Python             | `.py`                              |
| Go                 | `.go`                              |
| Rust               | `.rs`                              |
| Ruby               | `.rb`                              |
| Java               | `.java`                            |
| Kotlin             | `.kt`                              |
| Swift              | `.swift`                           |
| C / C++            | `.c`, `.h`, `.cpp`, `.hpp`, `.cc`  |
| C#                 | `.cs`                              |
| HTML               | `.html`, `.htm`                    |
| CSS / SCSS         | `.css`, `.scss`, `.less`           |
| JSON               | `.json`, `.jsonc`                  |
| YAML               | `.yaml`, `.yml`                    |
| TOML               | `.toml`                            |
| Markdown           | `.md`, `.mdx`                      |
| Shell              | `.sh`, `.bash`, `.zsh`             |
| SQL                | `.sql`                             |
| Lua                | `.lua`                             |
| GraphQL            | `.graphql`, `.gql`                 |
| Dockerfile         | `Dockerfile`                       |
| Makefile            | `Makefile`                         |

Special filenames like `Dockerfile`, `Makefile`, `.bashrc`, `.gitignore`, and `.editorconfig`
are also recognized automatically.
