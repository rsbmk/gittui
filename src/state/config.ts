// src/state/config.ts
// Reactive config + theme signals — loaded once at startup

import { createSignal } from "solid-js"
import type { GuitConfig, GeneralConfig, KeybindingsConfig, KeybindingPreset, DiffConfig } from "../core/config/schema.ts"
import type { GuitTheme } from "../lib/theme.ts"
import type { SyntaxStyle } from "@opentui/core"
import { DEFAULT_CONFIG } from "../core/config/defaults.ts"
import { loadConfig, saveConfig } from "../core/config/loader.ts"
import { loadTheme } from "../lib/theme.ts"
import { buildSyntaxStyle } from "../lib/syntax/create-style.ts"
import { initKeybindings } from "./keybindings.ts"
import { setSidebarWidth, setSidebarVisible, setActiveTab, showStatusMessage } from "./ui.ts"

// ── Config Signal ────────────────────────────────────────────

const [config, setConfig] = createSignal<GuitConfig>(DEFAULT_CONFIG)
export { config, setConfig }

// ── Theme Signal ─────────────────────────────────────────────

const [theme, setTheme] = createSignal<GuitTheme>({
  name: "default-dark",
  colors: {
    bg: "#1e1e1e",
    fg: "#d4d4d4",
    accent: "#569cd6",
    success: "#6a9955",
    warning: "#dcdcaa",
    error: "#f44747",
    muted: "#858585",
    border: "#3c3c3c",
    selection: "#264f78",
    diff_add_bg: "#1a2e1a",
    diff_del_bg: "#2e1a1a",
    diff_add_fg: "#6a9955",
    diff_del_fg: "#f44747",
  },
  syntax: {
    keyword: "#569cd6",
    string: "#ce9178",
    number: "#b5cea8",
    comment: "#6a9955",
    function: "#dcdcaa",
    type: "#4ec9b0",
    variable: "#9cdcfe",
    operator: "#d4d4d4",
  },
})
export { theme, setTheme }

// ── Syntax Style Signal ──────────────────────────────────────

const [syntaxStyle, setSyntaxStyle] = createSignal<SyntaxStyle | undefined>(
  buildSyntaxStyle(DEFAULT_CONFIG.diff.syntax_theme),
)
export { syntaxStyle }

// ── Color accessor ───────────────────────────────────────────

export function color(key: keyof GuitTheme["colors"]): string {
  return theme().colors[key]
}

// ── Init ─────────────────────────────────────────────────────

export async function initConfig(): Promise<void> {
  const cfg = await loadConfig()
  setConfig(cfg)

  const themeData = await loadTheme(cfg.general.theme)
  setTheme(themeData)

  // Apply startup-only settings
  setActiveTab(cfg.general.default_tab)
  setSidebarWidth(cfg.general.sidebar_width)
  setSidebarVisible(!cfg.general.sidebar_collapsed)

  // Apply keybinding preset + custom overrides
  initKeybindings(cfg.keybindings.preset, cfg.keybindings.custom)

  // Build syntax highlighting style
  setSyntaxStyle(buildSyntaxStyle(cfg.diff.syntax_theme, cfg.syntax.overrides))
}

// ── Config Update ────────────────────────────────────────────

export async function updateConfigField<S extends keyof GuitConfig>(
  section: S,
  field: keyof GuitConfig[S],
  value: GuitConfig[S][keyof GuitConfig[S]],
): Promise<void> {
  const current = config()
  const updated: GuitConfig = {
    ...current,
    [section]: { ...current[section], [field]: value },
  }
  setConfig(updated)

  // Side effects
  if (section === "general") {
    const f = field as keyof GeneralConfig
    if (f === "theme") {
      const themeData = await loadTheme(value as string)
      setTheme(themeData)
    } else if (f === "sidebar_width") {
      setSidebarWidth(value as number)
    } else if (f === "sidebar_collapsed") {
      setSidebarVisible(!(value as boolean))
    }
  } else if (section === "diff") {
    const f = field as keyof DiffConfig
    if (f === "syntax_theme") {
      setSyntaxStyle(buildSyntaxStyle(value as string, updated.syntax.overrides))
    }
  } else if (section === "keybindings") {
    const f = field as keyof KeybindingsConfig
    if (f === "preset") {
      initKeybindings(value as KeybindingPreset, updated.keybindings.custom)
    }
  }

  // Persist
  try {
    await saveConfig(updated)
  } catch (err) {
    showStatusMessage(`Failed to save config: ${err instanceof Error ? err.message : String(err)}`)
  }
}
