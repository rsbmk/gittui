// src/ui/layout/keybinding-bar.tsx
// Bottom bar — shows contextual keybinding hints

import { createMemo, For } from "solid-js"
import { activeTab } from "../../state/ui.ts"
import { getBindingsForContext, type Keybinding } from "../../state/keybindings.ts"

// Only show the most useful bindings per context (fits one line)
const PRIORITY_ACTIONS: Record<string, string[]> = {
  files: ["stage", "stageAll", "commit", "discard", "switchPanel", "quit"],
  branches: ["checkout", "newBranch", "deleteBranch", "merge", "switchPanel", "quit"],
  commits: ["viewCommit", "cherryPick", "revert", "switchPanel", "quit"],
  stash: ["viewStash", "applyStash", "popStash", "saveStash", "switchPanel", "quit"],
  prs: ["switchPanel", "quit"],
}

export function KeybindingBar() {
  const hints = createMemo<Keybinding[]>(() => {
    const tab = activeTab()
    const all = getBindingsForContext(tab)
    const priority = PRIORITY_ACTIONS[tab] ?? []

    // Pick priority actions first, then fill up to 6
    const prioritized = priority
      .map((action) => all.find((b) => b.action === action))
      .filter((b): b is Keybinding => b !== undefined)

    return prioritized.slice(0, 6)
  })

  return (
    <box flexDirection="row" width="100%" height={1} backgroundColor="#1e1e2e">
      <text fg="#6c7086"> </text>
      <For each={hints()}>
        {(binding) => (
          <>
            <text fg="#89b4fa">[{binding.key}]</text>
            <text fg="#6c7086"> {binding.description}  </text>
          </>
        )}
      </For>
    </box>
  )
}
