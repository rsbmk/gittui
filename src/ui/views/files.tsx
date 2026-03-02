// src/ui/views/files.tsx
// Files tab view — orchestrates file selection + diff display + hunk navigation

import { createEffect, createSignal, Show } from "solid-js"
import { DiffView } from "./diff.tsx"
import { ConflictView, loadConflictFile, clearConflictFile, conflictFile } from "./conflict-view.tsx"
import { repo, setRepo, refreshDiff, refreshStatus, refreshMergeState } from "../../state/repo.ts"
import { selectedFile } from "../../state/ui.ts"
import { config, updateConfigField } from "../../state/config.ts"
import { stageHunk, getUntrackedDiff, getConflictDiff } from "../../core/git/commands.ts"
import { buildHunkPatch } from "../../core/git/hunk-patch.ts"
import { FILE_STATUS } from "../../core/git/types.ts"
import type { FileDiff } from "../../core/git/types.ts"
import type { DiffView as DiffViewType } from "../../core/config/schema.ts"

// ── State ────────────────────────────────────────────────────

const [currentDiff, setCurrentDiff] = createSignal<FileDiff | null>(null)
const [currentHunkIndex, setCurrentHunkIndex] = createSignal(0)

// ── Helpers ──────────────────────────────────────────────────

export function isSelectedFileStaged(): boolean {
  const path = selectedFile()
  if (!path) return false
  return repo.status?.staged.some((f) => f.path === path) ?? false
}

function isSelectedFileUntracked(): boolean {
  const path = selectedFile()
  if (!path) return false
  return repo.status?.untracked.some((f) => f.path === path) ?? false
}

export function isSelectedFileUnmerged(): boolean {
  const path = selectedFile()
  if (!path) return false
  return repo.status?.unstaged.some(
    (f) => f.path === path && f.status === FILE_STATUS.UNMERGED,
  ) ?? false
}

// ── Diff loading on file selection ───────────────────────────

createEffect(async () => {
  const path = selectedFile()
  // Track config diff fields so effect re-runs when they change
  const _cl = config().diff.context_lines

  if (!path) {
    setCurrentDiff(null)
    setCurrentHunkIndex(0)
    return
  }

  const staged = isSelectedFileStaged()
  const untracked = isSelectedFileUntracked()
  const unmerged = isSelectedFileUnmerged()

  try {
    if (untracked) {
      clearConflictFile()
      // Untracked files have no index entry — git diff produces empty output
      // Use --no-index to show entire file content as additions
      const diffs = await getUntrackedDiff(path, {
        contextLines: config().diff.context_lines,
      })
      setRepo("diff", diffs)
    } else if (unmerged) {
      // Load interactive conflict view for unmerged files
      await loadConflictFile(path)
      // Also load the conflict diff for the regular diff panel
      const diffs = await getConflictDiff(path)
      setRepo("diff", diffs)
    } else {
      clearConflictFile()
      await refreshDiff(path, staged)
    }
    const fileDiff = repo.diff.find((d) => d.path === path) ?? null
    setCurrentDiff(fileDiff)
    setCurrentHunkIndex(0)
  } catch {
    setCurrentDiff(null)
  }
})

// ── Hunk navigation ──────────────────────────────────────────

export function nextHunk(): void {
  const diff = currentDiff()
  if (!diff) return
  const maxIdx = diff.hunks.length - 1
  setCurrentHunkIndex((prev) => Math.min(prev + 1, maxIdx))
}

export function prevHunk(): void {
  setCurrentHunkIndex((prev) => Math.max(prev - 1, 0))
}

// ── Hunk staging ─────────────────────────────────────────────

export async function stageCurrentHunk(): Promise<void> {
  const diff = currentDiff()
  if (!diff || diff.hunks.length === 0) return

  const hunkIdx = currentHunkIndex()
  try {
    const patch = buildHunkPatch(diff, hunkIdx)
    await stageHunk(patch)
    await refreshStatus()

    // Reload diff for the same file to see remaining hunks
    const path = selectedFile()
    if (path) {
      await refreshDiff(path, false)
      const updatedDiff = repo.diff.find((d) => d.path === path) ?? null
      setCurrentDiff(updatedDiff)

      // Clamp hunk index if hunks were removed
      if (updatedDiff && currentHunkIndex() >= updatedDiff.hunks.length) {
        setCurrentHunkIndex(Math.max(0, updatedDiff.hunks.length - 1))
      }
    }
  } catch {
    // TODO: show error
  }
}

// ── Exports ──────────────────────────────────────────────────

export function toggleDiffMode(): void {
  const current = config().diff.view
  const next: DiffViewType = current === "unified" ? "split" : "unified"
  updateConfigField("diff", "view", next)
}

export { currentDiff, currentHunkIndex }

// ── Component ────────────────────────────────────────────────

export function FilesView() {
  const showConflictView = () => isSelectedFileUnmerged() && conflictFile() !== null

  return (
    <Show
      when={showConflictView()}
      fallback={<DiffView fileDiff={currentDiff()} />}
    >
      <ConflictView path={selectedFile()!} />
    </Show>
  )
}
