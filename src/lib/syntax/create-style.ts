// src/lib/syntax/create-style.ts
// SyntaxStyle builder — merges theme + user overrides

import { SyntaxStyle, RGBA } from "@opentui/core"
import type { StyleDefinition } from "@opentui/core"
import { THEMES, SYNTAX_THEME } from "./themes.ts"

// ── Public API ────────────────────────────────────────────────

/**
 * Builds a `SyntaxStyle` from a theme name with optional per-token color overrides.
 * Returns `undefined` when syntax highlighting is disabled (`SYNTAX_THEME.NONE`).
 */
export function buildSyntaxStyle(
  themeName: string,
  overrides?: Record<string, string>,
): SyntaxStyle | undefined {
  // Disabled — no syntax highlighting
  if (themeName === SYNTAX_THEME.NONE) return undefined

  // Resolve base theme (fall back to catppuccin-mocha for unknown names)
  const baseStyles = THEMES[themeName] ?? THEMES[SYNTAX_THEME.CATPPUCCIN_MOCHA]!

  // Clone so we don't mutate the shared theme object
  const mergedStyles: Record<string, StyleDefinition> = {}

  for (const [token, style] of Object.entries(baseStyles)) {
    mergedStyles[token] = { ...style }
  }

  // Apply user overrides — replace fg color for matching token names
  if (overrides) {
    for (const [token, hexColor] of Object.entries(overrides)) {
      const existing = mergedStyles[token]
      if (existing) {
        mergedStyles[token] = { ...existing, fg: RGBA.fromHex(hexColor) }
      } else {
        mergedStyles[token] = { fg: RGBA.fromHex(hexColor) }
      }
    }
  }

  return SyntaxStyle.fromStyles(mergedStyles)
}
