// src/state/keybindings.ts
// Keybinding registry — vim/emacs presets with context awareness and custom overrides

import { createSignal } from "solid-js"
import type { KeybindingPreset } from "../core/config/schema.ts"

// ── Types ─────────────────────────────────────────────────────

export interface Keybinding {
  key: string
  action: string
  context: string
  description: string
}

// ── Textarea Widget Bindings ──────────────────────────────────
//
// Reusable keybinding presets for <textarea> widgets in dialogs.
// Enter submits, Shift+Enter inserts newline for multi-line messages.
//
// Terminal emulators (Ghostty, Kitty, iTerm2, etc.) report modifier+Enter
// inconsistently — some send "linefeed", others "return" with flags.
// Using bare Enter for submit avoids all cross-terminal issues.
//
// Note: action values use `as const` because TextareaAction is not exported
// from @opentui/core index — literal narrowing satisfies the type constraint.

export const SUBMIT_TEXTAREA_BINDINGS = [
  { name: "return", action: "submit" as const },
  { name: "linefeed", action: "newline" as const },
  { name: "return", shift: true, action: "newline" as const },
  { name: "return", ctrl: true, action: "newline" as const },
]

// ── Shared (context-specific bindings identical across presets) ─

const FILES_BINDINGS: Keybinding[] = [
  { key: "space", action: "stage", context: "files", description: "Stage/unstage file" },
  { key: "a", action: "stageAll", context: "files", description: "Stage all" },
  { key: "c", action: "commit", context: "files", description: "Commit" },
  { key: "C", action: "ai-commit", context: "files", description: "AI commit" },
  { key: "d", action: "discard", context: "files", description: "Discard changes" },
  { key: "n", action: "nextHunk", context: "files", description: "Next hunk" },
  { key: "p", action: "prevHunk", context: "files", description: "Previous hunk" },
]

const BRANCHES_BINDINGS: Keybinding[] = [
  { key: "enter", action: "checkout", context: "branches", description: "Checkout branch" },
  { key: "n", action: "newBranch", context: "branches", description: "New branch" },
  { key: "d", action: "deleteBranch", context: "branches", description: "Delete branch" },
  { key: "D", action: "forceDeleteBranch", context: "branches", description: "Force delete branch" },
  { key: "m", action: "merge", context: "branches", description: "Merge into current" },
  { key: "r", action: "rebase", context: "branches", description: "Rebase current onto" },
  { key: "f", action: "filter", context: "branches", description: "Filter local/remote/all" },
]

const COMMITS_BINDINGS: Keybinding[] = [
  { key: "enter", action: "viewCommit", context: "commits", description: "View commit" },
  { key: "c", action: "cherryPick", context: "commits", description: "Cherry-pick" },
  { key: "r", action: "revert", context: "commits", description: "Revert commit" },
  { key: "b", action: "toggleBody", context: "commits", description: "Toggle body" },
]

const STASH_BINDINGS: Keybinding[] = [
  { key: "enter", action: "viewStash", context: "stash", description: "View stash" },
  { key: "a", action: "applyStash", context: "stash", description: "Apply stash" },
  { key: "p", action: "popStash", context: "stash", description: "Pop stash" },
  { key: "d", action: "dropStash", context: "stash", description: "Drop stash" },
  { key: "s", action: "saveStash", context: "stash", description: "Save stash" },
]

const PRS_BINDINGS: Keybinding[] = [
  { key: "enter", action: "viewPR", context: "prs", description: "View PR detail" },
  { key: "r", action: "submitReview", context: "prs", description: "Submit review" },
  { key: "m", action: "mergePR", context: "prs", description: "Merge PR" },
  { key: "o", action: "openInBrowser", context: "prs", description: "Open in browser" },
  { key: "f", action: "filterPRs", context: "prs", description: "Filter open/closed/all" },
  { key: "v", action: "viewPRFile", context: "prs", description: "View file diff" },
]

// ── Vim Preset ────────────────────────────────────────────────

