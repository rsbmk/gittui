// src/ui/layout/command-palette.tsx
// Command palette overlay — filterable list of all available actions (`:` key)

import { createSignal, createEffect, For, Show, createMemo } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { getAllActions, type Keybinding } from "../../state/keybindings.ts"
import { executeAction } from "../../state/actions.ts"
import { color } from "../../state/config.ts"

// ── Types ─────────────────────────────────────────────────────

interface CommandPaletteProps {
  visible: boolean
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────

/** Display-friendly key label (e.g. "space" → "spc", "enter" → "ret") */
function formatKey(key: string): string {
  const MAP: Record<string, string> = {
    space: "spc",
    enter: "ret",
    escape: "esc",
    "ctrl+return": "C-ret",
    "ctrl+enter": "C-ret",
    "ctrl+b": "C-b",
    "ctrl+n": "C-n",
    "ctrl+p": "C-p",
    "ctrl+a": "C-a",
    "ctrl+e": "C-e",
  }
  return MAP[key] ?? key
}

// ── Max visible items (prevent overflow) ─────────────────────

const MAX_VISIBLE = 14

// ── Component ────────────────────────────────────────────────

export function CommandPalette(props: CommandPaletteProps) {
  const [filter, setFilter] = createSignal("")
  const [selectedIdx, setSelectedIdx] = createSignal(0)
  const [inputFocused, setInputFocused] = createSignal(false)

  // Reset state when palette opens — delay focus to prevent triggering keystroke leak
  createEffect(() => {
    if (props.visible) {
      setFilter("")
      setSelectedIdx(0)
      setInputFocused(false)
      setTimeout(() => setInputFocused(true), 0)
    } else {
      setInputFocused(false)
    }
  })

  // Filtered action list — substring match on description, action name, or key
  const filteredActions = createMemo((): Keybinding[] => {
    const query = filter().toLowerCase()
    const all = getAllActions()
    if (!query) return all
    return all.filter(
      (a) =>
        a.description.toLowerCase().includes(query) ||
        a.action.toLowerCase().includes(query) ||
        a.key.toLowerCase().includes(query),
    )
  })

  // Visible slice (scroll window around selection)
  const visibleSlice = createMemo(() => {
    const all = filteredActions()
    if (all.length <= MAX_VISIBLE) return { items: all, offset: 0 }

    const idx = selectedIdx()
    let start = Math.max(0, idx - Math.floor(MAX_VISIBLE / 2))
    if (start + MAX_VISIBLE > all.length) start = all.length - MAX_VISIBLE
    return { items: all.slice(start, start + MAX_VISIBLE), offset: start }
  })

  // Execute the currently selected action
  function executeSelected(): void {
    const actions = filteredActions()
    const selected = actions[selectedIdx()]
    if (!selected) return

    props.onClose()
    // Defer execution so the palette closes before the action runs
    setTimeout(() => {
      executeAction(selected.action)
    }, 0)
  }

  // Keyboard handler — only active when visible
  useKeyboard((key) => {
    if (!props.visible) return

    // Handle ctrl+key combos (OpenTUI reports ctrl as modifier, not in key.name)
    if (key.ctrl) {
      switch (key.name) {
        case "p":
          setSelectedIdx((prev) => Math.max(0, prev - 1))
          break
        case "n":
          setSelectedIdx((prev) => Math.min(filteredActions().length - 1, prev + 1))
          break
      }
      return
    }

    switch (key.name) {
      case "escape":
        props.onClose()
        break
      case "return":
      case "enter":
        executeSelected()
        break
      case "up":
        setSelectedIdx((prev) => Math.max(0, prev - 1))
        break
      case "down":
        setSelectedIdx((prev) => Math.min(filteredActions().length - 1, prev + 1))
        break
    }
  })

  return (
    <Show when={props.visible}>
      <box
        flexDirection="column"
        width={60}
        height={20}
        border={true}
        borderStyle="rounded"
        borderColor={color("accent")}
        backgroundColor={color("bg")}
        padding={1}
      >
        {/* Title */}
        <text fg={color("accent")}>
          <b> Command Palette </b>
        </text>

        {/* Search input */}
        <box flexDirection="row" height={1}>
          <text fg={color("accent")}>{"> "}</text>
          <input
            value={filter()}
            onInput={(value) => {
              setFilter(value)
              setSelectedIdx(0)
            }}
            width={54}
            focused={inputFocused()}
          />
        </box>

        {/* Separator */}
        <text fg={color("border")}>{"─".repeat(56)}</text>

        {/* Results list */}
        <box flexDirection="column" flexGrow={1}>
          <Show
            when={filteredActions().length > 0}
            fallback={<text fg={color("muted")}> No matching actions</text>}
          >
            <For each={visibleSlice().items}>
              {(action, idx) => {
                const absoluteIdx = () => idx() + visibleSlice().offset
                return (
                  <box
                    flexDirection="row"
                    backgroundColor={
                      absoluteIdx() === selectedIdx() ? color("selection") : undefined
                    }
                    width="100%"
                  >
                    <text
                      fg={absoluteIdx() === selectedIdx() ? color("accent") : color("muted")}
                      width={10}
                    >
                      <Show
                        when={absoluteIdx() === selectedIdx()}
                        fallback={"[" + formatKey(action.key) + "]"}
                      >
                        <b>{"[" + formatKey(action.key) + "]"}</b>
                      </Show>
                    </text>
                    <text fg={color("fg")} flexGrow={1}>
                      {action.description}
                    </text>
                    <text fg={color("muted")}>{"(" + action.context + ")"}</text>
                  </box>
                )
              }}
            </For>
          </Show>
        </box>

        {/* Footer */}
        <box flexDirection="row">
          <text fg={color("accent")}>[↑↓]</text>
          <text fg={color("muted")}> navigate </text>
          <text fg={color("accent")}>[ret]</text>
          <text fg={color("muted")}> select </text>
          <text fg={color("accent")}>[esc]</text>
          <text fg={color("muted")}> close </text>
          <Show when={filteredActions().length > MAX_VISIBLE}>
            <text fg={color("muted")}>({filteredActions().length} actions)</text>
          </Show>
        </box>
      </box>
    </Show>
  )
}
