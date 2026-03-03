// src/ui/views/branch-detail.tsx
// Branch detail panel — shows branch info and diff summary vs current

import { Show, For } from "solid-js"
import type { Accessor } from "solid-js"
import { color } from "../../state/config.ts"
import { getStatusColor } from "../../lib/theme.ts"
import type { GitBranch, FileStatus } from "../../core/git/types.ts"

// ── Types ────────────────────────────────────────────────────

export interface BranchDiffFile {
  status: string
  path: string
}

interface BranchDetailProps {
  branch: GitBranch | undefined
  currentBranch: string
  changedFiles: BranchDiffFile[]
  loading: boolean
}

// ── Helpers ──────────────────────────────────────────────────

function statusColor(status: string): string {
  return color(getStatusColor(status as FileStatus))
}

function sectionHeader(label: string): string {
  const pad = Math.max(0, 48 - label.length - 5)
  return `── ${label} ${"─".repeat(pad)}`
}

// ── Component ────────────────────────────────────────────────

export function BranchDetail(props: BranchDetailProps) {
  const isCurrentBranch = () => props.branch?.name === props.currentBranch

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      <Show when={!props.loading} fallback={
        <text wrapMode="none" fg={color("muted")}>Loading...</text>
      }>
        <Show when={props.branch} fallback={
          <text wrapMode="none" fg={color("muted")}>No branch selected</text>
        }>
          {(branch: Accessor<GitBranch>) => (
            <box flexDirection="column" flexGrow={1} gap={1}>
              {/* ── Branch Name ──────────────────────────── */}
              <box flexDirection="column" flexShrink={0}>
                <text wrapMode="none" fg={color("accent")}>
                  <b>{branch().name}</b>
                </text>

                <Show when={isCurrentBranch()}>
                  <text wrapMode="none" fg={color("success")}>✓ Current branch</text>
                </Show>

                <Show when={branch().upstream}>
                  <text wrapMode="none" fg={color("muted")}>
                    Upstream: {branch().upstream}
                  </text>
                </Show>

                {/* ── Ahead / Behind ────────────────────── */}
                <box flexDirection="row" gap={1} flexShrink={0}>
                  <text
                    wrapMode="none"
                    fg={branch().ahead > 0 ? color("warning") : color("muted")}
                  >
                    ↑{branch().ahead} ahead
                  </text>
                  <text
                    wrapMode="none"
                    fg={branch().behind > 0 ? color("error") : color("muted")}
                  >
                    ↓{branch().behind} behind
                  </text>
                </box>

                {/* ── Last Commit ────────────────────────── */}
                <text wrapMode="none" fg={color("muted")}>
                  Last commit: {branch().lastCommit}
                </text>
              </box>

              {/* ── Changed Files Section ────────────────── */}
              <Show when={!isCurrentBranch()}>
                <box flexDirection="column" flexGrow={1}>
                  <text wrapMode="none" fg={color("border")}>
                    {sectionHeader(`Changed vs ${props.currentBranch}`)}
                  </text>

                  <Show
                    when={props.changedFiles.length > 0}
                    fallback={
                      <text wrapMode="none" fg={color("muted")}>
                        No file changes
                      </text>
                    }
                  >
                    <scrollbox flexGrow={1}>
                      <For each={props.changedFiles}>
                        {(file) => (
                          <box flexDirection="row" flexShrink={0}>
                            <text wrapMode="none" fg={statusColor(file.status)}>
                              {"  "}{file.status}
                            </text>
                            <text wrapMode="none" fg={color("fg")}>
                              {"  "}{file.path}
                            </text>
                          </box>
                        )}
                      </For>
                    </scrollbox>

                    <box flexShrink={0}>
                      <text wrapMode="none" fg={color("muted")}>
                        {props.changedFiles.length} file{props.changedFiles.length !== 1 ? "s" : ""} changed
                      </text>
                    </box>
                  </Show>
                </box>
              </Show>
            </box>
          )}
        </Show>
      </Show>
    </box>
  )
}