export const VIM_BINDINGS: Keybinding[] = [
  // Global
  { key: "1", action: "switchTab:files", context: "global", description: "Files tab" },
  { key: "2", action: "switchTab:branches", context: "global", description: "Branches tab" },
  { key: "3", action: "switchTab:commits", context: "global", description: "Commits tab" },
  { key: "4", action: "switchTab:stash", context: "global", description: "Stash tab" },
  { key: "5", action: "switchTab:prs", context: "global", description: "PRs tab" },
  { key: "tab", action: "switchPanel", context: "global", description: "Switch panel" },
  { key: "ctrl+b", action: "toggleSidebar", context: "global", description: "Toggle sidebar" },
  { key: "?", action: "showHelp", context: "global", description: "Help" },
  { key: ":", action: "commandPalette", context: "global", description: "Command palette" },
  { key: "/", action: "search", context: "global", description: "Search" },
  { key: "q", action: "quit", context: "global", description: "Quit" },
  { key: "h", action: "focusSidebar", context: "global", description: "Focus sidebar" },
  { key: "l", action: "focusMain", context: "global", description: "Focus main panel" },
  { key: "j", action: "moveDown", context: "global", description: "Move down" },
  { key: "k", action: "moveUp", context: "global", description: "Move up" },
  { key: "down", action: "moveDown", context: "global", description: "Move down" },
  { key: "up", action: "moveUp", context: "global", description: "Move up" },

  ...FILES_BINDINGS,
  ...BRANCHES_BINDINGS,
  ...COMMITS_BINDINGS,
  ...STASH_BINDINGS,
  ...PRS_BINDINGS,
]

// ── Emacs Preset ──────────────────────────────────────────────

export const EMACS_BINDINGS: Keybinding[] = [
  // Global — same tab switches and chrome keys
  { key: "1", action: "switchTab:files", context: "global", description: "Files tab" },
  { key: "2", action: "switchTab:branches", context: "global", description: "Branches tab" },
  { key: "3", action: "switchTab:commits", context: "global", description: "Commits tab" },
  { key: "4", action: "switchTab:stash", context: "global", description: "Stash tab" },
  { key: "5", action: "switchTab:prs", context: "global", description: "PRs tab" },
  { key: "tab", action: "switchPanel", context: "global", description: "Switch panel" },
  { key: "ctrl+b", action: "toggleSidebar", context: "global", description: "Toggle sidebar" },
  { key: "?", action: "showHelp", context: "global", description: "Help" },
  { key: ":", action: "commandPalette", context: "global", description: "Command palette" },
  { key: "/", action: "search", context: "global", description: "Search" },
  { key: "q", action: "quit", context: "global", description: "Quit" },
  // Navigation — Ctrl-based
  { key: "ctrl+n", action: "moveDown", context: "global", description: "Move down" },
  { key: "ctrl+p", action: "moveUp", context: "global", description: "Move up" },
  { key: "down", action: "moveDown", context: "global", description: "Move down" },
  { key: "up", action: "moveUp", context: "global", description: "Move up" },
  { key: "ctrl+a", action: "moveTop", context: "global", description: "Move to top" },
  { key: "ctrl+e", action: "moveBottom", context: "global", description: "Move to bottom" },

  ...FILES_BINDINGS,
  ...BRANCHES_BINDINGS,
  ...COMMITS_BINDINGS,
  ...STASH_BINDINGS,
  ...PRS_BINDINGS,
]

// ── Signal ────────────────────────────────────────────────────

export const [keybindings, setKeybindings] = createSignal<Keybinding[]>(VIM_BINDINGS)

// ── Preset Loader ─────────────────────────────────────────────

export function getPresetBindings(preset: KeybindingPreset): Keybinding[] {
  switch (preset) {
    case "vim":
      return [...VIM_BINDINGS]
    case "emacs":
      return [...EMACS_BINDINGS]
    case "custom":
      return [...VIM_BINDINGS] // start from vim, user overrides everything
  }
}

// ── Custom Overrides ──────────────────────────────────────────

export function applyCustomBindings(
  bindings: Keybinding[],
  custom: Record<string, string>, // action → key
): Keybinding[] {
  const result = [...bindings]
  for (const [action, key] of Object.entries(custom)) {
    const existing = result.find((b) => b.action === action)
    if (existing) {
      existing.key = key
    }
  }
  return result
}

// ── Init (called from initConfig) ─────────────────────────────

export function initKeybindings(preset: KeybindingPreset, custom: Record<string, string>): void {
  const base = getPresetBindings(preset)
  const final = Object.keys(custom).length > 0 ? applyCustomBindings(base, custom) : base
  setKeybindings(final)
}

// ── Lookup ────────────────────────────────────────────────────

export function findBinding(key: string, context: string): Keybinding | undefined {
  const all = keybindings()

  // Context-specific takes priority over global
  const contextMatch = all.find((b) => b.key === key && b.context === context)
  if (contextMatch) return contextMatch

  return all.find((b) => b.key === key && b.context === "global")
}

export function getBindingsForContext(context: string): Keybinding[] {
  return keybindings().filter((b) => b.context === context || b.context === "global")
}

// ── Actions (useful for command palette) ──────────────────────

export function getAllActions(): Keybinding[] {
  // Return unique bindings by action — context-specific wins over global
  const seen = new Set<string>()
  const result: Keybinding[] = []
  for (const b of keybindings()) {
    const key = `${b.context}:${b.action}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(b)
    }
  }
  return result
}
