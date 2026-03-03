// src/ui/layout/keybinding-bar.tsx
// Bottom bar — shows contextual keybinding hints with help indicator

import { createMemo, For, Show } from "solid-js"
import { activeTab, statusMessage } from "../../state/ui.ts"
import { getBindingsForContext, type Keybinding } from "../../state/keybindings.ts"
import { color } from "../../state/config.ts"

// ── Priority actions per context (shown in the bar) ──────────

const PRIORITY_ACTIONS: Record<string, string[]> = {
  files: ["stage", "stageAll", "commit", "ai-commit", "discard"],
  branches: ["checkout", "newBranch", "deleteBranch", "push", "pull", "merge"],
  commits: ["toggleBody", "cherryPick", "revert", "undo"],
  stash: ["viewStash", "applyStash", "popStash", "saveStash"],
  prs: ["viewPR", "openInBrowser", "mergePR", "filterPRs"],
  settings: ["openEditor"],
}

// ── Component ────────────────────────────────────────────────

export function KeybindingBar() {
  const hints = createMemo<Keybinding[]>(() => {
    const tab = activeTab()
    const all = getBindingsForContext(tab)
    const priority = PRIORITY_ACTIONS[tab] ?? []

    return priority
      .map((action) => all.find((b) => b.action === action))
      .filter((b): b is Keybinding => b !== undefined)
      .slice(0, 6)
  })

  const hiddenCount = createMemo(() => {
    const tab = activeTab()
    const contextBindings = getBindingsForContext(tab).filter((b) => b.context === tab)
    const shownContextBindings = hints().filter((b) => b.context === tab).length
    return Math.max(0, contextBindings.length - shownContextBindings)
  })

  return (
    <box flexDirection="row" width="100%" height={1} flexShrink={0} backgroundColor={color("bg")}>
      <text fg={color("muted")}> </text>
      <Show
        when={!statusMessage()}
        fallback={<text fg={color("warning")}>{statusMessage()}</text>}
      >
        <box flexGrow={1} overflow="hidden" flexDirection="row">
          <For each={hints()}>
            {(binding) => (
              <>
                <text fg={color("accent")}>[{binding.key}]</text>
                <text fg={color("muted")}> {binding.description} </text>
              </>
            )}
          </For>
        </box>
        <box flexShrink={0} flexDirection="row">
          <Show when={hiddenCount() > 0}>
            <text fg={color("muted")}>(+{hiddenCount()} more) </text>
          </Show>
          <text fg={color("accent")}>[?]</text>
          <text fg={color("muted")}> Help </text>
        </box>
      </Show>
    </box>
  )
}
