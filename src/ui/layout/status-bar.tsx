// src/ui/layout/status-bar.tsx
// Top bar: repo name, branch info, file counters, merge state

import { Show } from "solid-js"
import { repo } from "../../state/repo.ts"
import { MERGE_STATE } from "../../core/git/types.ts"
import type { MergeState } from "../../core/git/types.ts"

// ── Merge State Label ────────────────────────────────────────

function mergeStateLabel(state: MergeState): string {
  switch (state.type) {
    case MERGE_STATE.MERGING:
      return state.source ? `MERGING ← ${state.source}` : "MERGING"
    case MERGE_STATE.REBASING:
      return "REBASING"
    case MERGE_STATE.CHERRY_PICKING:
      return "CHERRY-PICKING"
    case MERGE_STATE.REVERTING:
      return "REVERTING"
    default:
      return ""
  }
}

// ── Component ────────────────────────────────────────────────

export function StatusBar() {
  const branch = () => repo.status?.branch ?? "unknown"
  const stagedCount = () => repo.status?.staged.length ?? 0
  const unstagedCount = () => repo.status?.unstaged.length ?? 0
  const untrackedCount = () => repo.status?.untracked.length ?? 0
  const mergeState = () => repo.mergeState
  const isMerging = () => {
    const ms = mergeState()
    return ms !== null && ms.type !== MERGE_STATE.NONE
  }

  return (
    <box flexDirection="row" width="100%" height={1} backgroundColor="#1e1e2e">
      <text fg="#89b4fa">
        <b> gittui </b>
      </text>

      <box flexGrow={1} />

      {/* Merge state indicator */}
      <Show when={isMerging()}>
        <text fg="#f38ba8">
          <b> ⚠ {mergeStateLabel(mergeState()!)} </b>
        </text>
      </Show>

      <text fg="#cba6f7"> {branch()} </text>
      <text fg="#a6e3a1">+{stagedCount()}</text>
      <text fg="#f9e2af"> ~{unstagedCount()}</text>
      <text fg="#6c7086"> ?{untrackedCount()}</text>

      <box flexGrow={1} />
    </box>
  )
}
