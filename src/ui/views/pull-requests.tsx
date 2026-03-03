// src/ui/views/pull-requests.tsx
// Pull Requests tab — always shows detail for focused PR, with file diff sub-view

import { createSignal, For, Show, onMount, onCleanup } from "solid-js"
import type { Accessor } from "solid-js"
import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/solid"
import { ScrollList } from "../components/scroll-list.tsx"
import { DiffView } from "./diff.tsx"
import {
  prs,
  prSelectedIndex,
  setPRSelectedIndex,
  prFileSelectedIndex,
  setPRFileSelectedIndex,
  prListLength,
  viewingFileDiff,
  setViewingFileDiff,
  focusedPR,
  checkGhAvailable,
  refreshPRs,
  initPRAutoLoad,
  closeFileDiff,
  submitReview,
  merge,
  openInBrowser,
  cycleFilter,
} from "../../state/prs.ts"
import { registerAction, unregisterAction } from "../../state/actions.ts"
import { withDialog } from "../../state/ui.ts"
import { parseDiff } from "../../core/git/parser.ts"
import {
  REVIEW_DECISION,
  REVIEW_EVENT,
  REVIEW_STATE,
  MERGE_METHOD,
  MERGEABLE_STATUS,
  PR_FILE_STATUS,
} from "../../core/github/types.ts"
import type {
  PullRequest,
  PRFile,
  ReviewEvent,
  MergeableStatus,
  ReviewState,
  PRFileStatus,
} from "../../core/github/types.ts"
import type { FileDiff } from "../../core/git/types.ts"

// ── Constants ────────────────────────────────────────────────

const COLOR_BLUE = "#89b4fa"
const COLOR_GREEN = "#a6e3a1"
const COLOR_RED = "#f38ba8"
const COLOR_YELLOW = "#f9e2af"
const COLOR_GRAY = "#6c7086"
const COLOR_LIGHT = "#cdd6f4"
const COLOR_SEPARATOR = "#45475a"
const COLOR_SELECTED_BG = "#313244"

const MAX_BODY_LINES = 10
const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24

// ── PR view state ────────────────────────────────────────────

const [prFileDiff, setPRFileDiff] = createSignal<FileDiff | null>(null)

// ── Status Badge Helpers ─────────────────────────────────────

interface Badge {
  icon: string
  text: string
  color: string
}

interface MergeableBadge {
  text: string
  color: string
}

function statusBadge(pr: PullRequest): Badge {
  if (pr.draft) return { icon: "●", text: "Draft", color: COLOR_GRAY }

  switch (pr.reviewDecision) {
    case REVIEW_DECISION.APPROVED:
      return { icon: "✓", text: "Approved", color: COLOR_GREEN }
    case REVIEW_DECISION.CHANGES_REQUESTED:
      return { icon: "✗", text: "Changes Requested", color: COLOR_RED }
    case REVIEW_DECISION.REVIEW_REQUIRED:
      return { icon: "○", text: "Review Required", color: COLOR_YELLOW }
    default:
      return { icon: "○", text: "Pending", color: COLOR_GRAY }
  }
}

function mergeableBadge(status: MergeableStatus): MergeableBadge {
  switch (status) {
    case MERGEABLE_STATUS.MERGEABLE:
      return { text: "✓ Mergeable", color: COLOR_GREEN }
    case MERGEABLE_STATUS.CONFLICTING:
      return { text: "✗ Conflicts", color: COLOR_RED }
    default:
      return { text: "? Unknown", color: COLOR_GRAY }
  }
}

function reviewIcon(state: ReviewState): string {
  switch (state) {
    case REVIEW_STATE.APPROVED:
      return "✓"
    case REVIEW_STATE.CHANGES_REQUESTED:
      return "✗"
    case REVIEW_STATE.COMMENTED:
      return "💬"
    case REVIEW_STATE.PENDING:
      return "○"
    default:
      return "?"
  }
}

function reviewColor(state: ReviewState): string {
  switch (state) {
    case REVIEW_STATE.APPROVED:
      return COLOR_GREEN
    case REVIEW_STATE.CHANGES_REQUESTED:
      return COLOR_RED
    case REVIEW_STATE.COMMENTED:
      return COLOR_BLUE
    default:
      return COLOR_GRAY
  }
}

