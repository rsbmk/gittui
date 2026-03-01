// src/ui/views/settings.tsx
// Settings tab — interactive config editor with live preview

import { createSignal, For, onMount } from "solid-js"
import { config, updateConfigField, color } from "../../state/config.ts"
import { activePanel, PANEL } from "../../state/ui.ts"
import { getBuiltinThemeNames } from "../../lib/theme.ts"
import { detectInstalledAgents } from "../../core/ai/agents.ts"
import { getConfigPaths } from "../../core/config/loader.ts"
import { SETTINGS_SECTIONS, FIELD_TYPE } from "./settings-fields.ts"
import type { FieldDef } from "./settings-fields.ts"
import type { GuitConfig } from "../../core/config/schema.ts"
import { ConfigField } from "../components/settings/config-field.tsx"

// ── Settings State ───────────────────────────────────────────

const [sectionIndex, setSectionIndex] = createSignal(0)
const [fieldIndex, setFieldIndex] = createSignal(0)
const [installedAgents, setInstalledAgents] = createSignal<string[]>([])

export {
  sectionIndex,
  setSectionIndex,
  fieldIndex,
  setFieldIndex,
}

// ── Helpers ──────────────────────────────────────────────────

function currentSection() {
  return SETTINGS_SECTIONS[sectionIndex()]!
}

function currentFields(): FieldDef[] {
  const section = currentSection()
  return section.fields
}

function resolvedOptions(field: FieldDef): string[] {
  // Dynamic options for theme and AI agent
  if (field.section === "general" && field.key === "theme") {
    return getBuiltinThemeNames()
  }
  if (field.section === "ai" && field.key === "agent") {
    return ["none", ...installedAgents()]
  }
  return field.options ?? []
}

// ── Control Interaction ──────────────────────────────────────

export function settingsInteract(direction: "next" | "prev" | "toggle"): void {
  const fields = currentFields()
  const field = fields[fieldIndex()]
  if (!field) return

  const cfg = config()
  const currentValue = field.getValue(cfg)

  if (field.type === FIELD_TYPE.TOGGLE) {
    const newValue = !(currentValue as boolean)
    updateConfigField(
      field.section,
      field.key as keyof GuitConfig[typeof field.section],
      newValue as GuitConfig[typeof field.section][keyof GuitConfig[typeof field.section]],
    )
    return
  }

  if (field.type === FIELD_TYPE.CYCLE) {
    const options = resolvedOptions(field)
    if (options.length === 0) return

    const formatted = field.formatValue ? field.formatValue(currentValue) : String(currentValue ?? "")
    const currentIdx = options.indexOf(formatted)
    let nextIdx: number

    if (direction === "next" || direction === "toggle") {
      nextIdx = (currentIdx + 1) % options.length
    } else {
      nextIdx = (currentIdx - 1 + options.length) % options.length
    }

    let newValue: string | null = options[nextIdx]!
    // Handle "none" → null for ai.agent
    if (field.section === "ai" && field.key === "agent" && newValue === "none") {
      newValue = null
    }

    updateConfigField(
      field.section,
      field.key as keyof GuitConfig[typeof field.section],
      newValue as GuitConfig[typeof field.section][keyof GuitConfig[typeof field.section]],
    )
    return
  }

  if (field.type === FIELD_TYPE.STEPPER && field.range) {
    const current = currentValue as number
    const { min, max, step } = field.range
    let newValue: number

    if (direction === "next" || direction === "toggle") {
      newValue = Math.min(current + step, max)
    } else {
      newValue = Math.max(current - step, min)
    }

    updateConfigField(
      field.section,
      field.key as keyof GuitConfig[typeof field.section],
      newValue as GuitConfig[typeof field.section][keyof GuitConfig[typeof field.section]],
    )
  }
}

export function settingsMoveFieldDown(): void {
  const max = currentFields().length
  if (max > 0) {
    setFieldIndex((prev) => Math.min(prev + 1, max - 1))
  }
}

export function settingsMoveFieldUp(): void {
  setFieldIndex((prev) => Math.max(prev - 1, 0))
}

export function settingsMoveSectionDown(): void {
  const max = SETTINGS_SECTIONS.length
  setSectionIndex((prev) => {
    const next = Math.min(prev + 1, max - 1)
    setFieldIndex(0)
    return next
  })
}

export function settingsMoveSectionUp(): void {
  setSectionIndex((prev) => {
    const next = Math.max(prev - 1, 0)
    setFieldIndex(0)
    return next
  })
}

export function settingsOpenEditor(): void {
  const editor = process.env.EDITOR ?? "vi"
  const { configFile } = getConfigPaths()

  Bun.spawn([editor, configFile], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
}

// ── Component ────────────────────────────────────────────────

export function SettingsView() {
  onMount(async () => {
    const agents = await detectInstalledAgents()
    setInstalledAgents(agents.map((a) => a.id))
  })

  const isMainFocused = () => activePanel() === PANEL.MAIN

  return (
    <box flexDirection="row" flexGrow={1}>
      <box flexDirection="column" flexGrow={1} padding={1}>
        {/* Section header */}
        <box height={1} flexShrink={0}>
          <text fg={color("accent")}>
            <b>{currentSection().label}</b>
          </text>
        </box>
        <box height={1} flexShrink={0}>
          <text fg={color("border")}>{"─".repeat(40)}</text>
        </box>

        {/* Fields */}
        <box flexDirection="column" flexGrow={1}>
          <For each={currentFields()}>
            {(field, idx) => (
              <ConfigField
                field={field}
                value={field.getValue(config())}
                focused={isMainFocused() && idx() === fieldIndex()}
              />
            )}
          </For>
        </box>
      </box>
    </box>
  )
}
