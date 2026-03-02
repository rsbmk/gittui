// src/lib/syntax/themes.ts
// Predefined syntax highlighting themes

import { RGBA } from "@opentui/core"
import type { StyleDefinition } from "@opentui/core"

// ── Theme names ───────────────────────────────────────────────

export const SYNTAX_THEME = {
  CATPPUCCIN_MOCHA: "catppuccin-mocha",
  DRACULA: "dracula",
  NORD: "nord",
  GITHUB_DARK: "github-dark",
  ONE_DARK: "one-dark",
  NONE: "none",
} as const

export type SyntaxThemeName = (typeof SYNTAX_THEME)[keyof typeof SYNTAX_THEME]

export const SYNTAX_THEME_NAMES: string[] = [
  SYNTAX_THEME.CATPPUCCIN_MOCHA,
  SYNTAX_THEME.DRACULA,
  SYNTAX_THEME.NORD,
  SYNTAX_THEME.GITHUB_DARK,
  SYNTAX_THEME.ONE_DARK,
  SYNTAX_THEME.NONE,
]

// ── Helper ────────────────────────────────────────────────────

function fg(hex: string, opts?: { bold?: boolean; italic?: boolean; dim?: boolean }): StyleDefinition {
  return {
    fg: RGBA.fromHex(hex),
    bold: opts?.bold,
    italic: opts?.italic,
    dim: opts?.dim,
  }
}

// ── Catppuccin Mocha ──────────────────────────────────────────

const catppuccinMocha: Record<string, StyleDefinition> = {
  keyword: fg("#cba6f7", { bold: true }),
  "keyword.import": fg("#cba6f7"),
  "keyword.operator": fg("#89dceb"),

  string: fg("#a6e3a1"),
  comment: fg("#6c7086", { italic: true }),
  number: fg("#fab387"),
  boolean: fg("#fab387", { bold: true }),
  constant: fg("#fab387"),

  function: fg("#89b4fa", { bold: true }),
  "function.call": fg("#89b4fa"),
  "function.method.call": fg("#89b4fa"),

  type: fg("#f9e2af", { bold: true }),
  constructor: fg("#f9e2af"),

  variable: fg("#cdd6f4"),
  "variable.member": fg("#89b4fa"),
  property: fg("#89b4fa"),

  operator: fg("#89dceb"),
  punctuation: fg("#bac2de"),
  "punctuation.bracket": fg("#bac2de"),
  "punctuation.delimiter": fg("#bac2de", { dim: true }),

  default: fg("#cdd6f4"),
}

// ── Dracula ───────────────────────────────────────────────────

const dracula: Record<string, StyleDefinition> = {
  keyword: fg("#ff79c6", { bold: true }),
  "keyword.import": fg("#ff79c6"),
  "keyword.operator": fg("#ff79c6"),

  string: fg("#f1fa8c"),
  comment: fg("#6272a4", { italic: true }),
  number: fg("#bd93f9"),
  boolean: fg("#bd93f9", { bold: true }),
  constant: fg("#bd93f9"),

  function: fg("#50fa7b", { bold: true }),
  "function.call": fg("#50fa7b"),
  "function.method.call": fg("#50fa7b"),

  type: fg("#8be9fd", { bold: true }),
  constructor: fg("#8be9fd"),

  variable: fg("#f8f8f2"),
  "variable.member": fg("#66d9ef"),
  property: fg("#66d9ef"),

  operator: fg("#ff79c6"),
  punctuation: fg("#f8f8f2"),
  "punctuation.bracket": fg("#f8f8f2"),
  "punctuation.delimiter": fg("#f8f8f2", { dim: true }),

  default: fg("#f8f8f2"),
}

// ── Nord ──────────────────────────────────────────────────────

const nord: Record<string, StyleDefinition> = {
  keyword: fg("#81a1c1", { bold: true }),
  "keyword.import": fg("#81a1c1"),
  "keyword.operator": fg("#81a1c1"),

  string: fg("#a3be8c"),
  comment: fg("#616e88", { italic: true }),
  number: fg("#b48ead"),
  boolean: fg("#b48ead", { bold: true }),
  constant: fg("#b48ead"),

  function: fg("#88c0d0", { bold: true }),
  "function.call": fg("#88c0d0"),
  "function.method.call": fg("#88c0d0"),

  type: fg("#8fbcbb", { bold: true }),
  constructor: fg("#8fbcbb"),

  variable: fg("#d8dee9"),
  "variable.member": fg("#88c0d0"),
  property: fg("#88c0d0"),

  operator: fg("#81a1c1"),
  punctuation: fg("#d8dee9"),
  "punctuation.bracket": fg("#d8dee9"),
  "punctuation.delimiter": fg("#d8dee9", { dim: true }),

  default: fg("#d8dee9"),
}

// ── GitHub Dark ───────────────────────────────────────────────

const githubDark: Record<string, StyleDefinition> = {
  keyword: fg("#ff7b72", { bold: true }),
  "keyword.import": fg("#ff7b72"),
  "keyword.operator": fg("#ff7b72"),

  string: fg("#a5d6ff"),
  comment: fg("#8b949e", { italic: true }),
  number: fg("#79c0ff"),
  boolean: fg("#79c0ff", { bold: true }),
  constant: fg("#79c0ff"),

  function: fg("#d2a8ff", { bold: true }),
  "function.call": fg("#d2a8ff"),
  "function.method.call": fg("#d2a8ff"),

  type: fg("#ffa657", { bold: true }),
  constructor: fg("#ffa657"),

  variable: fg("#e6edf3"),
  "variable.member": fg("#79c0ff"),
  property: fg("#79c0ff"),

  operator: fg("#ff7b72"),
  punctuation: fg("#f0f6fc"),
  "punctuation.bracket": fg("#f0f6fc"),
  "punctuation.delimiter": fg("#f0f6fc", { dim: true }),

  default: fg("#e6edf3"),
}

// ── One Dark ──────────────────────────────────────────────────

const oneDark: Record<string, StyleDefinition> = {
  keyword: fg("#c678dd", { bold: true }),
  "keyword.import": fg("#c678dd"),
  "keyword.operator": fg("#56b6c2"),

  string: fg("#98c379"),
  comment: fg("#5c6370", { italic: true }),
  number: fg("#d19a66"),
  boolean: fg("#d19a66", { bold: true }),
  constant: fg("#d19a66"),

  function: fg("#61afef", { bold: true }),
  "function.call": fg("#61afef"),
  "function.method.call": fg("#61afef"),

  type: fg("#e5c07b", { bold: true }),
  constructor: fg("#e5c07b"),

  variable: fg("#abb2bf"),
  "variable.member": fg("#61afef"),
  property: fg("#61afef"),

  operator: fg("#56b6c2"),
  punctuation: fg("#abb2bf"),
  "punctuation.bracket": fg("#abb2bf"),
  "punctuation.delimiter": fg("#abb2bf", { dim: true }),

  default: fg("#abb2bf"),
}

// ── Theme registry ────────────────────────────────────────────

export const THEMES: Record<string, Record<string, StyleDefinition>> = {
  [SYNTAX_THEME.CATPPUCCIN_MOCHA]: catppuccinMocha,
  [SYNTAX_THEME.DRACULA]: dracula,
  [SYNTAX_THEME.NORD]: nord,
  [SYNTAX_THEME.GITHUB_DARK]: githubDark,
  [SYNTAX_THEME.ONE_DARK]: oneDark,
}
