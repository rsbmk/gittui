// src/ui/components/branch-list.tsx
// Minimal branch sidebar — LOCAL/REMOTES sections with selection

import { createMemo, For, Show } from "solid-js"
import type { GitBranch } from "../../core/git/types.ts"
import { color } from "../../state/config.ts"

// ── Props ────────────────────────────────────────────────────

export interface BranchListProps {
  branches: GitBranch[]
  selectedIndex: number
  onSelect: (branch: GitBranch, index: number) => void
}

// ── Helpers ──────────────────────────────────────────────────

function trackingText(branch: GitBranch): string {
  const parts: string[] = []
  if (branch.ahead > 0) parts.push(`↑${branch.ahead}`)
  if (branch.behind > 0) parts.push(`↓${branch.behind}`)
  return parts.join(" ")
}

// ── Component ────────────────────────────────────────────────

export function BranchList(props: BranchListProps) {
  const localBranches = createMemo(() =>
    props.branches.filter((b) => !b.remote),
  )

  const remoteBranches = createMemo(() =>
    props.branches.filter((b) => !!b.remote),
  )

  return (
    <box flexDirection="column">
      {/* LOCAL section */}
      <Show when={localBranches().length > 0}>
        <text fg={color("muted")}>
          <b> LOCAL ({localBranches().length})</b>
        </text>
        <For each={localBranches()}>
          {(branch, i) => {
            const globalIndex = () => i()
            const isSelected = () => props.selectedIndex === globalIndex()
            const tracking = () => trackingText(branch)

            return (
              <box
                flexDirection="row"
                height={1}
                backgroundColor={isSelected() ? color("selection") : undefined}
              >
                <text wrapMode="none" fg={isSelected() ? color("accent") : undefined}>
                  {isSelected() ? "▸" : " "}
                </text>
                <text wrapMode="none" fg={branch.current ? color("success") : color("fg")}>
                  {branch.current ? "* " : "  "}
                  {branch.name}
                </text>
                <Show when={tracking()}>
                  <text wrapMode="none" fg={color("warning")}> {tracking()}</text>
                </Show>
              </box>
            )
          }}
        </For>
      </Show>

      {/* REMOTES section */}
      <Show when={remoteBranches().length > 0}>
        <text fg={color("muted")}>
          <b> REMOTES ({remoteBranches().length})</b>
        </text>
        <For each={remoteBranches()}>
          {(branch, i) => {
            const globalIndex = () => localBranches().length + i()
            const isSelected = () => props.selectedIndex === globalIndex()
            const tracking = () => trackingText(branch)

            return (
              <box
                flexDirection="row"
                height={1}
                backgroundColor={isSelected() ? color("selection") : undefined}
              >
                <text wrapMode="none" fg={isSelected() ? color("accent") : undefined}>
                  {isSelected() ? "▸" : " "}
                </text>
                <text wrapMode="none" fg={color("muted")}>
                  {"  "}
                  {branch.name}
                </text>
                <Show when={tracking()}>
                  <text wrapMode="none" fg={color("warning")}> {tracking()}</text>
                </Show>
              </box>
            )
          }}
        </For>
      </Show>
    </box>
  )
}
