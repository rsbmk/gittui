// src/ui/components/pr-card.tsx
// PR card — shows PR summary with status badges and stats

import { Show } from "solid-js"
import type { PullRequest } from "../../core/github/types.ts"
import { REVIEW_DECISION } from "../../core/github/types.ts"

// ── Props ────────────────────────────────────────────────────

export interface PRCardProps {
  pr: PullRequest
  selected: boolean
}

// ── Helpers ──────────────────────────────────────────────────

function reviewBadge(pr: PullRequest): { text: string; color: string } {
  if (pr.draft) return { text: "draft", color: "#6c7086" }

  switch (pr.reviewDecision) {
    case REVIEW_DECISION.APPROVED:
      return { text: "approved", color: "#a6e3a1" }
    case REVIEW_DECISION.CHANGES_REQUESTED:
      return { text: "changes", color: "#f38ba8" }
    case REVIEW_DECISION.REVIEW_REQUIRED:
      return { text: "review", color: "#f9e2af" }
    default:
      return { text: "pending", color: "#6c7086" }
  }
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ""
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Component ────────────────────────────────────────────────

export function PRCard(props: PRCardProps) {
  const badge = () => reviewBadge(props.pr)

  return (
    <box
      flexDirection="column"
      backgroundColor={props.selected ? "#313244" : undefined}
      paddingLeft={1}
    >
      {/* Line 1: number + title + author */}
      <box flexDirection="row">
        <text fg={props.selected ? "#89b4fa" : "#cdd6f4"}>
          {props.selected ? "▸" : " "}
        </text>
        <text fg="#89b4fa">#{props.pr.number}</text>
        <text fg="#cdd6f4"> {truncate(props.pr.title, 45)}</text>
        <text fg="#6c7086"> {props.pr.author}</text>
      </box>

      {/* Line 2: badges + stats + time */}
      <box flexDirection="row" paddingLeft={3}>
        <text fg={badge().color}>{badge().text}</text>
        <text fg="#a6e3a1"> +{props.pr.additions}</text>
        <text fg="#f38ba8"> -{props.pr.deletions}</text>
        <text fg="#6c7086"> {props.pr.changedFiles} files</text>
        <Show when={props.pr.updatedAt}>
          <text fg="#6c7086"> {timeAgo(props.pr.updatedAt)}</text>
        </Show>
      </box>
    </box>
  )
}

// ── Utils ────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + "…"
}
