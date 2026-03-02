// src/lib/theme.ts
// Theme system — loading, validation, and color helpers

import { homedir } from "node:os"
import { join } from "node:path"
import type { FileStatus } from "@core/git/types.ts"
import { FILE_STATUS } from "@core/git/types.ts"

// ── Theme interfaces ─────────────────────────────────────────

export interface ThemeColors {
  bg: string
  fg: string
  accent: string
  success: string
  warning: string
  error: string
  muted: string
  border: string
  selection: string
  diff_add_bg: string
  diff_del_bg: string
  diff_add_fg: string
  diff_del_fg: string
}

export interface ThemeSyntax {
  keyword: string
  string: string
  number: string
  comment: string
  function: string
  type: string
  variable: string
  operator: string
}

export interface GuitTheme {
  name: string
  colors: ThemeColors
  syntax: ThemeSyntax
}

// ── Color key type ───────────────────────────────────────────

export const COLOR_KEY = {
  BG: "bg",
  FG: "fg",
  ACCENT: "accent",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  MUTED: "muted",
  BORDER: "border",
  SELECTION: "selection",
  DIFF_ADD_BG: "diff_add_bg",
  DIFF_DEL_BG: "diff_del_bg",
  DIFF_ADD_FG: "diff_add_fg",
  DIFF_DEL_FG: "diff_del_fg",
} as const

export type ColorKey = (typeof COLOR_KEY)[keyof typeof COLOR_KEY]

// ── Built-in themes ──────────────────────────────────────────

import defaultDark from "./themes/default-dark.json"
import catppuccinMocha from "./themes/catppuccin-mocha.json"
import nord from "./themes/nord.json"
import tokyoNight from "./themes/tokyo-night.json"

const BUILTIN_THEMES: Record<string, GuitTheme> = {
  "default-dark": defaultDark as GuitTheme,
  "catppuccin-mocha": catppuccinMocha as GuitTheme,
  "nord": nord as GuitTheme,
  "tokyo-night": tokyoNight as GuitTheme,
}

const DEFAULT_THEME_NAME = "default-dark"

// ── Theme loading ────────────────────────────────────────────

const THEMES_DIR = join(homedir(), ".config", "gittui", "themes")

function isValidTheme(value: unknown): value is GuitTheme {
  if (typeof value !== "object" || value === null) return false

  const obj = value as Record<string, unknown>
  if (typeof obj.name !== "string") return false
  if (typeof obj.colors !== "object" || obj.colors === null) return false
  if (typeof obj.syntax !== "object" || obj.syntax === null) return false

  const colors = obj.colors as Record<string, unknown>
  const requiredColors: (keyof ThemeColors)[] = [
    "bg", "fg", "accent", "success", "warning", "error",
    "muted", "border", "selection",
    "diff_add_bg", "diff_del_bg", "diff_add_fg", "diff_del_fg",
  ]
  for (const key of requiredColors) {
    if (typeof colors[key] !== "string") return false
  }

  const syntax = obj.syntax as Record<string, unknown>
  const requiredSyntax: (keyof ThemeSyntax)[] = [
    "keyword", "string", "number", "comment",
    "function", "type", "variable", "operator",
  ]
  for (const key of requiredSyntax) {
    if (typeof syntax[key] !== "string") return false
  }

  return true
}

async function loadCustomTheme(name: string): Promise<GuitTheme | null> {
  const filePath = join(THEMES_DIR, `${name}.json`)
  const file = Bun.file(filePath)

  if (!(await file.exists())) return null

  try {
    const data: unknown = await file.json()

    if (!isValidTheme(data)) {
      console.error(`[theme] Invalid theme file: ${filePath}`)
      return null
    }

    return data
  } catch {
    console.error(`[theme] Failed to parse theme file: ${filePath}`)
    return null
  }
}

export async function loadTheme(name: string): Promise<GuitTheme> {
  // 1. Check custom themes dir first (~/.config/gittui/themes/<name>.json)
  const custom = await loadCustomTheme(name)
  if (custom) return custom

  // 2. Fall back to built-in themes
  const builtin = BUILTIN_THEMES[name]
  if (builtin) return builtin

  // 3. If not found anywhere, fall back to default-dark
  console.error(`[theme] Theme "${name}" not found, falling back to "${DEFAULT_THEME_NAME}"`)
  return BUILTIN_THEMES[DEFAULT_THEME_NAME]!
}

export function getBuiltinThemeNames(): string[] {
  return Object.keys(BUILTIN_THEMES)
}

// ── Color helper ─────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<FileStatus, ColorKey> = {
  [FILE_STATUS.MODIFIED]: COLOR_KEY.WARNING,
  [FILE_STATUS.ADDED]: COLOR_KEY.SUCCESS,
  [FILE_STATUS.DELETED]: COLOR_KEY.ERROR,
  [FILE_STATUS.UNTRACKED]: COLOR_KEY.MUTED,
  [FILE_STATUS.UNMERGED]: COLOR_KEY.ERROR,
  [FILE_STATUS.RENAMED]: COLOR_KEY.ACCENT,
  [FILE_STATUS.COPIED]: COLOR_KEY.ACCENT,
}

/**
 * Maps a git file status to the corresponding theme color key.
 * Returns the color KEY (e.g. "warning"), not the hex value.
 * The caller resolves the actual value via `theme.colors[key]`.
 */
export function getStatusColor(status: FileStatus): ColorKey {
  return STATUS_COLOR_MAP[status] ?? COLOR_KEY.FG
}
