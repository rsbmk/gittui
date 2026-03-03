// src/ui/views/settings-fields.ts
// Declarative field definitions for settings UI

import type { GuitConfig } from "../../core/config/schema.ts"

// ── Field Type ───────────────────────────────────────────────

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
  section: keyof GuitConfig
  options?: string[]
  range?: { min: number; max: number; step: number }
  getValue: (config: GuitConfig) => unknown
  formatValue?: (v: unknown) => string
}

// ── Section Definition ───────────────────────────────────────

export interface SectionDef {
  key: keyof GuitConfig
  label: string
  fields: FieldDef[]
}

// ── Settings Sections ────────────────────────────────────────

export const SETTINGS_SECTIONS: SectionDef[] = [
  {
    key: "general",
    label: "General",
    fields: [
      {
        key: "theme",
        label: "Theme",
        type: FIELD_TYPE.CYCLE,
        section: "general",
        options: [], // populated dynamically with getBuiltinThemeNames()
        getValue: (c) => c.general.theme,
      },
      {
        key: "sidebar_width",
        label: "Sidebar Width",
        type: FIELD_TYPE.STEPPER,
        section: "general",
        range: { min: 15, max: 60, step: 5 },
        getValue: (c) => c.general.sidebar_width,
      },
      {
        key: "sidebar_collapsed",
        label: "Sidebar Collapsed",
        type: FIELD_TYPE.TOGGLE,
        section: "general",
        getValue: (c) => c.general.sidebar_collapsed,
      },
      {
        key: "default_tab",
        label: "Default Tab",
        type: FIELD_TYPE.CYCLE,
        section: "general",
        options: ["files", "branches", "commits", "stash", "prs"],
        getValue: (c) => c.general.default_tab,
      },
    ],
  },
  {
    key: "keybindings",
    label: "Keybindings",
    fields: [
      {
        key: "preset",
        label: "Preset",
        type: FIELD_TYPE.CYCLE,
        section: "keybindings",
        options: ["vim", "emacs", "custom"],
        getValue: (c) => c.keybindings.preset,
      },
    ],
  },
  {
    key: "diff",
    label: "Diff",
    fields: [
      {
        key: "view",
        label: "View Mode",
        type: FIELD_TYPE.CYCLE,
        section: "diff",
        options: ["unified", "split"],
        getValue: (c) => c.diff.view,
      },
      {
        key: "context_lines",
        label: "Context Lines",
        type: FIELD_TYPE.STEPPER,
        section: "diff",
        range: { min: 1, max: 20, step: 1 },
        getValue: (c) => c.diff.context_lines,
      },
      {
        key: "show_line_numbers",
        label: "Line Numbers",
        type: FIELD_TYPE.TOGGLE,
        section: "diff",
        getValue: (c) => c.diff.show_line_numbers,
      },
      {
        key: "syntax_theme",
        label: "Syntax Theme",
        type: FIELD_TYPE.CYCLE,
        section: "diff",
        options: ["catppuccin-mocha", "dracula", "nord", "github-dark", "one-dark", "none"],
        getValue: (c) => c.diff.syntax_theme,
      },
    ],
  },
  {
    key: "git",
    label: "Git",
    fields: [
      {
        key: "merge_strategy",
        label: "Merge Strategy",
        type: FIELD_TYPE.CYCLE,
        section: "git",
        options: ["merge", "no-ff", "ff-only", "squash"],
        getValue: (c) => c.git.merge_strategy,
      },
    ],
  },
  {
    key: "github",
    label: "GitHub",
    fields: [
      {
        key: "auto_fetch_prs",
        label: "Auto Fetch PRs",
        type: FIELD_TYPE.TOGGLE,
        section: "github",
        getValue: (c) => c.github.auto_fetch_prs,
      },
    ],
  },
  {
    key: "ai",
    label: "AI",
    fields: [
      {
        key: "agent",
        label: "Agent",
        type: FIELD_TYPE.CYCLE,
        section: "ai",
        options: [], // populated dynamically with detectInstalledAgents()
        getValue: (c) => c.ai.agent,
        formatValue: (v) => (v as string | null) ?? "none",
      },
      {
        key: "commit_prompt",
        label: "Commit Prompt",
        type: FIELD_TYPE.READONLY,
        section: "ai",
        getValue: (c) => c.ai.commit_prompt,
        formatValue: (v) => (v as string | null) ?? "(default)",
      },
    ],
  },
]
