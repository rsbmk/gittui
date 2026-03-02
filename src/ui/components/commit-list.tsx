// src/ui/components/commit-list.tsx
// Commit log — shows commits with hash, author, date, message, and ref badges

import { For, Show } from "solid-js"
import type { GitCommit } from "../../core/git/types.ts"

// ── Props ────────────────────────────────────────────────────

export interface CommitListProps {
  commits: GitCommit[]
  selectedIndex: number
  onSelect: (commit: GitCommit, index: number) => void
  compact?: boolean
}

// ── Helpers ──────────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + "…"
}

// ── Component ────────────────────────────────────────────────

export function CommitList(props: CommitListProps) {
  return (
    <box flexDirection="column">
      <text fg="#6c7086">
        <b> COMMITS ({props.commits.length}) </b>
      </text>

      <Show
        when={props.commits.length > 0}
        fallback={<text fg="#6c7086"> No commits found</text>}
      >
        <For each={props.commits}>
          {(commit, i) => {
            const isSelected = () => props.selectedIndex === i()

            return (
              <Show
                when={!props.compact}
                fallback={
                  <box flexDirection="row" height={1} backgroundColor={isSelected() ? "#313244" : undefined}>
                    <text wrapMode="none" fg={isSelected() ? "#cdd6f4" : "#cdd6f4"}>
                      {isSelected() ? "▸" : " "}
                    </text>
                    <text wrapMode="none" fg="#f9e2af">{commit.shortHash}</text>
                    <text wrapMode="none" fg="#cdd6f4"> {truncate(commit.message, 18)}</text>
                  </box>
                }
              >
                <box flexDirection="row" height={1} backgroundColor={isSelected() ? "#313244" : undefined}>
                  <text wrapMode="none" fg={isSelected() ? "#cdd6f4" : "#cdd6f4"}>
                    {isSelected() ? "▸" : " "}
                  </text>
                  <text wrapMode="none" fg="#f9e2af">{commit.shortHash}</text>
                  <text wrapMode="none" fg="#6c7086">  {commit.author}</text>
                  <text wrapMode="none" fg="#585b70">  {commit.relativeDate}</text>
                  <text wrapMode="none" fg="#cdd6f4">  {commit.message}</text>
                  {/* Ref badges */}
                  <Show when={commit.refs.length > 0}>
                    <For each={commit.refs}>
                      {(ref) => (
                        <text wrapMode="none" fg="#89b4fa"> [{ref}]</text>
                      )}
                    </For>
                  </Show>
                </box>
              </Show>
            )
          }}
        </For>
      </Show>
    </box>
  )
}