function fileStatusColor(status: PRFileStatus): string {
  switch (status) {
    case PR_FILE_STATUS.ADDED:
      return COLOR_GREEN
    case PR_FILE_STATUS.REMOVED:
      return COLOR_RED
    case PR_FILE_STATUS.MODIFIED:
      return COLOR_YELLOW
    case PR_FILE_STATUS.RENAMED:
      return COLOR_BLUE
    default:
      return COLOR_LIGHT
  }
}

function fileStatusIcon(status: PRFileStatus): string {
  switch (status) {
    case PR_FILE_STATUS.ADDED:
      return "A"
    case PR_FILE_STATUS.REMOVED:
      return "D"
    case PR_FILE_STATUS.MODIFIED:
      return "M"
    case PR_FILE_STATUS.RENAMED:
      return "R"
    default:
      return "?"
  }
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ""
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / MS_PER_MINUTE)
  if (mins < MINUTES_PER_HOUR) return `${mins}m ago`
  const hrs = Math.floor(mins / MINUTES_PER_HOUR)
  if (hrs < HOURS_PER_DAY) return `${hrs}h ago`
  const days = Math.floor(hrs / HOURS_PER_DAY)
  return `${days}d ago`
}

function truncateBody(body: string, maxLines: number): string {
  const lines = body.split("\n")
  if (lines.length <= maxLines) return body
  return lines.slice(0, maxLines).join("\n") + "\n..."
}

// ── Actions (exported for global-keys) ───────────────────────

export function handleViewFile(): void {
  const file = prs.files[prFileSelectedIndex()]
  if (!file) return

  const allDiffs = parseDiff(prs.diff)
  const fileDiff = allDiffs.find((d) => d.path === file.path) ?? null
  setPRFileDiff(fileDiff)
  if (fileDiff) setViewingFileDiff(true)
}

export function handleCloseFileDiff(): void {
  closeFileDiff()
  setPRFileDiff(null)
}

export async function handleOpenInBrowser(): Promise<void> {
  await openInBrowser()
}

export function handleCycleFilter(): void {
  cycleFilter()
}

// Navigation re-exports
export { prSelectedIndex, setPRSelectedIndex, prListLength, viewingFileDiff, focusedPR }

// ── Component ────────────────────────────────────────────────

