// src/ui/components/agent-select-modal.tsx
// Agent selection dialog — shown on first AI commit when no agent is configured

import { createSignal, For } from "solid-js"
import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/solid"
import type { PromptContext } from "@opentui-ui/dialog/solid"
import { dialogConfig, DIALOG_CONTENT_WIDTH } from "./dialog-styles.ts"
import { color } from "../../state/config.ts"
import { withDialog } from "../../state/ui.ts"
import type { AgentDefinition } from "../../core/ai/types.ts"

// ── Agent Select Content ─────────────────────────────────────

interface AgentSelectProps extends PromptContext<string> {
  agents: AgentDefinition[]
}

function AgentSelectContent(props: AgentSelectProps) {
  const [selectedIdx, setSelectedIdx] = createSignal(0)

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      props.dismiss()
      return
    }

    if (key.name === "return") {
      const agent = props.agents[selectedIdx()]
      if (agent) props.resolve(agent.id)
      return
    }

    if (key.name === "j" || key.name === "down") {
      setSelectedIdx((i) => Math.min(i + 1, props.agents.length - 1))
      return
    }

    if (key.name === "k" || key.name === "up") {
      setSelectedIdx((i) => Math.max(i - 1, 0))
      return
    }
  }, props.dialogId)

  return (
    <box flexDirection="column" gap={1} width={DIALOG_CONTENT_WIDTH}>
      <text fg={color("accent")}>
        <b>Select AI Agent</b>
      </text>
      <text fg={color("muted")}>Choose which agent to use for commit messages:</text>
      <box flexDirection="column">
        <For each={props.agents}>
          {(agent, idx) => (
            <text fg={idx() === selectedIdx() ? color("accent") : color("fg")}>
              {idx() === selectedIdx() ? " > " : "   "}
              {agent.name} ({agent.binary})
            </text>
          )}
        </For>
      </box>
      <box flexDirection="row" gap={2}>
        <box flexDirection="row">
          <text fg={color("accent")}>[Enter]</text>
          <text fg={color("muted")}> select</text>
        </box>
        <box flexDirection="row">
          <text fg={color("accent")}>[Esc]</text>
          <text fg={color("muted")}> cancel</text>
        </box>
      </box>
    </box>
  )
}

// ── Hook to open agent selection dialog ──────────────────────

export function useAgentSelectDialog() {
  const dialog = useDialog()

  async function openAgentSelectDialog(agents: AgentDefinition[]): Promise<string | undefined> {
    return withDialog(() => dialog.prompt<string>({
      content: (ctx) => () => (
        <AgentSelectContent
          resolve={ctx.resolve}
          dismiss={ctx.dismiss}
          dialogId={ctx.dialogId}
          agents={agents}
        />
      ),
      ...dialogConfig(),
    }))
  }

  return { openAgentSelectDialog }
}
