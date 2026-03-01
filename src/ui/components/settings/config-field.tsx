// src/ui/components/settings/config-field.tsx
// Config field row — label + control based on field type

import { Match, Switch } from "solid-js"
import { color } from "../../../state/config.ts"
import { FIELD_TYPE } from "../../views/settings-fields.ts"
import type { FieldDef } from "../../views/settings-fields.ts"
import { ToggleControl } from "./toggle-control.tsx"
import { CycleControl } from "./cycle-control.tsx"
import { StepperControl } from "./stepper-control.tsx"

// ── Props ─────────────────────────────────────────────────────

interface ConfigFieldProps {
  field: FieldDef
  value: unknown
  focused: boolean
}

// ── Component ─────────────────────────────────────────────────

export function ConfigField(props: ConfigFieldProps) {
  const displayValue = () => {
    if (props.field.formatValue) return props.field.formatValue(props.value)
    return String(props.value ?? "")
  }

  return (
    <box
      flexDirection="row"
      height={1}
      backgroundColor={props.focused ? color("selection") : undefined}
    >
      <box width={20}>
        <text fg={props.focused ? color("accent") : color("fg")}>
          {"  "}{props.field.label}
        </text>
      </box>
      <box flexGrow={1} justifyContent="flex-end">
        <Switch>
          <Match when={props.field.type === FIELD_TYPE.TOGGLE}>
            <ToggleControl
              value={props.value as boolean}
              focused={props.focused}
            />
          </Match>
          <Match when={props.field.type === FIELD_TYPE.CYCLE}>
            <CycleControl
              value={displayValue()}
              focused={props.focused}
            />
          </Match>
          <Match when={props.field.type === FIELD_TYPE.STEPPER}>
            <StepperControl
              value={props.value as number}
              focused={props.focused}
            />
          </Match>
          <Match when={props.field.type === FIELD_TYPE.READONLY}>
            <text fg={color("muted")}>{displayValue()}</text>
          </Match>
        </Switch>
      </box>
    </box>
  )
}
