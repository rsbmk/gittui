// src/ui/layout/global-keys.tsx
// Invisible component — handles all global keyboard events

import { useKeyboard } from "@opentui/solid"
import {
  switchToTab,
  toggleSidebar,
  switchPanel,
  activeTab,
  selectedIndex,
  setSelectedIndex,
  TAB_ID,
  type TabId,
} from "../../state/ui.ts"
import { findBinding } from "../../state/keybindings.ts"
import { repo } from "../../state/repo.ts"

// ── Number key → tab mapping ─────────────────────────────────

const KEY_TO_TAB: Record<string, TabId> = {
  "1": TAB_ID.FILES,
  "2": TAB_ID.BRANCHES,
  "3": TAB_ID.COMMITS,
  "4": TAB_ID.STASH,
  "5": TAB_ID.PRS,
}

// ── File list length for j/k navigation ──────────────────────

function fileListLength(): number {
  const s = repo.status
  if (!s) return 0
  return s.unstaged.length + s.staged.length
}

// ── Component ────────────────────────────────────────────────

export function GlobalKeyHandler() {
  useKeyboard((key) => {
    // Tab switching: 1-5
    const tab = KEY_TO_TAB[key.name]
    if (tab) {
      switchToTab(tab)
      return
    }

    // Global navigation
    switch (key.name) {
      case "tab":
        switchPanel()
        return
      case "ctrl+b":
        toggleSidebar()
        return
      case "q":
        process.exit(0)
        return
      case "j":
      case "down": {
        const max = fileListLength()
        if (max > 0) {
          setSelectedIndex((prev) => Math.min(prev + 1, max - 1))
        }
        return
      }
      case "k":
      case "up": {
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }
    }

    // Context-specific bindings (placeholder — handlers come later)
    const binding = findBinding(key.name, activeTab())
    if (binding && binding.context !== "global") {
      // Future: executeBinding(binding)
    }
  })

  // Renders nothing — keyboard-only component
  return null
}
