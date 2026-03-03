// src/core/config/schema.ts
// Config type definitions — all string unions use the const object pattern

import type { TabId } from "../../state/ui.ts"

// ── Keybinding Preset ─────────────────────────────────────────

export const KEYBINDING_PRESET = {
  VIM: "vim",
  EMACS: "emacs",
  CUSTOM: "custom",
} as const

export type KeybindingPreset = (typeof KEYBINDING_PRESET)[keyof typeof KEYBINDING_PRESET]

// ── Diff View ─────────────────────────────────────────────────

export const DIFF_VIEW = {
  UNIFIED: "unified",
  SPLIT: "split",
} as const

export type DiffView = (typeof DIFF_VIEW)[keyof typeof DIFF_VIEW]

// ── Merge Strategy ────────────────────────────────────────────

export const MERGE_STRATEGY = {
  MERGE: "merge",
  NO_FF: "no-ff",
  FF_ONLY: "ff-only",
  SQUASH: "squash",
} as const

export type MergeStrategy = (typeof MERGE_STRATEGY)[keyof typeof MERGE_STRATEGY]

// ── Config Interfaces ─────────────────────────────────────────

export interface GeneralConfig {
  theme: string
  sidebar_width: number
  sidebar_collapsed: boolean
  default_tab: TabId
}

export interface KeybindingsConfig {
  preset: KeybindingPreset
  custom: Record<string, string>
}

export interface DiffConfig {
  view: DiffView
  context_lines: number
  show_line_numbers: boolean
  syntax_theme: string
}

export interface SyntaxConfig {
  overrides: Record<string, string>
}

export interface GithubConfig {
  auto_fetch_prs: boolean
}

export interface AIConfig {
  agent: string | null
  commit_prompt: string | null
}

export interface GitConfig {
  merge_strategy: MergeStrategy
}

export interface GuitConfig {
  general: GeneralConfig
  keybindings: KeybindingsConfig
  diff: DiffConfig
  git: GitConfig
  github: GithubConfig
  ai: AIConfig
  syntax: SyntaxConfig
}
