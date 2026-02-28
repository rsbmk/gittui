// src/state/keybindings.ts
// Keybinding registry — vim-style key mappings with context awareness

import { createSignal } from "solid-js"

// ── Types ─────────────────────────────────────────────────────

export interface Keybinding {
  key: string
  action: string
  context: string
  description: string
}

// ── Defaults ──────────────────────────────────────────────────

const DEFAULT_KEYBINDINGS: Keybinding[] = [
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
  { key: "j", action: "moveDown", context: "global", description: "Move down" },
  { key: "k", action: "moveUp", context: "global", description: "Move up" },
  { key: "down", action: "moveDown", context: "global", description: "Move down" },
  { key: "up", action: "moveUp", context: "global", description: "Move up" },

  // Files context
  { key: "space", action: "stage", context: "files", description: "Stage/unstage file" },
  { key: "a", action: "stageAll", context: "files", description: "Stage all" },
  { key: "c", action: "commit", context: "files", description: "Commit" },
  { key: "d", action: "discard", context: "files", description: "Discard changes" },
  { key: "n", action: "nextHunk", context: "files", description: "Next hunk" },
  { key: "p", action: "prevHunk", context: "files", description: "Previous hunk" },

  // Branches context
  { key: "enter", action: "checkout", context: "branches", description: "Checkout branch" },
  { key: "n", action: "newBranch", context: "branches", description: "New branch" },
  { key: "d", action: "deleteBranch", context: "branches", description: "Delete branch" },
  { key: "m", action: "merge", context: "branches", description: "Merge into current" },
  { key: "r", action: "rebase", context: "branches", description: "Rebase current onto" },

  // Commits context
  { key: "enter", action: "viewCommit", context: "commits", description: "View commit" },
  { key: "c", action: "cherryPick", context: "commits", description: "Cherry-pick" },
  { key: "r", action: "revert", context: "commits", description: "Revert commit" },

  // Stash context
  { key: "enter", action: "viewStash", context: "stash", description: "View stash" },
  { key: "a", action: "applyStash", context: "stash", description: "Apply stash" },
  { key: "p", action: "popStash", context: "stash", description: "Pop stash" },
  { key: "d", action: "dropStash", context: "stash", description: "Drop stash" },
  { key: "s", action: "saveStash", context: "stash", description: "Save stash" },
]

// ── Signal ────────────────────────────────────────────────────

export const [keybindings, setKeybindings] = createSignal<Keybinding[]>(DEFAULT_KEYBINDINGS)

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
