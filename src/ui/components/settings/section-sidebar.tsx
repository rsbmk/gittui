// src/ui/components/settings/section-sidebar.tsx
// Section sidebar — navigable list of config sections

import { For } from "solid-js"
import { color } from "../../../state/config.ts"
import { SETTINGS_SECTIONS } from "../../views/settings-fields.ts"
import type { SectionDef } from "../../views/settings-fields.ts"
import { getConfigPaths } from "../../../core/config/loader.ts"

// ── Props ─────────────────────────────────────────────────────

interface SectionSidebarProps {
  selectedIndex: number
  focused: boolean
}

// ── Component ─────────────────────────────────────────────────

export function SectionSidebar(props: SectionSidebarProps) {
  const configPath = () => {
    const { configFile } = getConfigPaths()
    return configFile.replace(process.env.HOME ?? "", "~")
  }

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="column" flexGrow={1}>
        <For each={SETTINGS_SECTIONS}>
          {(section: SectionDef, idx) => (
            <box
              flexDirection="row"
              backgroundColor={idx() === props.selectedIndex && props.focused ? color("selection") : undefined}
            >
              <text
                fg={idx() === props.selectedIndex
                  ? (props.focused ? color("accent") : color("fg"))
                  : color("muted")}
              >
                {idx() === props.selectedIndex ? " ▸ " : "   "}
                {section.label}
              </text>
            </box>
          )}
        </For>
      </box>
      <box flexDirection="column" flexShrink={0}>
        <text fg={color("muted")}> {configPath()}</text>
        <box flexDirection="row">
          <text fg={color("muted")}> </text>
          <text fg={color("accent")}>[e]</text>
          <text fg={color("muted")}> open in editor</text>
        </box>
      </box>
    </box>
  )
}
