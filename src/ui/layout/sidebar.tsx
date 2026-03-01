// src/ui/layout/sidebar.tsx
// Collapsible sidebar — renders context-specific content based on active tab

import { createEffect, For, Show } from "solid-js"
import { repo } from "../../state/repo.ts"
import {
  activeTab,
  activePanel,
  selectedIndex,
  setSelectedIndex,
  setSelectedFile,
  sidebarWidth,
  TAB_ID,
  PANEL,
} from "../../state/ui.ts"
import { FileTree } from "../components/file-tree.tsx"
import { BranchList } from "../components/branch-list.tsx"
import { CommitList } from "../components/commit-list.tsx"
import { PRCard } from "../components/pr-card.tsx"
import {
  branchSelectedIndex,
  setBranchSelectedIndex,
  branchFilter,
} from "../views/branches.tsx"
import {
  commitSelectedIndex,
  setCommitSelectedIndex,
} from "../views/commits.tsx"
import {
  stashSelectedIndex,
  setStashSelectedIndex,
} from "../views/stash.tsx"
import {
  prs,
  prSelectedIndex,
  setPRSelectedIndex,
} from "../../state/prs.ts"
import type { GitFile } from "../../core/git/types.ts"

// ── File list helpers ────────────────────────────────────────

function unstaged(): GitFile[] {
  return repo.status?.unstaged ?? []
}

function staged(): GitFile[] {
  return repo.status?.staged ?? []
}

function allFiles(): GitFile[] {
  return [...unstaged(), ...staged()]
}

// ── Component ────────────────────────────────────────────────

export function Sidebar() {
  // When the file list changes, clamp selectedIndex (Files tab)
  createEffect(() => {
    if (activeTab() !== TAB_ID.FILES) return
    const len = allFiles().length
    if (len === 0) {
      setSelectedIndex(0)
      setSelectedFile(null)
    } else if (selectedIndex() >= len) {
      setSelectedIndex(len - 1)
    }
  })

  // Keep selectedFile in sync with selectedIndex (Files tab)
  createEffect(() => {
    if (activeTab() !== TAB_ID.FILES) return
    const files = allFiles()
    const idx = selectedIndex()
    const file = files[idx]
    setSelectedFile(file?.path ?? null)
  })

  return (
    <box
      flexDirection="column"
      width={sidebarWidth()}
      height="100%"
      borderStyle="single"
      borderColor={activePanel() === PANEL.SIDEBAR ? "#89b4fa" : "#313244"}
    >
      <scrollbox flexGrow={1}>
        {/* Files tab — file tree */}
        <Show when={activeTab() === TAB_ID.FILES}>
          <FileTree
            files={unstaged()}
            title="UNSTAGED"
            selectedIndex={selectedIndex()}
            indexOffset={0}
            onSelect={(file, idx) => {
              setSelectedIndex(idx)
              setSelectedFile(file.path)
            }}
          />
          <FileTree
            files={staged()}
            title="STAGED"
            selectedIndex={selectedIndex()}
            indexOffset={unstaged().length}
            onSelect={(file, idx) => {
              setSelectedIndex(idx)
              setSelectedFile(file.path)
            }}
          />
          <Show when={allFiles().length === 0}>
            <text fg="#6c7086"> No changes</text>
          </Show>
        </Show>

        {/* Branches tab — branch list */}
        <Show when={activeTab() === TAB_ID.BRANCHES}>
          <BranchList
            branches={repo.branches}
            selectedIndex={branchSelectedIndex()}
            filter={branchFilter()}
            onSelect={(_, idx) => setBranchSelectedIndex(idx)}
          />
        </Show>

        {/* Commits tab — compact commit log for sidebar */}
        <Show when={activeTab() === TAB_ID.COMMITS}>
          <CommitList
            commits={repo.commits}
            selectedIndex={commitSelectedIndex()}
            onSelect={(_, idx) => setCommitSelectedIndex(idx)}
            compact={true}
          />
        </Show>

        {/* Stash tab — stash entries rendered inline in main panel */}
        <Show when={activeTab() === TAB_ID.STASH}>
          <text fg="#6c7086"> Stash entries shown in main panel</text>
        </Show>

        {/* PRs tab — PR list in sidebar */}
        <Show when={activeTab() === TAB_ID.PRS}>
          <Show
            when={prs.ghAvailable && prs.list.length > 0}
            fallback={
              <text fg="#6c7086">
                {prs.ghAvailable ? " No PRs" : " gh CLI not available"}
              </text>
            }
          >
            <For each={prs.list}>
              {(pr, i) => (
                <PRCard pr={pr} selected={prSelectedIndex() === i()} />
              )}
            </For>
          </Show>
        </Show>
      </scrollbox>
    </box>
  )
}
