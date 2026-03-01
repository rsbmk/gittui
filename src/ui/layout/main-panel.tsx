// src/ui/layout/main-panel.tsx
// Main content area — tab bar + active view

import { For, Match, Switch } from "solid-js"
import { activeTab, activePanel, TAB_ID, PANEL, type TabId } from "../../state/ui.ts"
import { FilesView } from "../views/files.tsx"
import { BranchesView } from "../views/branches.tsx"
import { CommitsView } from "../views/commits.tsx"
import { StashView } from "../views/stash.tsx"
import { PullRequestsView } from "../views/pull-requests.tsx"
import { ViewBoundary } from "../components/error-boundary.tsx"

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
      <box flexGrow={1} borderStyle="single" borderColor={activePanel() === PANEL.MAIN ? "#89b4fa" : "#313244"}>
        <Switch>
          <Match when={activeTab() === TAB_ID.FILES}>
            <ViewBoundary name="Files">
              <FilesView />
            </ViewBoundary>
          </Match>
          <Match when={activeTab() === TAB_ID.BRANCHES}>
            <ViewBoundary name="Branches">
              <BranchesView />
            </ViewBoundary>
          </Match>
          <Match when={activeTab() === TAB_ID.COMMITS}>
            <ViewBoundary name="Commits">
              <CommitsView />
            </ViewBoundary>
          </Match>
          <Match when={activeTab() === TAB_ID.STASH}>
            <ViewBoundary name="Stash">
              <StashView />
            </ViewBoundary>
          </Match>
          <Match when={activeTab() === TAB_ID.PRS}>
            <ViewBoundary name="PRs">
              <PullRequestsView />
            </ViewBoundary>
          </Match>
        </Switch>
      </box>
    </box>
  )
}
