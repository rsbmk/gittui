// src/state/ui.ts
// UI state — Solid.js signals for layout, navigation, and selection

import { createSignal } from "solid-js"

// ── Tab ───────────────────────────────────────────────────────

export const TAB_ID = {
  FILES: "files",
  BRANCHES: "branches",
  COMMITS: "commits",
  STASH: "stash",
  PRS: "prs",
  SETTINGS: "settings",
} as const

export type TabId = (typeof TAB_ID)[keyof typeof TAB_ID]

const TAB_ORDER: TabId[] = [
  TAB_ID.FILES,
  TAB_ID.BRANCHES,
  TAB_ID.COMMITS,
  TAB_ID.STASH,
  TAB_ID.PRS,
  TAB_ID.SETTINGS,
]

// ── Panel ─────────────────────────────────────────────────────

export const PANEL = {
  SIDEBAR: "sidebar",
  MAIN: "main",
} as const

export type Panel = (typeof PANEL)[keyof typeof PANEL]

// ── Signals ───────────────────────────────────────────────────

export const [activeTab, setActiveTab] = createSignal<TabId>(TAB_ID.FILES)
export const [sidebarVisible, setSidebarVisible] = createSignal(true)
export const [sidebarWidth, setSidebarWidth] = createSignal(30)
export const [activePanel, setActivePanel] = createSignal<Panel>(PANEL.SIDEBAR)
export const [selectedFile, setSelectedFile] = createSignal<string | null>(null)
export const [selectedIndex, setSelectedIndex] = createSignal(0)
export const [searchQuery, setSearchQuery] = createSignal("")
export const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false)
export const [helpOverlayOpen, setHelpOverlayOpen] = createSignal(false)
export const [dialogOpen, setDialogOpen] = createSignal(false)

// ── Helpers ───────────────────────────────────────────────────

export function toggleSidebar(): void {
  setSidebarVisible((prev) => !prev)
}

export function switchPanel(): void {
  setActivePanel((prev) => (prev === PANEL.SIDEBAR ? PANEL.MAIN : PANEL.SIDEBAR))
}

export function nextTab(): void {
  const current = activeTab()
  const idx = TAB_ORDER.indexOf(current)
  const next = TAB_ORDER[(idx + 1) % TAB_ORDER.length]!
  setActiveTab(next)
}

export function prevTab(): void {
  const current = activeTab()
  const idx = TAB_ORDER.indexOf(current)
  const prev = TAB_ORDER[(idx - 1 + TAB_ORDER.length) % TAB_ORDER.length]!
  setActiveTab(prev)
}

export function switchToTab(tab: TabId): void {
  setActiveTab(tab)
}

// ── Status Message ───────────────────────────────────────────

export const [statusMessage, setStatusMessage] = createSignal<string | null>(null)

let statusTimer: ReturnType<typeof setTimeout> | null = null

export function showStatusMessage(msg: string, durationMs = 5000): void {
  if (statusTimer) clearTimeout(statusTimer)
  setStatusMessage(msg)
  statusTimer = setTimeout(() => {
    setStatusMessage(null)
    statusTimer = null
  }, durationMs)
}

// ── Dialog tracking ──────────────────────────────────────────

/**
 * Wraps a dialog call (prompt/confirm/show) to track open state.
 * While a dialog is open, global keybindings are suppressed.
 */
export async function withDialog<T>(fn: () => Promise<T>): Promise<T> {
  setDialogOpen(true)
  try {
    return await fn()
  } finally {
    setDialogOpen(false)
  }
}
