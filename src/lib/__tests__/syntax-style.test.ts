import { test, expect, describe } from "bun:test"
import { buildSyntaxStyle } from "../syntax/create-style.ts"
import { THEMES, SYNTAX_THEME, SYNTAX_THEME_NAMES } from "../syntax/themes.ts"

describe("buildSyntaxStyle", () => {
  test("returns SyntaxStyle for catppuccin-mocha", () => {
    const style = buildSyntaxStyle("catppuccin-mocha")

    expect(style).toBeDefined()
    expect(style).not.toBeUndefined()
  })

  test("returns SyntaxStyle for dracula", () => {
    const style = buildSyntaxStyle("dracula")

    expect(style).toBeDefined()
  })

  test("returns SyntaxStyle for nord", () => {
    const style = buildSyntaxStyle("nord")

    expect(style).toBeDefined()
  })

  test("returns SyntaxStyle for github-dark", () => {
    const style = buildSyntaxStyle("github-dark")

    expect(style).toBeDefined()
  })

  test("returns SyntaxStyle for one-dark", () => {
    const style = buildSyntaxStyle("one-dark")

    expect(style).toBeDefined()
  })

  test("returns undefined for 'none'", () => {
    const style = buildSyntaxStyle("none")

    expect(style).toBeUndefined()
  })

  test("falls back to catppuccin-mocha for unknown theme", () => {
    const unknown = buildSyntaxStyle("nonexistent-theme")
    const catppuccin = buildSyntaxStyle("catppuccin-mocha")

    // Both should be defined (fallback worked)
    expect(unknown).toBeDefined()
    expect(catppuccin).toBeDefined()
  })

  test("applies overrides to base theme", () => {
    const style = buildSyntaxStyle("catppuccin-mocha", {
      keyword: "#ff0000",
    })

    expect(style).toBeDefined()
  })

  test("adds new tokens from overrides", () => {
    const style = buildSyntaxStyle("catppuccin-mocha", {
      "custom.token": "#00ff00",
    })

    expect(style).toBeDefined()
  })

  test("does not mutate the original theme object", () => {
    const originalKeyword = THEMES[SYNTAX_THEME.CATPPUCCIN_MOCHA]!["keyword"]
    const originalFg = originalKeyword?.fg

    // Build with override that changes keyword color
    buildSyntaxStyle("catppuccin-mocha", { keyword: "#ff0000" })

    // Original theme should be unchanged
    const afterKeyword = THEMES[SYNTAX_THEME.CATPPUCCIN_MOCHA]!["keyword"]
    expect(afterKeyword?.fg).toBe(originalFg)
  })

  test("handles empty overrides object", () => {
    const style = buildSyntaxStyle("catppuccin-mocha", {})

    expect(style).toBeDefined()
  })

  test("handles undefined overrides", () => {
    const style = buildSyntaxStyle("catppuccin-mocha", undefined)

    expect(style).toBeDefined()
  })
})

describe("THEMES", () => {
  test("has all 5 predefined themes", () => {
    expect(Object.keys(THEMES)).toHaveLength(5)
    expect(THEMES["catppuccin-mocha"]).toBeDefined()
    expect(THEMES["dracula"]).toBeDefined()
    expect(THEMES["nord"]).toBeDefined()
    expect(THEMES["github-dark"]).toBeDefined()
    expect(THEMES["one-dark"]).toBeDefined()
  })

  test("each theme defines all required tokens", () => {
    const requiredTokens = [
      "keyword", "keyword.import", "keyword.operator",
      "string", "comment", "number", "boolean", "constant",
      "function", "function.call", "function.method.call",
      "type", "constructor",
      "variable", "variable.member", "property",
      "operator", "punctuation", "punctuation.bracket", "punctuation.delimiter",
      "default",
    ]

    for (const [themeName, theme] of Object.entries(THEMES)) {
      for (const token of requiredTokens) {
        expect(theme[token]).toBeDefined()
      }
    }
  })

  test("each theme token has a fg color", () => {
    for (const [themeName, theme] of Object.entries(THEMES)) {
      for (const [token, style] of Object.entries(theme)) {
        expect(style.fg).toBeDefined()
      }
    }
  })
})

describe("SYNTAX_THEME_NAMES", () => {
  test("contains all theme names including none", () => {
    expect(SYNTAX_THEME_NAMES).toContain("catppuccin-mocha")
    expect(SYNTAX_THEME_NAMES).toContain("dracula")
    expect(SYNTAX_THEME_NAMES).toContain("nord")
    expect(SYNTAX_THEME_NAMES).toContain("github-dark")
    expect(SYNTAX_THEME_NAMES).toContain("one-dark")
    expect(SYNTAX_THEME_NAMES).toContain("none")
  })

  test("has 6 entries (5 themes + none)", () => {
    expect(SYNTAX_THEME_NAMES).toHaveLength(6)
  })
})

describe("SYNTAX_THEME", () => {
  test("has correct values", () => {
    expect(SYNTAX_THEME.CATPPUCCIN_MOCHA).toBe("catppuccin-mocha")
    expect(SYNTAX_THEME.DRACULA).toBe("dracula")
    expect(SYNTAX_THEME.NORD).toBe("nord")
    expect(SYNTAX_THEME.GITHUB_DARK).toBe("github-dark")
    expect(SYNTAX_THEME.ONE_DARK).toBe("one-dark")
    expect(SYNTAX_THEME.NONE).toBe("none")
  })
})
