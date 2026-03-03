// src/ui/views/pull-requests.tsx
// Pull Requests tab — list, detail, review, merge via gh CLI

import { createSignal, For, Show, onMount, onCleanup, type Accessor } from "solid-js"
import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/solid"
import { PRCard } from "../components/pr-card.tsx"
import { ScrollList } from "../components/scroll-list.tsx"
import { DiffView } from "./diff.tsx"
import {
  prs,
  prSelectedIndex,
  setPRSelectedIndex,
  prFileSelectedIndex,
  setPRFileSelectedIndex,
  prListLength,
  viewingPRDetail,
  checkGhAvailable,
  refreshPRs,
  selectPR,
  closePRDetail,
  submitReview,
  merge,
  openInBrowser,
  cycleFilter,
} from "../../state/prs.ts"
import { registerAction, unregisterAction } from "../../state/actions.ts"
import { withDialog } from "../../state/ui.ts"
import { parseDiff } from "../../core/git/parser.ts"
import { REVIEW_EVENT, MERGE_METHOD, type ReviewEvent } from "../../core/github/types.ts"
import type { FileDiff } from "../../core/git/types.ts"

// ── PR view state ────────────────────────────────────────────

const [prFileDiff, setPRFileDiff] = createSignal<FileDiff | null>(null)

// ── Actions (exported for global-keys) ───────────────────────

export async function handleSelectPR(): Promise<void> {
  const pr = prs.list[prSelectedIndex()]
  if (!pr) return
  await selectPR(pr.number)
}

export function handleClosePRDetail(): void {
  closePRDetail()
  setPRFileDiff(null)
}

export function handleViewFile(): void {
  const file = prs.files[prFileSelectedIndex()]
  if (!file) return

  // Parse the full PR diff and find the matching file
  const allDiffs = parseDiff(prs.diff)
  const fileDiff = allDiffs.find((d) => d.path === file.path) ?? null
  setPRFileDiff(fileDiff)
}

export async function handleOpenInBrowser(): Promise<void> {
  await openInBrowser()
}

export function handleCycleFilter(): void {
  cycleFilter()
}

// Navigation exports
export { prSelectedIndex, setPRSelectedIndex, prListLength, viewingPRDetail }

// ── Component ────────────────────────────────────────────────

