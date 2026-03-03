// src/core/config/defaults.ts
// Sensible defaults — used as base for deep merge with user overrides

import type { GuitConfig } from "./schema.ts"

export const DEFAULT_CONFIG: GuitConfig = {
  general: {
    theme: "catppuccin-mocha",
    sidebar_width: 30,
    sidebar_collapsed: false,
    default_tab: "files",
  },
  keybindings: {
    preset: "vim",
    custom: {},
  },
  diff: {
    view: "unified",
    context_lines: 3,
    show_line_numbers: true,
    syntax_theme: "catppuccin-mocha",
  },
  git: {
    merge_strategy: "merge",
  },
  github: {
    auto_fetch_prs: true,
  },
  ai: {
    agent: null,
    commit_prompt: null,
  },
  syntax: {
    overrides: {},
  },
}
