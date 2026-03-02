// src/ui/components/conflict-resolve-modal.tsx
// Conflict resolution dialog — choose how to resolve a merge conflict

import { createSignal, For } from "solid-js"
import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { PromptContext } from "@opentui-ui/dialog/solid"
import { dialogConfig, DIALOG_CONTENT_WIDTH } from "./dialog-styles.ts"
import { color } from "../../state/config.ts"
import { withDialog } from "../../state/ui.ts"

// ── Resolution Options ───────────────────────────────────────

export const CONFLICT_RESOLUTION = {
  OURS: "ours",
  THEIRS: "theirs",
  BOTH: "both",
  EDITOR: "editor",
} as const

export type ConflictResolution = (typeof CONFLICT_RESOLUTION)[keyof typeof CONFLICT_RESOLUTION]

interface ResolutionOption {
  id: ConflictResolution
  label: string
  description: string
}

const OPTIONS: ResolutionOption[] = [
  { id: CONFLICT_RESOLUTION.OURS, label: "Accept Ours (HEAD)", description: "Keep our version, discard theirs" },
  { id: CONFLICT_RESOLUTION.THEIRS, label: "Accept Theirs", description: "Keep their version, discard ours" },
  { id: CONFLICT_RESOLUTION.BOTH, label: "Accept Both", description: "Keep both versions concatenated" },
  { id: CONFLICT_RESOLUTION.EDITOR, label: "Open in Editor", description: "Edit file manually in $EDITOR" },
]

// ── Dialog Content ───────────────────────────────────────────

interface ConflictResolveProps extends PromptContext<ConflictResolution> {
  filePath: string
  oursLabel?: string
  theirsLabel?: string
}

function ConflictResolveContent(props: ConflictResolveProps) {
  const [selectedIdx, setSelectedIdx] = createSignal(0)

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      props.dismiss()
      return
    }

    if (key.name === "return") {
      const option = OPTIONS[selectedIdx()]
      if (option) props.resolve(option.id)
      return
    }

    if (key.name === "j" || key.name === "down") {
      setSelectedIdx((i) => Math.min(i + 1, OPTIONS.length - 1))
      return
    }

    if (key.name === "k" || key.name === "up") {
      setSelectedIdx((i) => Math.max(i - 1, 0))
      return
    }
  }, props.dialogId)

  return (
    <box flexDirection="column" gap={1} width={DIALOG_CONTENT_WIDTH}>
      <text fg={color("accent")}>
        <b>Resolve Conflict</b>
      </text>
      <text fg={color("fg")}>{props.filePath}</text>
      <box flexDirection="column">
        <For each={OPTIONS}>
          {(option, idx) => (
            <box flexDirection="column">
              <text fg={idx() === selectedIdx() ? color("accent") : color("fg")}>
                {idx() === selectedIdx() ? " ▸ " : "   "}
                {option.label}
              </text>
              <text fg={color("muted")}>
                {"     "}{option.description}
              </text>
            </box>
          )}
        </For>
      </box>
      <box flexDirection="row" gap={2}>
        <box flexDirection="row">
          <text fg={color("accent")}>[Enter]</text>
          <text fg={color("muted")}> select</text>
        </box>
        <box flexDirection="row">
          <text fg={color("accent")}>[Esc]</text>
          <text fg={color("muted")}> cancel</text>
        </box>
      </box>
    </box>
  )
}

// ── Hook ─────────────────────────────────────────────────────

export function useConflictResolveDialog() {
  const dialog = useDialog()

  async function openConflictResolveDialog(
    filePath: string,
    oursLabel?: string,
    theirsLabel?: string,
  ): Promise<ConflictResolution | undefined> {
    return withDialog(() => dialog.prompt<ConflictResolution>({
      content: (ctx) => () => (
        <ConflictResolveContent
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
          filePath={filePath}
          oursLabel={oursLabel}
          theirsLabel={theirsLabel}
        />
      ),
      ...dialogConfig(),
    }))
  }

  return { openConflictResolveDialog }
}
