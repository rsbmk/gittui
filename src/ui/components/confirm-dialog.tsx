// src/ui/components/confirm-dialog.tsx
// Reusable confirmation dialog — destructive actions (revert, delete, drop)

import { useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { DialogId } from "@opentui-ui/dialog/solid"
import { color } from "../../state/config.ts"

// ── Types ────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  resolve: (value: boolean) => void
  dismiss: () => void
  dialogId: DialogId
}

// ── Component ────────────────────────────────────────────────

export function ConfirmDialog(props: ConfirmDialogProps) {
  useDialogKeyboard((key) => {
    if (key.name === "return" || key.name === "enter") props.resolve(true)
    if (key.name === "escape") props.dismiss()
  }, props.dialogId)

  const titleColor = () => props.destructive ? color("error") : color("accent")

  return (
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <text fg={titleColor()}>
        <b>{props.title}</b>
      </text>

      {/* Message */}
      <text fg={color("fg")}>{props.message}</text>

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
