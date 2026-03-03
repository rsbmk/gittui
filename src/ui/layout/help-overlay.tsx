// src/ui/layout/help-overlay.tsx
// Centered help modal — contextual keybindings with tab navigation

import { createSignal, createMemo, createEffect, Show, For } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { keybindings, type Keybinding } from "../../state/keybindings.ts"
import { activeTab } from "../../state/ui.ts"
import { color } from "../../state/config.ts"

// ── Types ────────────────────────────────────────────────────

interface HelpOverlayProps {
  visible: boolean
  onClose: () => void
}

// ── Section config ──────────────────────────────────────────

const SECTIONS = [
  { id: "files", label: "Files", key: "1" },
  { id: "branches", label: "Branches", key: "2" },
  { id: "commits", label: "Commits", key: "3" },
  { id: "stash", label: "Stash", key: "4" },
  { id: "prs", label: "Pull Requests", key: "5" },
  { id: "settings", label: "Settings", key: "6" },
] as const

const KEY_TO_SECTION: Record<string, string> = {
  "1": "files",
  "2": "branches",
  "3": "commits",
  "4": "stash",
  "5": "prs",
  "6": "settings",
}

const KEY_COL_WIDTH = 16
const SEPARATOR_WIDTH = 40

// ── Helpers ─────────────────────────────────────────────────

function splitColumns(items: Keybinding[]): { left: Keybinding[]; right: Keybinding[] } {
  const mid = Math.ceil(items.length / 2)
  return { left: items.slice(0, mid), right: items.slice(mid) }
}

// ── Component ────────────────────────────────────────────────

export function HelpOverlay(props: HelpOverlayProps) {
  const [selectedSection, setSelectedSection] = createSignal<string>(activeTab())

  // Reset to active tab each time overlay opens
  createEffect(() => {
    if (props.visible) {
      setSelectedSection(activeTab())
    }
  })

  const sectionLabel = createMemo(() => {
    return SECTIONS.find((s) => s.id === selectedSection())?.label ?? selectedSection()
  })

  const sectionBindings = createMemo(() => {
    return keybindings().filter((b) => b.context === selectedSection())
  })

  const globalBindings = createMemo(() => {
    return keybindings().filter((b) => b.context === "global")
  })

  const sectionCols = createMemo(() => splitColumns(sectionBindings()))
  const globalCols = createMemo(() => splitColumns(globalBindings()))

  useKeyboard((key) => {
    if (!props.visible) return

    if (key.name === "escape" || key.name === "?") {
      props.onClose()
      return
    }

    const section = KEY_TO_SECTION[key.name]
    if (section) {
      setSelectedSection(section)
    }
  })

  return (
    <Show when={props.visible}>
      <box
        flexDirection="column"
        width="80%"
        height="80%"
        backgroundColor={color("bg")}
        borderStyle="single"
        borderColor={color("border")}
        padding={1}
      >
        {/* Title */}
        <text fg={color("accent")}><b> Help — Keybindings</b></text>
        <text>{""}</text>

        {/* Tab navigation bar */}
        <box flexDirection="row" height={1} flexShrink={0}>
          <text fg={color("muted")}>{"  "}</text>
          <For each={SECTIONS}>
            {(section) => (
              <Show
                when={selectedSection() === section.id}
                fallback={
                  <>
                    <text fg={color("muted")}>[{section.key}] {section.label}  </text>
                  </>
                }
              >
                <text fg={color("accent")} bg={color("selection")}><b> [{section.key}] {section.label} </b></text>
                <text>{"  "}</text>
              </Show>
            )}
          </For>
        </box>
        <text>{""}</text>

        {/* Scrollable content */}
        <scrollbox flexGrow={1}>
          <box flexDirection="column">
            {/* Context section header */}
            <box flexDirection="row">
              <text fg={color("muted")}>{"── "}</text>
              <text fg={color("accent")}><b>{sectionLabel()}</b></text>
              <text fg={color("muted")}>{" " + "─".repeat(SEPARATOR_WIDTH)}</text>
            </box>

            {/* Context bindings — 2 columns */}
            <Show
              when={sectionBindings().length > 0}
              fallback={
                <text fg={color("muted")}>{"  No keybindings for this section"}</text>
              }
            >
              <box flexDirection="row">
                <box flexDirection="column" width="50%">
                  <For each={sectionCols().left}>
                    {(binding) => (
                      <box flexDirection="row">
                        <text fg={color("warning")} width={KEY_COL_WIDTH}>{"  "}{binding.key}</text>
                        <text fg={color("fg")}>{binding.description}</text>
                      </box>
                    )}
                  </For>
                </box>
                <box flexDirection="column" width="50%">
                  <For each={sectionCols().right}>
                    {(binding) => (
                      <box flexDirection="row">
                        <text fg={color("warning")} width={KEY_COL_WIDTH}>{"  "}{binding.key}</text>
                        <text fg={color("fg")}>{binding.description}</text>
                      </box>
                    )}
                  </For>
                </box>
              </box>
            </Show>

            <text>{""}</text>

            {/* Global section header */}
            <box flexDirection="row">
              <text fg={color("muted")}>{"── "}</text>
              <text fg={color("accent")}><b>Global</b></text>
              <text fg={color("muted")}>{" " + "─".repeat(SEPARATOR_WIDTH)}</text>
            </box>

            {/* Global bindings — 2 columns */}
            <box flexDirection="row">
              <box flexDirection="column" width="50%">
                <For each={globalCols().left}>
                  {(binding) => (
                    <box flexDirection="row">
                      <text fg={color("warning")} width={KEY_COL_WIDTH}>{"  "}{binding.key}</text>
                      <text fg={color("fg")}>{binding.description}</text>
                    </box>
                  )}
                </For>
              </box>
              <box flexDirection="column" width="50%">
                <For each={globalCols().right}>
                  {(binding) => (
                    <box flexDirection="row">
                      <text fg={color("warning")} width={KEY_COL_WIDTH}>{"  "}{binding.key}</text>
                      <text fg={color("fg")}>{binding.description}</text>
                    </box>
                  )}
                </For>
              </box>
            </box>
          </box>
        </scrollbox>

        {/* Footer */}
        <box flexDirection="row" width="100%" height={1} flexShrink={0}>
          <text fg={color("muted")}> Press </text>
          <text fg={color("warning")}><b>1-6</b></text>
          <text fg={color("muted")}> to switch section · </text>
          <text fg={color("warning")}><b>?</b></text>
          <text fg={color("muted")}> or </text>
          <text fg={color("warning")}><b>Esc</b></text>
          <text fg={color("muted")}> to close</text>
        </box>
      </box>
    </Show>
  )
}