export function PullRequestsView() {
  const dialog = useDialog()

  onMount(async () => {
    await checkGhAvailable()
    if (prs.ghAvailable) {
      await refreshPRs()
    }

    initPRAutoLoad()

    registerAction("submitReview", promptReview)
    registerAction("mergePR", promptMerge)
  })

  onCleanup(() => {
    unregisterAction("submitReview")
    unregisterAction("mergePR")
  })

  // ── Review prompt ──────────────────────────────────────────

  async function promptReview(): Promise<void> {
    if (!prs.selected) return

    const result = await withDialog(() => dialog.prompt<{ event: ReviewEvent; body: string }>({
      content: (ctx) => {
        const events: Array<{ value: ReviewEvent; label: string; color: string }> = [
          { value: REVIEW_EVENT.APPROVE, label: "Approve", color: COLOR_GREEN },
          { value: REVIEW_EVENT.REQUEST_CHANGES, label: "Request Changes", color: COLOR_RED },
          { value: REVIEW_EVENT.COMMENT, label: "Comment", color: COLOR_BLUE },
        ]

        const [selectedEvent, setSelectedEvent] = createSignal(0)
        const [body, setBody] = createSignal("")

        useDialogKeyboard((key) => {
          if (key.name === "left") {
            setSelectedEvent((prev) => Math.max(0, prev - 1))
          }
          if (key.name === "right") {
            setSelectedEvent((prev) => Math.min(events.length - 1, prev + 1))
          }
          if (key.name === "return" || key.name === "enter") {
            const event = events[selectedEvent()]!
            ctx.resolve({ event: event.value, body: body() })
          }
          if (key.name === "escape") ctx.dismiss()
        }, ctx.dialogId)

        return () => (
          <box flexDirection="column" width={60} gap={1}>
            <text fg={COLOR_BLUE}>
              <b> Submit Review — #{prs.selected!.number} </b>
            </text>

            {/* Event selector */}
            <box flexDirection="row" gap={1}>
              <For each={events}>
                {(evt, i) => (
                  <text fg={selectedEvent() === i() ? evt.color : COLOR_GRAY}>
                    {selectedEvent() === i() ? `[${evt.label}]` : ` ${evt.label} `}
                  </text>
                )}
              </For>
            </box>

            {/* Body input */}
            <text fg={COLOR_LIGHT}> Review body (optional):</text>
            <input
              value=""
              onInput={(value) => setBody(value)}
              width={58}
              focused={true}
            />

            <box flexDirection="row" gap={2}>
              <text fg={COLOR_GRAY}> ←/→: type </text>
              <text fg={COLOR_GRAY}> Enter: submit </text>
              <text fg={COLOR_GRAY}> Esc: cancel </text>
            </box>
          </box>
        )
      },
    }))

    if (result) {
      await submitReview(result.event, result.body)
    }
  }

  // ── Merge prompt ───────────────────────────────────────────

  async function promptMerge(): Promise<void> {
    if (!prs.selected) return

    const methods = [
      { value: MERGE_METHOD.SQUASH, label: "Squash", desc: "Squash and merge" },
      { value: MERGE_METHOD.MERGE, label: "Merge", desc: "Create merge commit" },
      { value: MERGE_METHOD.REBASE, label: "Rebase", desc: "Rebase and merge" },
    ] as const

    const result = await withDialog(() => dialog.prompt<typeof methods[number]["value"]>({
      content: (ctx) => {
        const [selected, setSelected] = createSignal(0)

        useDialogKeyboard((key) => {
          if (key.name === "j" || key.name === "down") {
            setSelected((prev) => Math.min(methods.length - 1, prev + 1))
          }
          if (key.name === "k" || key.name === "up") {
            setSelected((prev) => Math.max(0, prev - 1))
          }
          if (key.name === "return" || key.name === "enter") {
            ctx.resolve(methods[selected()]!.value)
          }
          if (key.name === "escape") ctx.dismiss()
        }, ctx.dialogId)

        return () => (
          <box flexDirection="column" width={50} gap={1}>
            <text fg={COLOR_BLUE}>
              <b> Merge PR #{prs.selected!.number} </b>
            </text>

            <For each={methods}>
              {(m, i) => (
                <box flexDirection="row">
                  <text fg={selected() === i() ? COLOR_BLUE : COLOR_GRAY}>
                    {selected() === i() ? " ▸ " : "   "}
                  </text>
                  <text fg={selected() === i() ? COLOR_LIGHT : COLOR_GRAY}>
                    {m.label}
                  </text>
                  <text fg={COLOR_GRAY}> — {m.desc}</text>
                </box>
              )}
            </For>

            <box flexDirection="row" gap={2}>
              <text fg={COLOR_GRAY}> j/k: select </text>
              <text fg={COLOR_GRAY}> Enter: merge </text>
              <text fg={COLOR_GRAY}> Esc: cancel </text>
            </box>
          </box>
        )
      },
    }))

    if (result) {
      await merge(result)
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* gh not available */}
      <Show when={!prs.ghAvailable}>
        <box flexDirection="column" padding={2}>
          <text fg={COLOR_RED}>
            <b> GitHub CLI not found </b>
          </text>
          <text fg={COLOR_LIGHT}> Install gh CLI: https://cli.github.com</text>
          <text fg={COLOR_GRAY}> Then run: gh auth login</text>
        </box>
      </Show>

      {/* Loading list */}
      <Show when={prs.ghAvailable && prs.loading && prs.list.length === 0}>
        <text fg={COLOR_GRAY}> Loading PRs...</text>
      </Show>

      {/* Error */}
      <Show when={prs.error}>
        {(error: Accessor<string>) => (
          <text fg={COLOR_RED}> Error: {error()}</text>
        )}
      </Show>

      {/* Empty list */}
      <Show when={prs.ghAvailable && !prs.loading && prs.list.length === 0 && !prs.error}>
        <text fg={COLOR_GRAY}> No pull requests found</text>
      </Show>

      {/* PR Detail (always shown when a PR is selected) */}
      <Show when={prs.ghAvailable && prs.selected}>
        {(pr: Accessor<PullRequest>) => (
          <box flexDirection="column" flexGrow={1}>
            {/* File diff sub-view */}
            <Show when={viewingFileDiff() && prFileDiff()}>
              {(diff: Accessor<FileDiff>) => (
                <box flexDirection="column" flexGrow={1}>
                  <text fg={COLOR_BLUE}>
                    <b> {diff().path} </b>
                  </text>
                  <DiffView fileDiff={diff()} />
                </box>
              )}
            </Show>

            {/* PR detail view */}
            <Show when={!viewingFileDiff()}>
              <ScrollList selectedRow={prFileSelectedIndex()} flexGrow={1}>
                <box flexDirection="column" paddingLeft={1}>
                  {/* ── Header ────────────────────────────── */}
                  <box flexDirection="row">
                    <text fg={COLOR_BLUE}>
                      <b>#{pr().number}</b>
                    </text>
                    <text fg={COLOR_LIGHT}>
                      {"  "}{pr().title}
                    </text>
                  </box>

                  {/* ── Metadata ──────────────────────────── */}
                  <box flexDirection="row" gap={1}>
                    <text fg={statusBadge(pr()).color}>
                      {statusBadge(pr()).icon} {statusBadge(pr()).text}
                    </text>
                    <text fg={COLOR_GRAY}>·</text>
                    <text fg={COLOR_GRAY}>{pr().author}</text>
                    <text fg={COLOR_GRAY}>·</text>
                    <text fg={COLOR_GRAY}>{timeAgo(pr().updatedAt)}</text>
                  </box>
                  <box flexDirection="row" gap={1}>
                    <text fg={COLOR_LIGHT}>{pr().branch} → {pr().baseBranch}</text>
                    <text fg={COLOR_GRAY}>·</text>
                    <text fg={mergeableBadge(pr().mergeable).color}>
                      {mergeableBadge(pr().mergeable).text}
                    </text>
                  </box>

                  {/* ── Stats ─────────────────────────────── */}
                  <text fg={COLOR_SEPARATOR}>── Stats ──────────────────────────────────────</text>
                  <box flexDirection="row" gap={1}>
                    <text fg={COLOR_GREEN}>+{pr().additions}</text>
                    <text fg={COLOR_RED}>-{pr().deletions}</text>
                    <text fg={COLOR_GRAY}>·</text>
                    <text fg={COLOR_LIGHT}>{pr().changedFiles} file{pr().changedFiles !== 1 ? "s" : ""} changed</text>
                  </box>

                  {/* ── Description ────────────────────────── */}
                  <Show when={pr().body}>
                    <text fg={COLOR_SEPARATOR}>── Description ────────────────────────────────</text>
                    <text fg={COLOR_LIGHT}>{truncateBody(pr().body, MAX_BODY_LINES)}</text>
                  </Show>

                  {/* ── Detail Loading ─────────────────────── */}
                  <Show when={prs.detailLoading}>
                    <text fg={COLOR_GRAY}> Loading details...</text>
                  </Show>

                  {/* ── Reviews ────────────────────────────── */}
                  <Show when={!prs.detailLoading && prs.reviews.length > 0}>
                    <text fg={COLOR_SEPARATOR}>── Reviews ({prs.reviews.length}) ──────────────────────────────</text>
                    <For each={prs.reviews}>
                      {(review) => (
                        <box flexDirection="row" paddingLeft={1} gap={1}>
                          <text fg={reviewColor(review.state)}>
                            {reviewIcon(review.state)} {review.state}
                          </text>
                          <text fg={COLOR_GRAY}>by {review.author}</text>
                          <text fg={COLOR_GRAY}>·</text>
                          <text fg={COLOR_GRAY}>{timeAgo(review.submittedAt)}</text>
                        </box>
                      )}
                    </For>
                  </Show>

                  {/* ── Files ──────────────────────────────── */}
                  <Show when={!prs.detailLoading}>
                    <text fg={COLOR_SEPARATOR}>── Files ({prs.files.length}) ──────────────────────────────────</text>
                    <For each={prs.files}>
                      {(file, i) => {
                        const isSelected = () => prFileSelectedIndex() === i()
                        return (
                          <box flexDirection="row" backgroundColor={isSelected() ? COLOR_SELECTED_BG : undefined}>
                            <text fg={isSelected() ? COLOR_BLUE : COLOR_LIGHT}>
                              {isSelected() ? " ▸ " : "   "}
                            </text>
                            <text fg={fileStatusColor(file.status)}>
                              {fileStatusIcon(file.status)}
                            </text>
                            <text fg={COLOR_LIGHT}>{"  "}{file.path}</text>
                            <text fg={COLOR_GREEN}>{" "}+{file.additions}</text>
                            <text fg={COLOR_RED}> -{file.deletions}</text>
                          </box>
                        )
                      }}
                    </For>
                  </Show>
                </box>
              </ScrollList>
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}
