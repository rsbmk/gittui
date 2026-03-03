// src/ui/components/pr-sidebar-item.tsx
// Compact PR item for sidebar — 2-line layout with status icon and time ago

import { Show } from "solid-js"
import type { PullRequest } from "../../core/github/types.ts"
import { REVIEW_DECISION } from "../../core/github/types.ts"

// ── Constants ────────────────────────────────────────────────

const SELECTED_BG = "#313244"
const SELECTED_FG = "#89b4fa"
const DEFAULT_FG = "#cdd6f4"
const MUTED_FG = "#6c7086"
const MAX_TITLE_LENGTH = 30
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MS_PER_MINUTE = 60_000

// ── Props ────────────────────────────────────────────────────

export interface PRSidebarItemProps {
  pr: PullRequest
  selected: boolean
}

// ── Status mapping ───────────────────────────────────────────

interface StatusInfo {
  icon: string
  color: string
  label: string
}

function statusInfo(pr: PullRequest): StatusInfo {
  if (pr.draft) return { icon: "●", color: "#6c7086", label: "draft" }

  switch (pr.reviewDecision) {
    case REVIEW_DECISION.APPROVED:
      return { icon: "✓", color: "#a6e3a1", label: "approved" }
    case REVIEW_DECISION.CHANGES_REQUESTED:
      return { icon: "✗", color: "#f38ba8", label: "changes" }
    case REVIEW_DECISION.REVIEW_REQUIRED:
      return { icon: "○", color: "#f9e2af", label: "review" }
    default:
      return { icon: "○", color: "#6c7086", label: "pending" }
  }
}

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  if (!dateStr) return ""
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / MS_PER_MINUTE)
  if (mins < MINUTES_PER_HOUR) return `${mins}m`
  const hrs = Math.floor(mins / MINUTES_PER_HOUR)
  if (hrs < HOURS_PER_DAY) return `${hrs}h`
  const days = Math.floor(hrs / HOURS_PER_DAY)
  return `${days}d`
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + "…"
}

// ── Component ────────────────────────────────────────────────

export function PRSidebarItem(props: PRSidebarItemProps) {
  const status = () => statusInfo(props.pr)

  return (
    <box
      flexDirection="column"
      backgroundColor={props.selected ? SELECTED_BG : undefined}
      paddingLeft={1}
    >
      {/* Line 1: indicator + #number + truncated title */}
      <box flexDirection="row" height={1}>
        <text wrapMode="none" fg={props.selected ? SELECTED_FG : DEFAULT_FG}>
          {props.selected ? "▸ " : "  "}
        </text>
        <text wrapMode="none" fg={SELECTED_FG}>#{props.pr.number}</text>
        <text wrapMode="none" fg={DEFAULT_FG}>
          {" "}{truncate(props.pr.title, MAX_TITLE_LENGTH)}
        </text>
      </box>

      {/* Line 2: status icon + label + time ago */}
      <box flexDirection="row" height={1} paddingLeft={4}>
        <text wrapMode="none" fg={status().color}>
          {status().icon} {status().label}
        </text>
        <Show when={props.pr.updatedAt}>
          <text wrapMode="none" fg={MUTED_FG}>
            {"         "}{timeAgo(props.pr.updatedAt)}
          </text>
        </Show>
      </box>
    </box>
  )
}
