// src/ui/components/welcome-screen.tsx
// One-time welcome overlay — shown on first launch when no config existed

import { Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { color } from "../../state/config.ts"

// ── Types ────────────────────────────────────────────────────

interface WelcomeScreenProps {
  visible: boolean
  onDismiss: () => void
}

// ── Component ────────────────────────────────────────────────

export function WelcomeScreen(props: WelcomeScreenProps) {
  useKeyboard((key) => {
    if (!props.visible) return
    props.onDismiss()
  })

  return (
    <Show when={props.visible}>
      <box
        flexDirection="column"
        width="100%"
        height="100%"
        justifyContent="center"
        alignItems="center"
        backgroundColor={color("bg")}
      >
        <box
          flexDirection="column"
          width={60}
          padding={2}
          borderStyle="rounded"
          borderColor={color("accent")}
        >
          {/* Header */}
          <text fg={color("accent")}><b>  Welcome to guit!  </b></text>
          <text>{""}</text>
          <text fg={color("fg")}> A modern terminal git client</text>
          <text>{""}</text>

          {/* Quick Start */}
          <text fg={color("accent")}><b> Quick Start </b></text>
          <text>{""}</text>

          {/* Two-column keybinding overview */}
          <box flexDirection="row" gap={2}>
            <box flexDirection="column" width={28}>
              <text fg={color("warning")}><b> Navigation </b></text>
              <text fg={color("fg")}> 1-5    Switch tabs</text>
              <text fg={color("fg")}> j/k    Move up/down</text>
              <text fg={color("fg")}> Tab    Switch panel</text>
              <text fg={color("fg")}> Ctrl+b Toggle sidebar</text>
            </box>
            <box flexDirection="column" width={28}>
              <text fg={color("warning")}><b> Actions </b></text>
              <text fg={color("fg")}> Space  Stage/unstage</text>
              <text fg={color("fg")}> c      Commit</text>
              <text fg={color("fg")}> :      Command palette</text>
              <text fg={color("fg")}> ?      Help overlay</text>
            </box>
          </box>

          {/* Footer */}
          <text>{""}</text>
          <text fg={color("muted")}> Config: ~/.config/guit/config.toml</text>
          <text>{""}</text>
          <text fg={color("accent")}> Press any key to continue...</text>
        </box>
      </box>
    </Show>
  )
}
