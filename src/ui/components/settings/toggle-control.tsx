// src/ui/components/settings/toggle-control.tsx
// Toggle control — [✓]/[ ] for boolean config fields

import { color } from "../../../state/config.ts"

// ── Props ─────────────────────────────────────────────────────

interface ToggleControlProps {
  value: boolean
  focused: boolean
}

// ── Component ─────────────────────────────────────────────────

export function ToggleControl(props: ToggleControlProps) {
  return (
    <text fg={props.focused ? color("accent") : color("fg")}>
      {props.value ? "[✓]" : "[ ]"}
    </text>
  )
}