export function PullRequestsView() {
  const dialog = useDialog()

  onMount(async () => {
    await checkGhAvailable()
    if (prs.ghAvailable) {
      await refreshPRs()
    }

    // Register dialog-based actions
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
          { value: REVIEW_EVENT.APPROVE, label: "Approve", color: "#a6e3a1" },
          { value: REVIEW_EVENT.REQUEST_CHANGES, label: "Request Changes", color: "#f38ba8" },
          { value: REVIEW_EVENT.COMMENT, label: "Comment", color: "#89b4fa" },
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
            <text fg="#89b4fa">
              <b> Submit Review — #{prs.selected!.number} </b>
            </text>

            {/* Event selector */}
            <box flexDirection="row" gap={1}>
              <For each={events}>
                {(evt, i) => (
                  <text fg={selectedEvent() === i() ? evt.color : "#6c7086"}>
                    {selectedEvent() === i() ? `[${evt.label}]` : ` ${evt.label} `}
                  </text>
                )}
              </For>
            </box>

            {/* Body input */}
            <text fg="#cdd6f4"> Review body (optional):</text>
            <input
              value=""
              onInput={(value) => setBody(value)}
              width={58}
              focused={true}
            />

            <box flexDirection="row" gap={2}>
              <text fg="#6c7086"> ←/→: type </text>
              <text fg="#6c7086"> Enter: submit </text>
              <text fg="#6c7086"> Esc: cancel </text>
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
            <text fg="#89b4fa">
              <b> Merge PR #{prs.selected!.number} </b>
            </text>

            <For each={methods}>
              {(m, i) => (
                <box flexDirection="row">
                  <text fg={selected() === i() ? "#89b4fa" : "#6c7086"}>
                    {selected() === i() ? " ▸ " : "   "}
                  </text>
                  <text fg={selected() === i() ? "#cdd6f4" : "#6c7086"}>
                    {m.label}
                  </text>
                  <text fg="#6c7086"> — {m.desc}</text>
                </box>
              )}
            </For>

            <box flexDirection="row" gap={2}>
              <text fg="#6c7086"> j/k: select </text>
              <text fg="#6c7086"> Enter: merge </text>
              <text fg="#6c7086"> Esc: cancel </text>
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
          <text fg="#f38ba8">
            <b> GitHub CLI not found </b>
          </text>
          <text fg="#cdd6f4"> Install gh CLI: https://cli.github.com</text>
          <text fg="#6c7086"> Then run: gh auth login</text>
        </box>
      </Show>

      {/* Loading */}
      <Show when={prs.ghAvailable && prs.loading}>
        <text fg="#6c7086"> Loading PRs...</text>
      </Show>

      {/* Error */}
      <Show when={prs.error}>
        {(error: Accessor<string>) => (
          <text fg="#f38ba8"> Error: {error()}</text>
        )}
      </Show>

      {/* PR Detail View */}
      <Show when={prs.ghAvailable && viewingPRDetail() && prs.selected}>
        {(pr: Accessor<PullRequest>) => (
          <box flexDirection="column" flexGrow={1}>
            {/* PR header */}
            <box flexDirection="column" paddingLeft={1}>
              <box flexDirection="row">
                <text fg="#89b4fa">
                  <b>#{pr().number}</b>
                </text>
                <text fg="#cdd6f4">
                  {" "}{pr().title}
                </text>
              </box>
              <box flexDirection="row" gap={1}>
                <text fg="#6c7086">{pr().author}</text>
                <text fg="#6c7086">·</text>
                <text fg="#6c7086">{pr().branch} → {pr().baseBranch}</text>
                <text fg="#6c7086">·</text>
                <text fg="#a6e3a1">+{pr().additions}</text>
                <text fg="#f38ba8">-{pr().deletions}</text>
              </box>
            </box>

            {/* File diff view */}
            <Show when={prFileDiff()}>
              {(diff: Accessor<FileDiff>) => (
                <box flexDirection="column" flexGrow={1}>
                  <text fg="#89b4fa">
                    <b> {diff().path} </b>
                  </text>
                  <DiffView fileDiff={diff()} />
                </box>
              )}
            </Show>

            {/* Files list (when no file diff selected) */}
            <Show when={!prFileDiff()}>
              <ScrollList selectedRow={prFileSelectedIndex()} flexGrow={1}>
                <box flexDirection="column" paddingLeft={1}>
                  {/* Description */}
                  <Show when={pr().body}>
                    <box flexDirection="column">
                      <text fg="#6c7086">
                        <b> Description </b>
                      </text>
                      <text fg="#cdd6f4"> {truncateBody(pr().body, 5)}</text>
                    </box>
                  </Show>

                  {/* Reviews */}
                  <Show when={prs.reviews.length > 0}>
                    <text fg="#6c7086">
                      <b> Reviews ({prs.reviews.length}) </b>
                    </text>
                    <For each={prs.reviews}>
                      {(review) => (
                        <box flexDirection="row" paddingLeft={1}>
                          <text fg={reviewColor(review.state)}>{review.state}</text>
                          <text fg="#6c7086"> by {review.author}</text>
                        </box>
                      )}
                    </For>
                  </Show>

                  {/* Files */}
                  <text fg="#6c7086">
                    <b> Files ({prs.files.length}) </b>
                  </text>
                  <For each={prs.files}>
                    {(file, i) => {
                      const isSelected = () => prFileSelectedIndex() === i()
                      return (
                        <box flexDirection="row" backgroundColor={isSelected() ? "#313244" : undefined}>
                          <text fg={isSelected() ? "#89b4fa" : "#cdd6f4"}>
                            {isSelected() ? " ▸ " : "   "}
                          </text>
                          <text fg={fileStatusColor(file.status)}>{fileStatusIcon(file.status)}</text>
                          <text fg="#cdd6f4"> {file.path}</text>
                          <text fg="#a6e3a1"> +{file.additions}</text>
                          <text fg="#f38ba8"> -{file.deletions}</text>
                        </box>
                      )
                    }}
                  </For>
                </box>
              </ScrollList>
            </Show>
          </box>
        )}
      </Show>

      {/* PR List View */}
      <Show when={prs.ghAvailable && !viewingPRDetail() && !prs.loading}>
        <box flexDirection="column" flexGrow={1}>
          <text fg="#6c7086">
            <b> PULL REQUESTS ({prs.list.length}) [{prs.filter}] </b>
          </text>

          <Show
            when={prs.list.length > 0}
            fallback={<text fg="#6c7086"> No pull requests found</text>}
          >
            <ScrollList selectedRow={prSelectedIndex() * 2} flexGrow={1}>
              <For each={prs.list}>
                {(pr, i) => (
                  <PRCard pr={pr} selected={prSelectedIndex() === i()} />
                )}
              </For>
            </ScrollList>
          </Show>
        </box>
      </Show>
    </box>
  )
}

// ── Helpers ──────────────────────────────────────────────────

// Import the PullRequest type for Show callback
import type { PullRequest } from "../../core/github/types.ts"

function reviewColor(state: string): string {
  switch (state) {
    case "APPROVED":
      return "#a6e3a1"
    case "CHANGES_REQUESTED":
      return "#f38ba8"
    case "COMMENTED":
      return "#89b4fa"
    default:
      return "#6c7086"
  }
}

function fileStatusColor(status: string): string {
  switch (status) {
    case "added":
      return "#a6e3a1"
    case "removed":
      return "#f38ba8"
    case "modified":
      return "#f9e2af"
    case "renamed":
      return "#89b4fa"
    default:
      return "#cdd6f4"
  }
}

function fileStatusIcon(status: string): string {
  switch (status) {
    case "added":
      return "A"
    case "removed":
      return "D"
    case "modified":
      return "M"
    case "renamed":
      return "R"
    default:
      return "?"
  }
}

function truncateBody(body: string, maxLines: number): string {
  const lines = body.split("\n")
  if (lines.length <= maxLines) return body
  return lines.slice(0, maxLines).join("\n") + "\n..."
}
