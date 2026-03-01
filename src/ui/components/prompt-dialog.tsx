// src/ui/components/prompt-dialog.tsx
// Reusable prompt dialog — text input with label (filter, new branch, stash msg)

import { createSignal } from "solid-js"
import { useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { DialogId } from "@opentui-ui/dialog/solid"
import { color } from "../../state/config.ts"
import { DIALOG_CONTENT_WIDTH } from "./dialog-styles.ts"

// ── Types ────────────────────────────────────────────────────

interface PromptDialogProps {
  title: string
  label: string
  confirmLabel: string
  initialValue?: string
  allowEmpty?: boolean
  resolve: (value: string) => void
  dismiss: () => void
  dialogId: DialogId
}

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

export function PromptDialog(props: PromptDialogProps) {
  const [input, setInput] = createSignal(props.initialValue ?? "")

  useDialogKeyboard((key) => {
    if (key.name === "return" || key.name === "enter") {
      const val = input().trim()
      if (val || props.allowEmpty) props.resolve(val)
    }
    if (key.name === "escape") props.dismiss()
  }, props.dialogId)

  return (
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <text fg={color("accent")}>
        <b>{props.title}</b>
      </text>

      {/* Input section */}
      <box flexDirection="column">
        <SectionDivider label={props.label} />
        <input
          value={props.initialValue ?? ""}
          onContentChange={((val: unknown) => setInput(String(val))) as any}
          width={DIALOG_CONTENT_WIDTH - 2}
          focused={true}
        />
      </box>

      {/* Footer — keybinding hints */}
      <box flexDirection="row" gap={2}>
        <box flexDirection="row">
          <text fg={color("accent")}>[Enter]</text>
          <text fg={color("muted")}> {props.confirmLabel}</text>
        </box>
        <box flexDirection="row">
          <text fg={color("accent")}>[Esc]</text>
          <text fg={color("muted")}> cancel</text>
        </box>
      </box>
    </box>
  )
}
