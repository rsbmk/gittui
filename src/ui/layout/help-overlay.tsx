// src/ui/layout/help-overlay.tsx
// Full-screen help overlay — shows all keybindings grouped by context

import { createMemo, Show, For } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { keybindings, type Keybinding } from "../../state/keybindings.ts"
import { color } from "../../state/config.ts"

// ── Types ────────────────────────────────────────────────────

interface HelpOverlayProps {
  visible: boolean
  onClose: () => void
}

interface BindingGroup {
  context: string
  label: string
  bindings: Keybinding[]
}

// ── Context display order + labels ───────────────────────────

const CONTEXT_CONFIG: Array<{ id: string; label: string }> = [
  { id: "global", label: "Global" },
  { id: "files", label: "Files" },
  { id: "branches", label: "Branches" },
  { id: "commits", label: "Commits" },
  { id: "stash", label: "Stash" },
  { id: "prs", label: "Pull Requests" },
]

const SEPARATOR_WIDTH = 50

// ── Component ────────────────────────────────────────────────

export function HelpOverlay(props: HelpOverlayProps) {
  const groups = createMemo<BindingGroup[]>(() => {
    const all = keybindings()

    return CONTEXT_CONFIG
      .map((ctx) => ({
        context: ctx.id,
        label: ctx.label,
        bindings: all.filter((b) => b.context === ctx.id),
      }))
      .filter((g) => g.bindings.length > 0)
  })

  useKeyboard((key) => {
    if (!props.visible) return

    if (key.name === "escape" || key.name === "?") {
      props.onClose()
    }
  })

  return (
    <Show when={props.visible}>
      <box
        flexDirection="column"
        width="100%"
        height="100%"
        backgroundColor={color("bg")}
        borderStyle="single"
        borderColor={color("border")}
        padding={1}
      >
        {/* Title */}
        <text fg={color("accent")}><b> Help — Keybindings</b></text>
        <text>{""}</text>

        {/* Scrollable content */}
        <scrollbox flexGrow={1}>
          <box flexDirection="column">
            <For each={groups()}>
              {(group) => (
                <box flexDirection="column">
                  {/* Section header */}
                  <box flexDirection="row">
                    <text fg={color("muted")}>{"── "}</text>
                    <text fg={color("accent")}><b>{group.label}</b></text>
                    <text fg={color("muted")}>{" " + "─".repeat(SEPARATOR_WIDTH)}</text>
                  </box>

                  {/* Bindings */}
                  <For each={group.bindings}>
                    {(binding) => (
                      <box flexDirection="row">
                        <text fg={color("warning")} width={14}>{"  "}{binding.key}</text>
                        <text fg={color("fg")}>{binding.description}</text>
                      </box>
                    )}
                  </For>

                  {/* Group spacer */}
                  <text>{""}</text>
                </box>
              )}
            </For>
          </box>
        </scrollbox>

        {/* Footer */}
        <box flexDirection="row" width="100%" height={1}>
          <text fg={color("muted")}> Press </text>
          <text fg={color("warning")}><b>?</b></text>
          <text fg={color("muted")}> or </text>
          <text fg={color("warning")}><b>Esc</b></text>
          <text fg={color("muted")}> to close</text>
        </box>
      </box>
    </Show>
  )
}
