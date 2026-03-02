// src/ui/components/commit-modal.tsx
// Commit dialog — two-panel layout: staged files (left) + message textarea (right)

import { createSignal, For, Show } from "solid-js"
import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { PromptContext } from "@opentui-ui/dialog/solid"
import type { TextareaRenderable } from "@opentui/core"
import { commitDialogConfig, COMMIT_DIALOG_INNER_WIDTH } from "./dialog-styles.ts"
import { repo, refreshStatus } from "../../state/repo.ts"
import { commit as commitCmd } from "../../core/git/commands.ts"
import { color } from "../../state/config.ts"
import { withDialog } from "../../state/ui.ts"
import { SUBMIT_TEXTAREA_BINDINGS } from "../../state/keybindings.ts"
import { getStatusColor } from "../../lib/theme.ts"

// ── Layout Constants ─────────────────────────────────────────
//
// All widths derive from COMMIT_DIALOG_INNER_WIDTH (96).
// To resize: change COMMIT_DIALOG_WIDTH in dialog-styles.ts.

const INNER = COMMIT_DIALOG_INNER_WIDTH               // 96
const STAGED_WIDTH = 34                                // left panel: file list
const SEPARATOR_GAP = 3                                // 1 padding + │ + 1 padding
const MESSAGE_WIDTH = INNER - STAGED_WIDTH - SEPARATOR_GAP  // 59
const TEXTAREA_HEIGHT = 10
const MAX_VISIBLE_FILES = 14
const PATH_MAX_LEN = STAGED_WIDTH - 5                  // "  M " prefix = 4, +1 safety

// ── Section Header ───────────────────────────────────────────

interface SectionHeaderProps {
  label: string
  width: number
}

function SectionHeader(props: SectionHeaderProps) {
  const lineLen = () => Math.max(0, props.width - props.label.length - 4)

  return (
    <box flexDirection="row">
      <text fg={color("muted")}>{"── "}</text>
      <text fg={color("accent")}>
        <b>{props.label}</b>
      </text>
      <text fg={color("muted")}>{" " + "─".repeat(lineLen())}</text>
    </box>
  )
}

// ── Path Truncation ──────────────────────────────────────────

function truncatePath(path: string, maxLen: number): string {
  if (path.length <= maxLen) return path

  const parts = path.split("/")
  let result = parts[parts.length - 1]!

  // Walk backwards adding parent dirs until it doesn't fit
  for (let i = parts.length - 2; i >= 0; i--) {
    const candidate = parts[i] + "/" + result
    if (candidate.length + 2 > maxLen) break // +2 for "…/"
    result = candidate
  }

  return "…/" + result
}

// ── Commit Dialog Content ────────────────────────────────────

interface CommitDialogProps extends PromptContext<string> {
  initialMessage?: string
}

function CommitDialogContent(props: CommitDialogProps) {
  let textareaRef: TextareaRenderable | undefined
  const [message, setMessage] = createSignal(props.initialMessage ?? "")
  const [error, setError] = createSignal<string | null>(null)
  const [submitting, setSubmitting] = createSignal(false)

  const stagedFiles = () => repo.status?.staged ?? []
  const branch = () => repo.status?.branch ?? ""

  async function handleCommit(): Promise<void> {
    if (submitting()) return

    const msg = message().trim()

    if (!msg) {
      setError("Commit message cannot be empty")
      return
    }

    if (stagedFiles().length === 0) {
      setError("No staged files to commit")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await commitCmd(msg)
      await refreshStatus()
      props.resolve(msg)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      props.dismiss()
    }
  }, props.dialogId)

  // Visible file count: capped by MAX_VISIBLE_FILES + optional "…and N more" line
  const visibleFileCount = () => {
    const total = stagedFiles().length
    const capped = Math.min(total, MAX_VISIBLE_FILES)
    return total > MAX_VISIBLE_FILES ? capped + 1 : capped
  }

  // Separator height matches the taller panel (visible files, not total)
  const separatorHeight = () => Math.max(TEXTAREA_HEIGHT + 2, visibleFileCount() + 2)

  return (
    <box flexDirection="column" gap={1} width={INNER}>
      {/* Header — title + branch context */}
      <box flexDirection="row" gap={1}>
        <text fg={color("accent")}>
          <b>Commit Changes</b>
        </text>
        <Show when={branch()}>
          <text fg={color("muted")}>on</text>
          <text fg={color("accent")}>{branch()}</text>
        </Show>
      </box>

      {/* Body — two-panel horizontal layout */}
      <box flexDirection="row">
        {/* Left panel: Staged files */}
        <box flexDirection="column" width={STAGED_WIDTH} flexShrink={0}>
          <SectionHeader label={`Staged (${stagedFiles().length})`} width={STAGED_WIDTH} />
          <box height={1} />
          <Show
            when={stagedFiles().length > 0}
            fallback={<text fg={color("error")}> No files staged</text>}
          >
            <For each={stagedFiles().slice(0, MAX_VISIBLE_FILES)}>
              {(file) => (
                <text fg={color(getStatusColor(file.status))}>
                  {"  "}{file.status} {truncatePath(file.path, PATH_MAX_LEN)}
                </text>
              )}
            </For>
            <Show when={stagedFiles().length > MAX_VISIBLE_FILES}>
              <text fg={color("muted")}>
                {"  "}…and {stagedFiles().length - MAX_VISIBLE_FILES} more
              </text>
            </Show>
          </Show>
        </box>

        {/* Separator — quiet vertical line */}
        <box width={SEPARATOR_GAP} flexShrink={0}>
          <text fg={color("border")}>{" │ \n".repeat(separatorHeight())}</text>
        </box>

        {/* Right panel: Commit message */}
        <box flexDirection="column" width={MESSAGE_WIDTH} flexShrink={0}>
          <SectionHeader label="Message" width={MESSAGE_WIDTH} />
          <box height={1} />
          <textarea
            ref={(el: TextareaRenderable) => { textareaRef = el }}
            initialValue={props.initialMessage ?? ""}
            onContentChange={() => {
              if (textareaRef) setMessage(textareaRef.plainText)
              setError(null)
            }}
            onSubmit={() => handleCommit()}
            keyBindings={SUBMIT_TEXTAREA_BINDINGS}
            height={TEXTAREA_HEIGHT}
            width={MESSAGE_WIDTH}
            focused={true}
          />
        </box>
      </box>

      {/* Error message */}
      <Show when={error()}>
        <text fg={color("error")}> {error()}</text>
      </Show>

      {/* Footer — keybinding hints */}
      <box flexDirection="row" gap={2}>
        <box flexDirection="row">
          <text fg={color("accent")}>[Ctrl+S]</text>
          <text fg={color("muted")}> commit</text>
        </box>
        <box flexDirection="row">
          <text fg={color("accent")}>[Esc]</text>
          <text fg={color("muted")}> cancel</text>
        </box>
        <Show when={submitting()}>
          <text fg={color("warning")}> Committing…</text>
        </Show>
      </box>
    </box>
  )
}

// ── Hook to open commit dialog ───────────────────────────────

export function useCommitDialog() {
  const dialog = useDialog()

  async function openCommitDialog(initialMessage?: string): Promise<string | undefined> {
    return withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <CommitDialogContent
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
          initialMessage={initialMessage}
        />
      ),
      ...commitDialogConfig(),
    }))
  }

  return { openCommitDialog }
}
