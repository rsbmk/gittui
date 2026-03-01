// src/ui/components/settings/cycle-control.tsx
// Cycle control — ◂ value ▸ for enum-like config fields

import { color } from "../../../state/config.ts"

// ── Props ─────────────────────────────────────────────────────

interface CycleControlProps {
  value: string
  focused: boolean
}

// ── Component ─────────────────────────────────────────────────

export function CycleControl(props: CycleControlProps) {
  return (
    <box flexDirection="row">
      <text fg={props.focused ? color("accent") : color("muted")}>{"◂ "}</text>
      <text fg={props.focused ? color("accent") : color("fg")}>{props.value}</text>
      <text fg={props.focused ? color("accent") : color("muted")}>{" ▸"}</text>
    </box>
  )
}
