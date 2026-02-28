// src/ui/layout/main-panel.tsx
// Main content area — tab bar + view placeholder per active tab

import { For, Match, Switch } from "solid-js"
import { activeTab, TAB_ID, type TabId } from "../../state/ui.ts"

// ── Tab definitions ──────────────────────────────────────────

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: TAB_ID.FILES, label: "Files" },
  { id: TAB_ID.BRANCHES, label: "Branches" },
  { id: TAB_ID.COMMITS, label: "Commits" },
  { id: TAB_ID.STASH, label: "Stash" },
  { id: TAB_ID.PRS, label: "PRs" },
]

// ── Component ────────────────────────────────────────────────

export function MainPanel() {
  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Tab bar */}
      <box flexDirection="row" height={1} backgroundColor="#1e1e2e">
        <For each={TABS}>
          {(tab) => (
            <text fg={activeTab() === tab.id ? "#89b4fa" : "#6c7086"}>
              {activeTab() === tab.id ? ` [${tab.label}] ` : `  ${tab.label}  `}
            </text>
          )}
        </For>
      </box>

      {/* Content area */}
      <box flexGrow={1} borderStyle="single" borderColor="#313244">
        <Switch>
          <Match when={activeTab() === TAB_ID.FILES}>
            <text fg="#6c7086"> Files view — diff will render here</text>
          </Match>
          <Match when={activeTab() === TAB_ID.BRANCHES}>
            <text fg="#6c7086"> Branches view — list will render here</text>
          </Match>
          <Match when={activeTab() === TAB_ID.COMMITS}>
            <text fg="#6c7086"> Commits view — log will render here</text>
          </Match>
          <Match when={activeTab() === TAB_ID.STASH}>
            <text fg="#6c7086"> Stash view — entries will render here</text>
          </Match>
          <Match when={activeTab() === TAB_ID.PRS}>
            <text fg="#6c7086"> PRs view — pull requests will render here</text>
          </Match>
        </Switch>
      </box>
    </box>
  )
}
