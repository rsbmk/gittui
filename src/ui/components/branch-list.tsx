// src/ui/components/branch-list.tsx
// Branch list — shows local/remote branches with ahead/behind indicators

import { createMemo, For, Show } from "solid-js"
import type { GitBranch } from "../../core/git/types.ts"

// ── Filter ───────────────────────────────────────────────────

export const BRANCH_FILTER = {
  LOCAL: "local",
  REMOTE: "remote",
  ALL: "all",
} as const

export type BranchFilter = (typeof BRANCH_FILTER)[keyof typeof BRANCH_FILTER]

// ── Props ────────────────────────────────────────────────────

export interface BranchListProps {
  branches: GitBranch[]
  selectedIndex: number
  filter: BranchFilter
  onSelect: (branch: GitBranch, index: number) => void
}

// ── Component ────────────────────────────────────────────────

export function BranchList(props: BranchListProps) {
  const filteredBranches = createMemo(() => {
    switch (props.filter) {
      case BRANCH_FILTER.LOCAL:
        return props.branches.filter((b) => !b.remote)
      case BRANCH_FILTER.REMOTE:
        return props.branches.filter((b) => !!b.remote)
      case BRANCH_FILTER.ALL:
        return props.branches
    }
  })

  return (
    <box flexDirection="column">
      {/* Filter indicator */}
      <text fg="#6c7086">
        <b> BRANCHES ({filteredBranches().length}) [{props.filter}] </b>
      </text>

      <Show
        when={filteredBranches().length > 0}
        fallback={<text fg="#6c7086"> No branches found</text>}
      >
        <For each={filteredBranches()}>
          {(branch, i) => {
            const isSelected = () => props.selectedIndex === i()
            const isCurrentBranch = () => branch.current

            // Ahead/behind indicator
            const trackingInfo = () => {
              const parts: string[] = []
              if (branch.ahead > 0) parts.push(`↑${branch.ahead}`)
              if (branch.behind > 0) parts.push(`↓${branch.behind}`)
              return parts.join(" ")
            }

            return (
              <box flexDirection="row" height={1} backgroundColor={isSelected() ? "#313244" : undefined}>
                <text wrapMode="none" fg={isCurrentBranch() ? "#a6e3a1" : branch.remote ? "#6c7086" : "#cdd6f4"}>
                  {isSelected() ? "▸" : " "}
                  {isCurrentBranch() ? "* " : "  "}
                  {branch.name}
                </text>
                <Show when={trackingInfo()}>
                  <text wrapMode="none" fg="#f9e2af"> {trackingInfo()}</text>
                </Show>
                <Show when={branch.upstream}>
                  <text wrapMode="none" fg="#6c7086"> → {branch.upstream}</text>
                </Show>
              </box>
            )
          }}
        </For>
      </Show>
    </box>
  )
}
