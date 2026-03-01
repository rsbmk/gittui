// src/ui/components/settings/stepper-control.tsx
// Stepper control — ◂ N ▸ for numeric config fields with range

import { color } from "../../../state/config.ts"

// ── Props ─────────────────────────────────────────────────────

interface StepperControlProps {
  value: number
  focused: boolean
}

// ── Component ─────────────────────────────────────────────────

export function StepperControl(props: StepperControlProps) {
  return (
    <box flexDirection="row">
      <text fg={props.focused ? color("accent") : color("muted")}>{"◂ "}</text>
      <text fg={props.focused ? color("accent") : color("fg")}>{String(props.value)}</text>
      <text fg={props.focused ? color("accent") : color("muted")}>{" ▸"}</text>
    </box>
  )
}
