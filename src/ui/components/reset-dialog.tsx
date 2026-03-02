// src/ui/components/reset-dialog.tsx
// Reset dialog — undo commits with soft/mixed/hard mode selection

import { createSignal, Show, For } from "solid-js"
import { useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { DialogId } from "@opentui-ui/dialog/solid"
import { color } from "../../state/config.ts"
import { DIALOG_CONTENT_WIDTH } from "./dialog-styles.ts"
import type { GitCommit } from "../../core/git/types.ts"

// ── Types ────────────────────────────────────────────────────

export const RESET_MODE = {
  SOFT: "soft",
  MIXED: "mixed",
  HARD: "hard",
} as const

export type ResetMode = (typeof RESET_MODE)[keyof typeof RESET_MODE]

interface ResetDialogProps {
  targetHash: string
  targetMessage: string
  commitsToRemove: GitCommit[]
  resolve: (value: ResetMode) => void
  dismiss: () => void
  dialogId: DialogId
}

// ── Helpers ──────────────────────────────────────────────────

const MODES: { value: ResetMode; label: string; description: string; destructive?: boolean }[] = [
  { value: RESET_MODE.SOFT, label: "Soft", description: "keep changes staged" },
  { value: RESET_MODE.MIXED, label: "Mixed", description: "keep changes unstaged" },
  { value: RESET_MODE.HARD, label: "Hard", description: "discard all changes", destructive: true },
]

const MAX_VISIBLE_COMMITS = 6

// ── Section Divider ──────────────────────────────────────────

function SectionDivider(props: { label: string }) {
  const lineLen = () => Math.max(0, DIALOG_CONTENT_WIDTH - props.label.length - 4)

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

// ── Component ────────────────────────────────────────────────

export function ResetDialog(props: ResetDialogProps) {
  const [selected, setSelected] = createSignal(0)

  const count = () => props.commitsToRemove.length

  useDialogKeyboard((key) => {
    switch (key.name) {
      case "1":
        props.resolve(RESET_MODE.SOFT)
        break
      case "2":
        props.resolve(RESET_MODE.MIXED)
        break
      case "3":
        props.resolve(RESET_MODE.HARD)
        break
      case "return":
      case "enter":
        props.resolve(MODES[selected()]!.value)
        break
      case "j":
      case "down":
        setSelected((prev) => Math.min(prev + 1, MODES.length - 1))
        break
      case "k":
      case "up":
        setSelected((prev) => Math.max(prev - 1, 0))
        break
      case "escape":
        props.dismiss()
        break
    }
  }, props.dialogId)

  return (
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <text fg={color("warning")}>
        <b>Undo Commits</b>
      </text>

      {/* Target info */}
      <box flexDirection="column">
        <text fg={color("fg")}>
          Reset to {props.targetHash}: {props.targetMessage}
        </text>
        <text fg={color("warning")}>
          ⚠ This will remove {count()} commit{count() !== 1 ? "s" : ""} from history
        </text>
      </box>

      {/* Commits to remove */}
      <Show when={count() > 0}>
        <box flexDirection="column">
          <SectionDivider label={`Commits to remove (${count()})`} />
          <For each={props.commitsToRemove.slice(0, MAX_VISIBLE_COMMITS)}>
            {(commit) => (
              <box flexDirection="row">
                <text fg={color("warning")}>{"  "}{commit.shortHash}</text>
                <text fg={color("muted")}>{" "}{commit.message}</text>
              </box>
            )}
          </For>
          <Show when={count() > MAX_VISIBLE_COMMITS}>
            <text fg={color("muted")}>
              {"  "}…and {count() - MAX_VISIBLE_COMMITS} more
            </text>
          </Show>
        </box>
      </Show>

      {/* Mode section */}
      <box flexDirection="column">
        <SectionDivider label="Mode" />
        <For each={MODES}>
          {(mode, i) => (
            <box flexDirection="column">
              <box flexDirection="row">
                <text fg={selected() === i() ? color("accent") : color("muted")}>
                  {selected() === i() ? " ▸ " : "   "}
                </text>
                <text fg={color("accent")}>[{i() + 1}]</text>
                <text fg={selected() === i() ? color("fg") : color("muted")}>
                  {" "}{mode.label}
                </text>
                <text fg={mode.destructive ? color("error") : color("muted")}>
                  {" — "}{mode.description}
                  {mode.destructive ? " ⚠" : ""}
                </text>
              </box>
            </box>
          )}
        </For>
      </box>

      {/* Footer — keybinding hints */}
      <box flexDirection="row" gap={2}>
        <box flexDirection="row">
          <text fg={color("accent")}>[Enter]</text>
          <text fg={color("muted")}> select</text>
        </box>
        <box flexDirection="row">
          <text fg={color("accent")}>[j/k]</text>
          <text fg={color("muted")}> navigate</text>
        </box>
        <box flexDirection="row">
          <text fg={color("accent")}>[Esc]</text>
          <text fg={color("muted")}> cancel</text>
        </box>
      </box>
    </box>
  )
}
