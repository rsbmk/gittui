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
import { ScrollList } from "../components/scroll-list.tsx"
import {
  branchSelectedIndex,
  setBranchSelectedIndex,
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
import { FILE_STATUS } from "../../core/git/types.ts"
import type { GitFile } from "../../core/git/types.ts"
import { SectionSidebar } from "../components/settings/section-sidebar.tsx"
import { sectionIndex } from "../views/settings.tsx"

// ── File list helpers ────────────────────────────────────────

function conflicts(): GitFile[] {
  return repo.status?.unstaged.filter((f) => f.status === FILE_STATUS.UNMERGED) ?? []
}

function unstaged(): GitFile[] {
  const modified = (repo.status?.unstaged ?? []).filter((f) => f.status !== FILE_STATUS.UNMERGED)
  const untracked = repo.status?.untracked ?? []
  return [...modified, ...untracked]
}

function staged(): GitFile[] {
  return repo.status?.staged ?? []
}

function allFiles(): GitFile[] {
  return [...conflicts(), ...unstaged(), ...staged()]
}

// ── Scroll follow ────────────────────────────────────────────

function selectedRow(): number {
  const tab = activeTab()
  switch (tab) {
    case TAB_ID.FILES: {
      const idx = selectedIndex()
      const conflictsLen = conflicts().length
      const unstagedLen = unstaged().length
      const stagedLen = staged().length
      // Item in CONFLICTS section: header row + offset
      if (conflictsLen > 0 && idx < conflictsLen) {
        return 1 + idx
      }
      // Item in UNSTAGED section
      const rowsAboveUnstaged = conflictsLen > 0 ? 1 + conflictsLen : 0
      if (unstagedLen > 0 && idx < conflictsLen + unstagedLen) {
        return rowsAboveUnstaged + 1 + (idx - conflictsLen)
      }
      // Item in STAGED section
      const rowsAboveStaged = rowsAboveUnstaged + (unstagedLen > 0 ? 1 + unstagedLen : 0)
      if (stagedLen > 0) {
        return rowsAboveStaged + 1 + (idx - conflictsLen - unstagedLen)
      }
      return 0
    }
    case TAB_ID.BRANCHES: {
      const idx = branchSelectedIndex()
      const localCount = repo.branches.filter((b) => !b.remote).length
      // LOCAL header + local items, then REMOTES header offset
      if (localCount > 0 && idx < localCount) {
        return 1 + idx // LOCAL header row + offset
      }
      const rowsAboveRemotes = localCount > 0 ? 1 + localCount : 0
      return rowsAboveRemotes + 1 + (idx - localCount) // REMOTES header row + offset
    }
    case TAB_ID.COMMITS:
      return 1 + commitSelectedIndex()
    case TAB_ID.PRS:
      return prSelectedIndex() * 2 // Each PR card = 2 rows
    case TAB_ID.SETTINGS:
      return sectionIndex()
    default:
      return 0
  }
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
      <ScrollList selectedRow={selectedRow()} flexGrow={1}>
        {/* Files tab — file tree */}
        <Show when={activeTab() === TAB_ID.FILES}>
          <FileTree
            files={conflicts()}
            title="CONFLICTS"
            selectedIndex={selectedIndex()}
            indexOffset={0}
            onSelect={(file, idx) => {
              setSelectedIndex(idx)
              setSelectedFile(file.path)
            }}
          />
          <FileTree
            files={unstaged()}
            title="UNSTAGED"
            selectedIndex={selectedIndex()}
            indexOffset={conflicts().length}
            onSelect={(file, idx) => {
              setSelectedIndex(idx)
              setSelectedFile(file.path)
            }}
          />
          <FileTree
            files={staged()}
            title="STAGED"
            selectedIndex={selectedIndex()}
            indexOffset={conflicts().length + unstaged().length}
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

        {/* Settings tab — section navigation */}
        <Show when={activeTab() === TAB_ID.SETTINGS}>
          <SectionSidebar
            selectedIndex={sectionIndex()}
            focused={activePanel() === PANEL.SIDEBAR}
          />
        </Show>
      </ScrollList>
    </box>
  )
}
