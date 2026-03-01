// src/ui/components/revert-dialog.tsx
// Revert dialog — shows affected files, warns about config, offers revert modes

import { createSignal, Show, For } from "solid-js"
import { useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { DialogId } from "@opentui-ui/dialog/solid"
import { color } from "../../state/config.ts"
import { DIALOG_CONTENT_WIDTH } from "./dialog-styles.ts"

// ── Types ────────────────────────────────────────────────────

export const REVERT_MODE = {
  COMMIT: "commit",
  STAGE: "stage",
} as const

export type RevertMode = (typeof REVERT_MODE)[keyof typeof REVERT_MODE]

interface RevertDialogProps {
  shortHash: string
  message: string
  files: string[]
  resolve: (value: RevertMode) => void
  dismiss: () => void
  dialogId: DialogId
}

// ── Helpers ──────────────────────────────────────────────────

const CONFIG_PATTERNS = [
  "package.json",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "tsconfig.",
  ".env",
]

function hasConfigFiles(files: string[]): boolean {
  return files.some((f) => {
    const name = f.split("/").pop() ?? f
    return CONFIG_PATTERNS.some((p) => name.startsWith(p))
  })
}

function getConfigFiles(files: string[]): string[] {
  return files.filter((f) => {
    const name = f.split("/").pop() ?? f
    return CONFIG_PATTERNS.some((p) => name.startsWith(p))
  })
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

const MAX_VISIBLE_FILES = 6

export function RevertDialog(props: RevertDialogProps) {
  const [selected, setSelected] = createSignal(0)

  const configFiles = () => getConfigFiles(props.files)
  const showWarning = () => hasConfigFiles(props.files)

  useDialogKeyboard((key) => {
    switch (key.name) {
      case "1":
        props.resolve(REVERT_MODE.COMMIT)
        break
      case "2":
        props.resolve(REVERT_MODE.STAGE)
        break
      case "return":
      case "enter":
        props.resolve(selected() === 0 ? REVERT_MODE.COMMIT : REVERT_MODE.STAGE)
        break
      case "j":
      case "down":
        setSelected(1)
        break
      case "k":
      case "up":
        setSelected(0)
        break
      case "escape":
        props.dismiss()
        break
    }
  }, props.dialogId)

  return (
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <text fg={color("error")}>
        <b>Revert Commit</b>
      </text>

      {/* Commit info */}
      <text fg={color("fg")}>
        Revert {props.shortHash}: {props.message}?
      </text>

      {/* Warning for config files */}
      <Show when={showWarning()}>
        <box flexDirection="column">
          <box flexDirection="row">
            <text fg={color("warning")}>
              <b>{"Warning: "}</b>
            </text>
            <text fg={color("warning")}>this commit includes config files</text>
          </box>
          <For each={configFiles()}>
            {(file) => <text fg={color("error")}>{"  ! "}{file}</text>}
          </For>
        </box>
      </Show>

      {/* Affected files */}
      <Show when={props.files.length > 0}>
        <box flexDirection="column">
          <SectionDivider label={`Affected files (${props.files.length})`} />
          <For each={props.files.slice(0, MAX_VISIBLE_FILES)}>
            {(file) => <text fg={color("muted")}>{"  "}{file}</text>}
          </For>
          <Show when={props.files.length > MAX_VISIBLE_FILES}>
            <text fg={color("muted")}>
              {"  "}…and {props.files.length - MAX_VISIBLE_FILES} more
            </text>
          </Show>
        </box>
      </Show>

      {/* Mode section */}
      <box flexDirection="column">
        <SectionDivider label="Mode" />

        {/* Option 1: Revert & commit */}
        <box flexDirection="column">
          <box flexDirection="row">
            <text fg={selected() === 0 ? color("accent") : color("muted")}>
              {selected() === 0 ? " ▸ " : "   "}
            </text>
            <text fg={color("accent")}>[1]</text>
            <text fg={selected() === 0 ? color("fg") : color("muted")}>
              {" "}Revert & commit
            </text>
          </box>
          <text fg={color("muted")}>
            {"     creates a new commit that undoes the changes"}
          </text>
        </box>

        {/* Option 2: Revert to staging */}
        <box flexDirection="column">
          <box flexDirection="row">
            <text fg={selected() === 1 ? color("accent") : color("muted")}>
              {selected() === 1 ? " ▸ " : "   "}
            </text>
            <text fg={color("accent")}>[2]</text>
            <text fg={selected() === 1 ? color("fg") : color("muted")}>
              {" "}Revert to staging
            </text>
          </box>
          <text fg={color("muted")}>
            {"     applies reverse changes without committing"}
          </text>
        </box>
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
