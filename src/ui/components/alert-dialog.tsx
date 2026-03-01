// src/ui/components/alert-dialog.tsx
// Reusable alert dialog — structured error messages, notifications

import { Show, For } from "solid-js"
import { useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { DialogId } from "@opentui-ui/dialog/solid"
import { color } from "../../state/config.ts"
import { GitCommandError } from "../../core/git/commands.ts"

// ── Git Error Parser ─────────────────────────────────────────

interface ParsedGitError {
  errors: string[]
  hints: string[]
}

/**
 * Parses a GitCommandError stderr into structured error/hint lines.
 * Strips prefixes like "error:", "hint:", "fatal:" and deduplicates.
 */
function parseGitStderr(stderr: string): ParsedGitError {
  const errors: string[] = []
  const hints: string[] = []

  for (const line of stderr.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith("hint:")) {
      hints.push(trimmed.slice(5).trim())
    } else if (trimmed.startsWith("error:")) {
      errors.push(trimmed.slice(6).trim())
    } else if (trimmed.startsWith("fatal:")) {
      // Only add fatal if it's not redundant with an existing error
      const msg = trimmed.slice(6).trim()
      if (!errors.some((e) => e.toLowerCase().includes(msg.toLowerCase()))) {
        errors.push(msg)
      }
    } else if (trimmed.startsWith("warning:")) {
      hints.push(trimmed.slice(8).trim())
    } else {
      errors.push(trimmed)
    }
  }

  return { errors, hints }
}

/**
 * Extracts a user-friendly error message from any error.
 * For GitCommandError, parses stderr. For others, uses message.
 */
export function formatGitError(err: unknown): ParsedGitError {
  if (err instanceof GitCommandError) {
    return parseGitStderr(err.stderr)
  }

  const message = err instanceof Error ? err.message : String(err)
  return { errors: [message], hints: [] }
}

// ── Types ────────────────────────────────────────────────────

interface AlertDialogProps {
  title: string
  message?: string
  errors?: string[]
  hints?: string[]
  dismissLabel?: string
  error?: boolean
  dismiss: () => void
  dialogId: DialogId
}

// ── Component ────────────────────────────────────────────────

export function AlertDialog(props: AlertDialogProps) {
  useDialogKeyboard((key) => {
    if (key.name === "return" || key.name === "enter" || key.name === "escape") {
      props.dismiss()
    }
  }, props.dialogId)

  const titleColor = () => props.error ? color("error") : color("accent")

  return (
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <text fg={titleColor()}>
        <b>{props.title}</b>
      </text>

      {/* Simple message (fallback) */}
      <Show when={props.message}>
        <text fg={color("fg")}>{props.message}</text>
      </Show>

      {/* Structured error lines */}
      <Show when={props.errors && props.errors.length > 0}>
        <box flexDirection="column">
          <For each={props.errors}>
            {(line) => <text fg={color("fg")}>{line}</text>}
          </For>
        </box>
      </Show>

      {/* Hint lines */}
      <Show when={props.hints && props.hints.length > 0}>
        <box flexDirection="column">
          <For each={props.hints}>
            {(hint) => (
              <box flexDirection="row">
                <text fg={color("warning")}>{"hint: "}</text>
                <text fg={color("muted")}>{hint}</text>
              </box>
            )}
          </For>
        </box>
      </Show>

      {/* Footer — keybinding hints */}
      <box flexDirection="row">
        <text fg={color("accent")}>[Enter]</text>
        <text fg={color("muted")}> {props.dismissLabel ?? "dismiss"}</text>
      </box>
    </box>
  )
}
